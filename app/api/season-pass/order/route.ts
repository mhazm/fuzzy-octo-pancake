import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongoose";
import SeasonPass from "@/lib/models/SeasonPass";
import SeasonPassOrder from "@/lib/models/SeasonPassOrder";
import UserSeasonProgress from "@/lib/models/UserSeasonProgress";
import User from "@/lib/models/User";
import {
  getUserSeasonProgress,
  calculateLevelFromXp,
  getSeasonPassFeatureStatus,
} from "@/lib/seasonPass";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const season = await SeasonPass.findOne({ status: "ACTIVE" }).lean();
    if (!season) {
      return NextResponse.json({ error: "Tidak ada musim aktif" }, { status: 404 });
    }

    const pendingOrders = await SeasonPassOrder.find({
      discordId: String(session.user.discordId),
      seasonNumber: season.seasonNumber,
      status: "pending",
    })
      .sort({ createdAt: -1 })
      .lean();

    const pendingOrder = pendingOrders[0] || null;

    return NextResponse.json({
      success: true,
      pendingOrder: pendingOrder ? JSON.parse(JSON.stringify(pendingOrder)) : null,
      pendingOrders: JSON.parse(JSON.stringify(pendingOrders)),
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
      return NextResponse.json({ error: "Unauthorized: Silakan login terlebih dahulu" }, { status: 401 });
    }

    await dbConnect();

    const featureStatus = await getSeasonPassFeatureStatus();
    if (!featureStatus.isEnabled) {
      return NextResponse.json(
        { error: featureStatus.disabledReason || "Fitur Season Pass sedang dinonaktifkan sementara." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));

    // Validasi & cast input
    const seasonNumber = Math.floor(Number(body.seasonNumber ?? 1));
    if (!Number.isFinite(seasonNumber) || seasonNumber < 1 || seasonNumber > 10) {
      return NextResponse.json({ error: "seasonNumber tidak valid" }, { status: 400 });
    }

    const orderType = body.orderType === "LEVEL_SKIP" ? "LEVEL_SKIP" : "PREMIUM_PASS";
    const rawLevelCount = Math.floor(Number(body.levelCount ?? 1));
    const levelCount = Number.isFinite(rawLevelCount) && rawLevelCount > 0 ? rawLevelCount : 1;

    const season = await SeasonPass.findOne({ seasonNumber });
    if (!season) {
      return NextResponse.json({ error: "Musim tidak ditemukan" }, { status: 404 });
    }

    const user = await User.findOne({ discordId: String(session.user.discordId) });
    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    let progress = await getUserSeasonProgress(session.user.discordId, seasonNumber);
    if (!progress) {
      return NextResponse.json({ error: "Gagal memuat progress driver" }, { status: 500 });
    }

    const isLevelSkip = orderType === "LEVEL_SKIP";

    if (!isLevelSkip && progress.isPremium) {
      return NextResponse.json(
        { error: "Anda sudah memiliki Nismara Pass Premium musim ini!" },
        { status: 400 }
      );
    }

    const currentLvl = calculateLevelFromXp(progress.currentXp, season.levels);

    if (isLevelSkip && currentLvl >= 30) {
      return NextResponse.json(
        { error: "Level Season Pass Anda sudah mencapai batas maksimal (Level 30)!" },
        { status: 400 }
      );
    }

    const validLevelCount = isLevelSkip
      ? Math.max(1, Math.min(30 - currentLvl, Math.floor(Number(levelCount))))
      : 0;
    const startLevel = currentLvl;
    const targetLevel = isLevelSkip ? Math.min(30, currentLvl + validLevelCount) : 1;

    // Cek apakah sudah ada pesanan pending untuk tipe yang sama
    const existingOrder = await SeasonPassOrder.findOne({
      discordId: String(session.user.discordId),
      seasonNumber,
      orderType,
      status: "pending",
    });

    if (existingOrder) {
      return NextResponse.json({
        success: true,
        order: existingOrder,
        message: isLevelSkip
          ? "Anda masih memiliki pesanan Level Skip yang sedang menunggu konfirmasi Owner / Developer."
          : "Anda masih memiliki pesanan Nismara Pass yang sedang menunggu konfirmasi Owner / Developer.",
      });
    }

    const amountIDR = isLevelSkip
      ? validLevelCount * (season.levelPriceIdr || 2000)
      : (season.premiumPriceIdr || 35000);

    const formattedPrice = `Rp ${amountIDR.toLocaleString("id-ID")},-`;
    const discordId = String(session.user.discordId);
    const username = session.user.name || "driver";
    const guildId = process.env.DISCORD_GUILD_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const categoryId = process.env.DISCORD_PLUS_CATEGORY_ID;
    const owner1 = process.env.OWNER_DISCORD_ID || "338418945620967434";
    const owner2 = process.env.NISMARA_OWNER_DISCORD_ID || "560419724249530369";

    let createdChannelId: string | undefined = undefined;

    // Discord Integration: Buat Channel Tiket jika konfigurasi Discord ada
    if (botToken && guildId) {
      try {
        const allowPermissions = (1024 + 2048 + 65536).toString();
        const denyPermissions = (1024).toString();

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

        const channelPrefix = isLevelSkip ? "⚡lvlskip" : "🏆pass";
        const channelTopic = isLevelSkip
          ? `Channel Pembelian Level Skip (+${validLevelCount} Level: Lvl ${startLevel} ➔ Lvl ${targetLevel}) S${seasonNumber} (${formattedPrice}) | Driver: ${discordId}`
          : `Channel Pembelian Nismara Pass Season ${seasonNumber} (${formattedPrice}) | Driver: ${discordId}`;

        const channelRes = await fetch(
          `https://discord.com/api/v10/guilds/${guildId}/channels`,
          {
            method: "POST",
            headers: {
              Authorization: `Bot ${botToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: `${channelPrefix}-s${seasonNumber}-${username.toLowerCase().replace(/\s+/g, "-")}`,
              type: 0,
              parent_id: categoryId || null,
              topic: channelTopic,
              permission_overwrites: permissionOverwrites,
            }),
          }
        );

        if (channelRes.ok) {
          const channelData = await channelRes.json();
          createdChannelId = channelData.id;

          const embedTitle = isLevelSkip
            ? `⚡ Permintaan Beli Level Season Pass Season ${seasonNumber}`
            : `✨ Permintaan Pembelian Nismara Pass Season ${seasonNumber}`;

          const embedDesc = isLevelSkip
            ? `Halo **${username}**, terima kasih telah memilih layanan Level Skip Nismara Pass!\n\nSilakan lakukan pembayaran sesuai rincian di bawah:`
            : `Halo **${username}**, terima kasih telah memilih untuk mendukung operasional Nismara Transport!\n\nSilakan lakukan pembayaran sesuai dengan rincian paket yang Anda pilih di bawah ini:`;

          const packageField = isLevelSkip
            ? {
                name: "📦 Paket yang Dipilih",
                value: `**Level Skip (+${validLevelCount} Level)**\n*(Progres: Level ${startLevel} ➔ Level ${targetLevel})*`,
                inline: true,
              }
            : {
                name: "📦 Paket yang Dipilih",
                value: `**Nismara Pass Premium Season ${seasonNumber}** (90 Hari)`,
                inline: true,
              };

          const priceField = isLevelSkip
            ? {
                name: "💵 Total Tagihan",
                value: `**${formattedPrice}**\n*(${validLevelCount} Level × Rp ${(season.levelPriceIdr || 2000).toLocaleString("id-ID")})*`,
                inline: true,
              }
            : {
                name: "💵 Total Tagihan",
                value: `**${formattedPrice}**\n*(Akses Penuh 30 Level Premium)*`,
                inline: true,
              };

          // Kirim Embed Invoice ke channel
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
                    title: embedTitle,
                    description: embedDesc,
                    color: isLevelSkip ? 16753920 : 16098851, // Orange vs Amber Gold
                    fields: [
                      packageField,
                      priceField,
                      {
                        name: "🏦 Metode Pembayaran",
                        value: "",
                        inline: false,
                      },
                    ],
                    image: {
                      url: "https://images.nismara.my.id/Nismara_QR.jpg",
                    },
                    footer: {
                      text: isLevelSkip
                        ? "Silahkan lakukan pembayaran dengan QR diatas. Kirimkan bukti transfer valid ke channel ini lalu tunggu konfirmasi Owner / Developer."
                        : "Silahkan lakukan pembayaran dengan QR diatas. Apabila sudah melakukan pembayaran kamu dapat mengirimkan foto/screenshot bukti transfer yang valid lalu silahkan tunggu sampai Nismara Pass anda diaktifkan.",
                    },
                    timestamp: new Date().toISOString(),
                  },
                ],
              }),
            }
          ).catch((e) => console.error("Discord message embed error:", e));
        }
      } catch (discordErr) {
        console.error("Discord channel create error:", discordErr);
      }
    }

    const newOrder = await SeasonPassOrder.create({
      discordId,
      userId: user._id,
      seasonNumber,
      orderType,
      levelCount: isLevelSkip ? validLevelCount : 0,
      startLevel: isLevelSkip ? startLevel : 1,
      targetLevel: isLevelSkip ? targetLevel : 1,
      amountIDR,
      channelId: createdChannelId,
      status: "pending",
    });

    // Revalidasi cache
    try {
      revalidatePath("/dashboard/season-pass");
    } catch (e) {
      console.error("Failed to revalidate season pass paths:", e);
    }

    return NextResponse.json({
      success: true,
      order: newOrder,
      message: isLevelSkip
        ? `Pesanan Level Skip (+${validLevelCount} Level) berhasil dibuat! Silakan selesaikan pembayaran dan tunggu konfirmasi Owner / Developer.`
        : "Pesanan Nismara Pass berhasil dibuat! Silakan selesaikan pembayaran dan tunggu konfirmasi dari Owner / Developer.",
      channelId: createdChannelId,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      }
    });
  } catch (error: any) {
    console.error("Season Pass Order Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal membuat pesanan Nismara Pass" },
      { status: 500 }
    );
  }
}
