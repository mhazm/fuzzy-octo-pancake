import { NextResponse } from "next/server";
import mongoose from "mongoose";
import MarketItem from "@/lib/models/MarketItem";
import MarketPurchase from "@/lib/models/MarketPurchase";
import Notification from "@/lib/models/Notification";
import "@/lib/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { deleteFileFromR2 } from "@/lib/r2";

import dbConnect from "@/lib/mongoose";

export const revalidate = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await dbConnect();
    const query = mongoose.isValidObjectId(id)
      ? { $or: [{ slug: id }, { _id: id }] }
      : { slug: id };
    const item = await MarketItem.findOne(query).lean();
    if (!item) {
      return NextResponse.json(
        { error: "Barang tidak ditemukan" },
        { status: 404 },
      );
    }

    const seller = await mongoose.models.User.findOne({
      discordId: item.sellerId,
    }).lean();
    const itemWithSeller = item as any;
    if (seller) {
      itemWithSeller.sellerName = seller.name;
      itemWithSeller.sellerImage = seller.image;
      itemWithSeller.sellerTruckyId = seller.truckyId;
    } else {
      itemWithSeller.sellerName = "Unknown Seller";
      itemWithSeller.sellerImage = null;
      itemWithSeller.sellerTruckyId = null;
    }

    return NextResponse.json(itemWithSeller, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("GET MarketItem Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil detail mod" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const query = mongoose.isValidObjectId(id)
      ? { $or: [{ slug: id }, { _id: id }] }
      : { slug: id };
    const item = await MarketItem.findOne(query);
    if (!item) {
      return NextResponse.json(
        { error: "Barang tidak ditemukan" },
        { status: 404 },
      );
    }

    if (item.sellerId !== session.user.discordId) {
      return NextResponse.json(
        { error: "Forbidden: Bukan pemilik barang" },
        { status: 403 },
      );
    }

    const data = await request.json();

    // Cek apakah harga diubah
    const isPriceChanged =
      data.price !== undefined && Number(data.price) !== item.price;

    // Update fields
    if (data.title) item.title = data.title;

    if (data.slug && data.slug !== item.slug) {
      const existingSlug = await MarketItem.findOne({ slug: data.slug });
      if (existingSlug) {
        return NextResponse.json(
          { error: "Slug/URI sudah digunakan oleh mod lain" },
          { status: 400 },
        );
      }
      item.slug = data.slug;
    }

    if (data.description) item.description = data.description;
    if (data.price !== undefined) item.price = Number(data.price);
    if (data.categories) item.categories = data.categories;
    if (data.game_id) item.game_id = Number(data.game_id);
    if (data.game_version !== undefined) item.game_version = data.game_version;
    if (data.download_url) item.download_url = data.download_url;

    if (data.image_url !== undefined && data.image_url !== item.image_url) {
      if (item.image_url) {
        // Hapus file lama di storage R2 agar tidak memenuhi kapasitas
        await deleteFileFromR2(item.image_url);
      }
      item.image_url = data.image_url;
    }

    // Jika harga berubah, masuk kembali ke antrean approval
    if (isPriceChanged) {
      item.status = "pending";
      item.isPublished = false;

      // Buat Discord Channel untuk Re-Approval
      try {
        const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
        const GUILD_ID = process.env.DISCORD_GUILD_ID;
        const CATEGORY_ID =
          process.env.DISCORD_TICKET_CATEGORY_ID ||
          process.env.DISCORD_PLUS_CATEGORY_ID;
        const MANAGER_ROLE_ID = process.env.DISCORD_MANAGER_ROLE_ID;

        const safeUsername =
          session.user.name?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() ||
          "driver";
        const channelName = `📈|mod-reprice-${safeUsername}-${Math.floor(Math.random() * 10000)}`;

        const createChannelRes = await fetch(
          `https://discord.com/api/v10/guilds/${GUILD_ID}/channels`,
          {
            method: "POST",
            headers: {
              Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: channelName,
              type: 0,
              parent_id: CATEGORY_ID,
              permission_overwrites: [
                { id: GUILD_ID, type: 0, deny: "1024" },
                { id: session.user.discordId, type: 1, allow: "68608" },
                { id: MANAGER_ROLE_ID, type: 0, allow: "68608" },
              ],
            }),
          },
        );

        if (createChannelRes.ok) {
          const channelData = await createChannelRes.json();
          item.discordChannelId = channelData.id;

          await fetch(
            `https://discord.com/api/v10/channels/${channelData.id}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                content: `<@${session.user.discordId}> mengajukan perubahan HARGA mod! Mohon <@&${MANAGER_ROLE_ID}> mereview sebelum di-publish kembali.`,
                embeds: [
                  {
                    title: `🛒 Review Perubahan Harga Mod: ${item.title}`,
                    color: 0xf59e0b,
                    fields: [
                      {
                        name: "Harga Baru",
                        value: `${item.price} NC`,
                        inline: true,
                      },
                    ],
                  },
                ],
              }),
            },
          );
        }
      } catch (discordErr) {
        console.error(
          "Failed to create discord ticket for re-approval:",
          discordErr,
        );
      }
    }

    await item.save();

    // Notifikasi ke semua pembeli
    try {
      const purchases = await MarketPurchase.find({
        marketItemId: item._id,
      }).lean();
      const notifications = purchases
        .filter((p: any) => p.buyerId !== item.sellerId)
        .map((p: any) => ({
          recipient: p.buyerId,
          title: "Update Mod Tersedia",
          message: `Mod "${item.title}" baru saja di-update oleh kreatornya. Silakan cek Library Anda!`,
          type: "info",
          link: `/market/${item.slug}`,
        }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    } catch (notifErr) {
      console.error("Gagal mengirim notifikasi update mod:", notifErr);
    }

    return NextResponse.json({
      success: true,
      message: "Mod berhasil diupdate!",
      data: item,
    });
  } catch (error) {
    console.error("PUT MarketItem Error:", error);
    return NextResponse.json(
      { error: "Gagal mengupdate mod" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isManager =
      session.user.role === "manager" || session.user.role === "admin";

    await dbConnect();

    const query = mongoose.isValidObjectId(id)
      ? { $or: [{ slug: id }, { _id: id }] }
      : { slug: id };
    const dbItem = await MarketItem.findOne(query);
    if (!dbItem) {
      return NextResponse.json(
        { error: "Barang tidak ditemukan" },
        { status: 404 },
      );
    }

    const isOwner = session.user.discordId === dbItem.sellerId;

    if (!isOwner && !isManager) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Hanya pemilik mod atau Manajemen Nismara yang dapat menghapus",
        },
        { status: 403 },
      );
    }

    // Ambil data semua pembeli sebelum item dihapus
    const purchases = await MarketPurchase.find({
      marketItemId: dbItem._id,
    }).lean();

    // Hapus gambar mod dari R2
    if (dbItem.image_url) {
      await deleteFileFromR2(dbItem.image_url);
    }

    // Hapus (Takedown) dari database
    await MarketItem.deleteOne({ _id: dbItem._id });

    const allNotifications = [];

    if (isManager && !isOwner) {
      // 1. Notifikasi ke Kreator (Peringatan Merah) jika manajer yang hapus
      allNotifications.push({
        recipient: dbItem.sellerId,
        title: "🚨 Peringatan Takedown Mod",
        message: `Mod "${dbItem.title}" buatan Anda telah ditarik dari peredaran (Takedown) oleh Manajemen Nismara karena terindikasi melanggar Aturan / Terms of Service.`,
        type: "error",
      });
    }

    // 2. Notifikasi ke Pembeli (Peringatan Kuning)
    const buyerNotifications = purchases
      .filter((p: any) => p.buyerId !== dbItem.sellerId)
      .map((p: any) => ({
        recipient: p.buyerId,
        title: isOwner
          ? "🗑️ Mod Dihapus Kreator"
          : "🛡️ Mod Ditarik oleh Manajemen",
        message: isOwner
          ? `Mod "${dbItem.title}" yang ada di Library Anda telah dihapus secara permanen oleh kreatornya.`
          : `Mod "${dbItem.title}" yang ada di Library Anda telah ditakedown oleh Manajemen karena melanggar aturan Nismara.`,
        type: "warning",
      }));

    allNotifications.push(...buyerNotifications);

    if (allNotifications.length > 0) {
      await Notification.insertMany(allNotifications);
    }

    return NextResponse.json({
      success: true,
      message: "Mod berhasil dihapus!",
    });
  } catch (error) {
    console.error("DELETE MarketItem (Takedown) Error:", error);
    return NextResponse.json(
      { error: "Gagal memproses Takedown" },
      { status: 500 },
    );
  }
}
