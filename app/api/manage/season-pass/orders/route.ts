import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongoose";
import SeasonPassOrder from "@/lib/models/SeasonPassOrder";
import UserSeasonProgress from "@/lib/models/UserSeasonProgress";
import Transaction from "@/lib/models/Transaction";
import User from "@/lib/models/User";
import { getUserSeasonProgress, applySeasonLevelSkip } from "@/lib/seasonPass";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function checkIsOwner(discordId?: string | number | null) {
  if (!discordId) return false;
  const dId = String(discordId);
  const owner1 = process.env.OWNER_DISCORD_ID;
  const owner2 = process.env.NISMARA_OWNER_DISCORD_ID;
  return (owner1 && dId === owner1) || (owner2 && dId === owner2);
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const isOwner = checkIsOwner(session?.user?.discordId);

    if (!session?.user?.discordId || !isOwner) {
      return NextResponse.json(
        { error: "Unauthorized: Pembayaran Nismara Pass hanya dapat dikonfirmasi oleh Owner / Developer." },
        { status: 403 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    const orders = await SeasonPassOrder.find(status === "all" ? {} : { status })
      .populate("userId", "name image discordId")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      orders: JSON.parse(JSON.stringify(orders)),
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      }
    });
  } catch (error: any) {
    console.error("Manage Season Pass Orders GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const isOwner = checkIsOwner(session?.user?.discordId);

    if (!session?.user?.discordId || !isOwner) {
      return NextResponse.json(
        { error: "Unauthorized: Pembayaran Nismara Pass hanya dapat disetujui / diproses oleh Owner atau Developer langsung." },
        { status: 403 }
      );
    }

    await dbConnect();
    const body = await request.json();
    const { orderId, action } = body; // action: "APPROVE" | "REJECT"

    if (!orderId || !action) {
      return NextResponse.json({ error: "orderId dan action wajib diisi" }, { status: 400 });
    }

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });
    }

    const targetStatus = action === "APPROVE" ? "success" : "rejected";
    const processedBy = String(session.user.discordId);

    // 🛡️ ATOMIC STATE LOCK: Kunci status dari "pending" ke targetStatus secara atomik
    // Mencegah double confirmation atau duplikasi pembuatan transaksi
    const order = await SeasonPassOrder.findOneAndUpdate(
      { _id: orderId, status: "pending" },
      { $set: { status: targetStatus, processedBy } },
      { returnDocument: "after", new: true }
    );

    if (!order) {
      return NextResponse.json({ 
        error: "Pesanan tidak ditemukan atau sudah diproses sebelumnya oleh staff/owner lain." 
      }, { status: 400 });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    const isLevelSkip = order.orderType === "LEVEL_SKIP";

    if (action === "APPROVE") {
      const randomTrx = Math.random().toString(36).substring(2, 8).toUpperCase();

      if (isLevelSkip) {
        // Terapkan Level Skip
        const skipRes = await applySeasonLevelSkip(
          order.discordId,
          order.seasonNumber,
          order.levelCount || 1
        );

        // Catat ke transaksi resmi
        const trxId = `TRX-LVLSKIP-S${order.seasonNumber}-${randomTrx}`;
        await Transaction.create({
          trxId,
          discordId: order.discordId,
          userId: order.userId,
          title: `Beli ${order.levelCount || 1} Level Season Pass Season ${order.seasonNumber}`,
          category: "nismaraplus",
          amount: order.amountIDR,
          currency: "IDR",
          status: "success",
          metadata: {
            seasonNumber: order.seasonNumber,
            orderType: "LEVEL_SKIP",
            levelCount: order.levelCount,
            startLevel: order.startLevel,
            targetLevel: skipRes?.newLevel || order.targetLevel,
            orderId: order._id.toString(),
            approvedBy: session.user.discordId,
          },
        });

        // Notifikasi Discord Channel jika ada
        if (order.channelId && botToken) {
          await fetch(`https://discord.com/api/v10/channels/${order.channelId}/messages`, {
            method: "POST",
            headers: {
              Authorization: `Bot ${botToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: `🎉 **PEMBAYARAN LEVEL SKIP DIKONFIRMASI!**\n<@${order.discordId}> Pembelian **${order.levelCount || 1} Level** Season Pass Season ${order.seasonNumber} Anda telah aktif! Progres Anda sekarang berada di **Level ${skipRes?.newLevel || order.targetLevel}**. Silakan klaim seluruh reward baru Anda di Dashboard! ⚡🚀`,
            }),
          }).catch((e) => console.error("Discord level skip order notify error:", e));
        }

        // Revalidasi cache
        try {
          revalidatePath("/dashboard/season-pass");
          revalidatePath("/dashboard/transactions");
          revalidatePath("/dashboard/manage/season-pass");
          revalidatePath("/dashboard");
        } catch (e) {
          console.error("Failed to revalidate order approve paths:", e);
        }

        return NextResponse.json({
          success: true,
          message: `Pesanan Level Skip (+${order.levelCount || 1} Level) untuk ${order.discordId} berhasil disetujui!`,
          order,
        }, {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "CDN-Cache-Control": "no-store",
            "Vercel-CDN-Cache-Control": "no-store",
          }
        });
      } else {
        // Aktifkan Premium Pass
        const progress = await getUserSeasonProgress(order.discordId, order.seasonNumber);
        if (progress) {
          progress.isPremium = true;
          progress.purchasedAt = new Date();
          await progress.save();
        }

        // Catat ke transaksi resmi
        const trxId = `TRX-PASS-S${order.seasonNumber}-${randomTrx}`;
        await Transaction.create({
          trxId,
          discordId: order.discordId,
          userId: order.userId,
          title: `Nismara Pass Premium Season ${order.seasonNumber}`,
          category: "nismaraplus",
          amount: order.amountIDR,
          currency: "IDR",
          status: "success",
          metadata: {
            seasonNumber: order.seasonNumber,
            orderType: "PREMIUM_PASS",
            orderId: order._id.toString(),
            approvedBy: session.user.discordId,
          },
        });

        // Notifikasi Discord Channel jika ada
        if (order.channelId && botToken) {
          await fetch(`https://discord.com/api/v10/channels/${order.channelId}/messages`, {
            method: "POST",
            headers: {
              Authorization: `Bot ${botToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: `🎉 **PEMBAYARAN DITERIMA & DIKONFIRMASI!**\n<@${order.discordId}> Nismara Pass Premium Season ${order.seasonNumber} Anda telah aktif! Anda sekarang dapat mengklaim seluruh 30 level hadiah premium di Dashboard. Terima kasih atas dukungannya! 👑`,
            }),
          }).catch((e) => console.error("Discord order notify error:", e));
        }

        // Revalidasi cache
        try {
          revalidatePath("/dashboard/season-pass");
          revalidatePath("/dashboard/transactions");
          revalidatePath("/dashboard/manage/season-pass");
          revalidatePath("/dashboard");
        } catch (e) {
          console.error("Failed to revalidate order approve paths:", e);
        }

        return NextResponse.json({
          success: true,
          message: `Pesanan Nismara Pass untuk ${order.discordId} berhasil disetujui dan Pass Premium telah aktif!`,
          order,
        }, {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "CDN-Cache-Control": "no-store",
            "Vercel-CDN-Cache-Control": "no-store",
          }
        });
      }
    }

    // action === "REJECT"
    const orderTitle = isLevelSkip
      ? `Level Skip (+${order.levelCount || 1} Level)`
      : `Nismara Pass Premium Season ${order.seasonNumber}`;

    // Notifikasi Discord Channel jika ada
    if (order.channelId && botToken) {
      await fetch(`https://discord.com/api/v10/channels/${order.channelId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: `❌ **PESANAN DITOLAK**\n<@${order.discordId}> Pesanan ${orderTitle} Anda ditolak. Silakan periksa kembali bukti pembayaran Anda atau hubungi Owner / Developer.`,
        }),
      }).catch((e) => console.error("Discord order reject notify error:", e));
    }

    // Revalidasi cache
    try {
      revalidatePath("/dashboard/season-pass");
      revalidatePath("/dashboard/transactions");
      revalidatePath("/dashboard/manage/season-pass");
      revalidatePath("/dashboard");
    } catch (e) {
      console.error("Failed to revalidate order reject paths:", e);
    }

    return NextResponse.json({
      success: true,
      message: `Pesanan Nismara Pass untuk ${order.discordId} telah ditolak.`,
      order,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      }
    });
  } catch (error: any) {
    console.error("Manage Season Pass Order Action Error:", error);
    return NextResponse.json({ error: error.message || "Gagal memproses pesanan" }, { status: 500 });
  }
}
