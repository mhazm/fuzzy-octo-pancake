import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongoose";
import SeasonPass from "@/lib/models/SeasonPass";
import SeasonPassMerchClaim from "@/lib/models/SeasonPassMerchClaim";
import UserSeasonProgress from "@/lib/models/UserSeasonProgress";
import User from "@/lib/models/User";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const seasonNumber = Number(searchParams.get("seasonNumber") || 1);

    const claim = await SeasonPassMerchClaim.findOne({
      discordId: String(session.user.discordId),
      seasonNumber,
    }).lean();

    return NextResponse.json({
      success: true,
      merchClaim: claim ? JSON.parse(JSON.stringify(claim)) : null,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json(
        { error: "Unauthorized: Silakan login terlebih dahulu" },
        { status: 401 },
      );
    }

    await dbConnect();
    const body = await request.json().catch(() => ({}));
    const {
      seasonNumber = 1,
      recipientName,
      recipientPhone,
      recipientAddress,
      shippingNotes = "",
    } = body;

    // 1. Validasi Input Form
    if (!recipientName || recipientName.trim().length < 2) {
      return NextResponse.json(
        { error: "Nama lengkap penerima wajib diisi (minimal 2 karakter)" },
        { status: 400 },
      );
    }
    if (!recipientPhone || recipientPhone.trim().length < 8) {
      return NextResponse.json(
        {
          error:
            "Nomor WhatsApp penerima wajib diisi dengan benar (minimal 8 digit)",
        },
        { status: 400 },
      );
    }
    if (!recipientAddress || recipientAddress.trim().length < 10) {
      return NextResponse.json(
        {
          error:
            "Alamat lengkap pengiriman wajib diisi (sertakan Kota/Kabupaten, Provinsi & Kode Pos)",
        },
        { status: 400 },
      );
    }

    // 2. Validasi Musim dan Driver
    const season = await SeasonPass.findOne({
      seasonNumber: Number(seasonNumber),
    });
    if (!season) {
      return NextResponse.json(
        { error: "Musim tidak ditemukan" },
        { status: 404 },
      );
    }

    const discordId = String(session.user.discordId);
    const user = await User.findOne({ discordId });
    if (!user) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 },
      );
    }

    const progress = await UserSeasonProgress.findOne({
      discordId,
      seasonNumber: Number(seasonNumber),
    });

    if (!progress || progress.currentLevel < 30) {
      return NextResponse.json(
        {
          error: `Anda belum mencapai Level 30 untuk mengklaim Grand Prize! (Level Anda: ${progress?.currentLevel ?? 0})`,
        },
        { status: 403 },
      );
    }

    if (!progress.isPremium) {
      return NextResponse.json(
        {
          error:
            "Grand Prize Level 30 hanya dapat diklaim oleh pemilik Nismara Pass Premium!",
        },
        { status: 403 },
      );
    }

    // 3. Cek apakah sudah pernah klaim
    const existingClaim = await SeasonPassMerchClaim.findOne({
      discordId,
      seasonNumber: Number(seasonNumber),
    });

    if (existingClaim) {
      return NextResponse.json({
        success: true,
        merchClaim: existingClaim,
        message:
          "Anda sudah pernah mengirimkan data klaim merchandise untuk musim ini.",
      });
    }

    // 4. Integrasi Discord Channel
    const username = session.user.name || "driver";
    const guildId = process.env.DISCORD_GUILD_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const categoryId = process.env.DISCORD_PLUS_CATEGORY_ID;
    const owner1 = process.env.OWNER_DISCORD_ID || "338418945620967434";
    const owner2 = process.env.NISMARA_OWNER_DISCORD_ID || "560419724249530369";

    let createdChannelId: string | undefined = undefined;

    if (botToken && guildId) {
      try {
        const allowPermissions = (1024 + 2048 + 65536).toString(); // ViewChannel + SendMessages + ReadMessageHistory
        const denyPermissions = (1024).toString(); // ViewChannel Deny

        const permissionOverwrites = [
          { id: guildId, type: 0, allow: "0", deny: denyPermissions },
          { id: discordId, type: 1, allow: allowPermissions, deny: "0" },
        ];

        if (owner1) {
          permissionOverwrites.push({
            id: owner1,
            type: 1,
            allow: allowPermissions,
            deny: "0",
          });
        }

        if (owner2 && owner2 !== owner1) {
          permissionOverwrites.push({
            id: owner2,
            type: 1,
            allow: allowPermissions,
            deny: "0",
          });
        }

        const safeChannelSlug = username
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-")
          .slice(0, 20);

        const channelRes = await fetch(
          `https://discord.com/api/v10/guilds/${guildId}/channels`,
          {
            method: "POST",
            headers: {
              Authorization: `Bot ${botToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: `🎁merch-s${seasonNumber}-${safeChannelSlug}`,
              type: 0,
              parent_id: categoryId || null,
              topic: `Klaim Merchandise Nismara Pass Season ${seasonNumber} | Driver: ${username} (${discordId})`,
              permission_overwrites: permissionOverwrites,
            }),
          },
        );

        if (channelRes.ok) {
          const channelData = await channelRes.json();
          createdChannelId = channelData.id;

          // Kirim Rich Embed ke Channel Discord
          const grandPrizeName =
            season.grandPrize?.title || `Hadiah Puncak Season ${seasonNumber}`;
          await fetch(
            `https://discord.com/api/v10/channels/${createdChannelId}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bot ${botToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                content: `<@${discordId}> | <@${owner1}> <@${owner2}>`,
                embeds: [
                  {
                    title: `📦 Pengajuan Klaim Merchandise Fisik - Nismara Pass S${seasonNumber}`,
                    description: `Halo **${username}**, selamat atas pencapaian Anda menyelesaikan seluruh 30 Level Nismara Pass Season ${seasonNumber}!\n\nData formulir pengiriman hadiah fisik Anda telah tersimpan secara resmi di sistem:`,
                    color: 9646826, // Purple
                    fields: [
                      {
                        name: "🏆 Hadiah Merchandise",
                        value: `**${grandPrizeName}**`,
                        inline: false,
                      },
                      {
                        name: "👤 Nama Penerima",
                        value: recipientName.trim(),
                        inline: true,
                      },
                      {
                        name: "📱 No. WhatsApp",
                        value: recipientPhone.trim(),
                        inline: true,
                      },
                      {
                        name: "📍 Alamat Lengkap Pengiriman",
                        value: recipientAddress.trim(),
                        inline: false,
                      },
                      {
                        name: "📝 Catatan Tambahan Driver",
                        value: shippingNotes?.trim() || "-",
                        inline: false,
                      },
                      {
                        name: "🚚 Konfirmasi Ongkir & Resi",
                        value:
                          "Silakan diskusikan konfirmasi pembayaran ongkos kirim dan nomor resi ekspedisi melalui channel ini bersama Owner / Developer.",
                        inline: false,
                      },
                    ],
                    footer: {
                      text: `Nismara Transport Portal • Discord ID: ${discordId}`,
                    },
                    timestamp: new Date().toISOString(),
                  },
                ],
              }),
            },
          ).catch((e) => console.error("Discord message embed error:", e));
        }
      } catch (discordErr) {
        console.error("Discord channel create error:", discordErr);
      }
    }

    // 5. Simpan ke database
    const newClaim = await SeasonPassMerchClaim.create({
      discordId,
      userId: user._id,
      userName: username,
      seasonNumber: Number(seasonNumber),
      prizeTitle:
        season.grandPrize?.title || `Hadiah Puncak Season ${seasonNumber}`,
      recipientName: recipientName.trim(),
      recipientPhone: recipientPhone.trim(),
      recipientAddress: recipientAddress.trim(),
      shippingNotes: shippingNotes?.trim() || "",
      channelId: createdChannelId,
      status: "pending",
    });

    // Update progress user
    progress.merchClaim = {
      claimedAt: new Date(),
      recipientName: recipientName.trim(),
      recipientPhone: recipientPhone.trim(),
      recipientAddress: recipientAddress.trim(),
      shippingNotes: shippingNotes?.trim() || "",
      channelId: createdChannelId,
      status: "pending",
    };
    await progress.save();

    // Revalidasi cache
    try {
      revalidatePath("/dashboard/season-pass");
    } catch (e) {
      console.error("Failed to revalidate season pass paths:", e);
    }

    return NextResponse.json({
      success: true,
      merchClaim: newClaim,
      message:
        "Data pengiriman merchandise Anda berhasil dikirim! Channel tiket privat Discord telah dibuat untuk konfirmasi ongkir & resi bersama Owner & Developer.",
      channelId: createdChannelId,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      }
    });
  } catch (error: any) {
    console.error("Claim Merch Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memproses klaim merchandise" },
      { status: 500 },
    );
  }
}
