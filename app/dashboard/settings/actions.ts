"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { revalidatePath } from "next/cache";
import { deleteFileFromR2 } from "@/lib/r2";
import { getDriverStats } from "@/lib/tmp";
import {
  createDiscordTicketChannel,
  sendDiscordMessage,
  deleteDiscordChannel,
} from "@/lib/discord";

export async function updateProfile(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.truckyId) {
    return { success: false, message: "Unauthorized: Silakan login kembali." };
  }

  const name = formData.get("name") as string;
  const image = formData.get("image") as string; // URL Baru dari R2
  const bannerUrl = formData.get("bannerUrl") as string; // URL Baru dari R2
  const backgroundUrl = formData.get("backgroundUrl") as string; // URL Baru dari R2

  const social_media = {
    youtube: formData.get("youtube") as string || "",
    facebook: formData.get("facebook") as string || "",
    instagram: formData.get("instagram") as string || "",
    twitter: formData.get("twitter") as string || "",
    tiktok: formData.get("tiktok") as string || "",
    world_of_truck: formData.get("world_of_truck") as string || "",
    website: formData.get("website") as string || "",
  };

  try {
    const client = await clientPromise;
    const db = client.db();

    // 1. Ambil data profil lama untuk mengecek URL foto lama
    const oldUser = await db
      .collection("users")
      .findOne({ email: session.user.email });

    if (!oldUser) {
      return { success: false, message: "User tidak ditemukan." };
    }

    // 2. Logika Pembersihan: Jika URL baru berbeda dengan URL lama, hapus file lama dari R2[cite: 17]

    // Cek Avatar
    if (image && oldUser.image && image !== oldUser.image) {
      await deleteFileFromR2(oldUser.image);
    }

    // Cek Banner
    if (bannerUrl && oldUser.bannerUrl && bannerUrl !== oldUser.bannerUrl) {
      await deleteFileFromR2(oldUser.bannerUrl);
    }

    // Cek Background
    if (
      backgroundUrl &&
      oldUser.backgroundUrl &&
      backgroundUrl !== oldUser.backgroundUrl
    ) {
      await deleteFileFromR2(oldUser.backgroundUrl);
    }

    // 3. Eksekusi Update ke Database[cite: 17]
    const updateResult = await db.collection("users").updateOne(
      { email: session.user.email },
      {
        $set: {
          name: name,
          image: image,
          bannerUrl: bannerUrl,
          backgroundUrl: backgroundUrl,
          social_media: social_media,
          updatedAt: new Date(),
        },
      },
    );

    if (updateResult.matchedCount === 0) {
      return { success: false, message: "Gagal memperbarui profil." };
    }

    revalidatePath("/profile/[truckyId]", "page");
    revalidatePath("/dashboard/settings");

    return { success: true, message: "Profil berhasil diperbarui!" };
  } catch (error) {
    console.error("Update Profile Error:", error);
    return { success: false, message: "Terjadi kesalahan sistem." };
  }
}

// Tambahkan fungsi ini di actions.ts
export async function getUserSettings() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) return null;

  try {
    const client = await clientPromise;
    const db = client.db();
    const user = await db
      .collection("users")
      .findOne({ email: session.user.email });

    if (!user) return null;

    const haulmpApp = await db.collection("haulmp_applications").findOne(
      { discordId: user.discordId },
      { sort: { createdAt: -1 } }
    );

    // Pastikan mengembalikan objek plain (stringified) karena ini Server Action
    return {
      name: user.name || "",
      image: user.image || "",
      bannerUrl: user.bannerUrl || "",
      backgroundUrl: user.backgroundUrl || "",
      social_media: user.social_media || {
        youtube: "",
        facebook: "",
        instagram: "",
        twitter: "",
        tiktok: "",
        world_of_truck: "",
        website: "",
      },
      truckersmpId: user.truckersmpId || null,
      isTmpDriver: user.isTmpDriver || false,
      isDriver: user.isDriver || false,
      haulmpId: user.haulmpId || null,
      isHaulmpDriver: user.isHaulmpDriver || false,
      haulmpApplication: haulmpApp ? JSON.parse(JSON.stringify(haulmpApp)) : null,
    };
  } catch (error) {
    console.error("Error fetching settings:", error);
    return null;
  }
}

export async function submitHaulmpApplication(notes?: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return { success: false, message: "Unauthorized. Silakan login kembali." };
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    const user = await db.collection("users").findOne({ email: session.user.email });

    if (!user) {
      return { success: false, message: "User tidak ditemukan." };
    }

    if (!user.isDriver) {
      return { success: false, message: "Hanya driver resmi Nismara yang dapat mengajukan verifikasi VTC HaulMP." };
    }

    if (user.isHaulmpDriver) {
      return { success: false, message: "Anda sudah terdaftar sebagai Driver HaulMP aktif." };
    }

    // Cek apakah ada pengajuan pending
    const existingPending = await db.collection("haulmp_applications").findOne({
      discordId: user.discordId,
      status: "pending",
    });

    if (existingPending) {
      return { success: false, message: "Anda sudah memiliki pengajuan verifikasi yang sedang ditinjau." };
    }

    // 1. Buat Discord Ticket Channel di bawah kategori khusus (1562028644795416626)
    const categoryId = process.env.DISCORD_HAULMP_CATEGORY_ID || "1562028644795416626";
    const safeUsername = (user.name || "driver").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const channelName = `🎫│haulmp-${safeUsername}`.substring(0, 100);

    const ticketChannel = await createDiscordTicketChannel({
      categoryId,
      channelName,
      userDiscordId: user.discordId,
    });

    // 2. Kirim pesan pengantar & embed detail pengajuan ke channel tiket jika berhasil dibuat
    if (ticketChannel?.id) {
      const managerRoleId = process.env.DISCORD_MANAGER_ROLE_ID || "863968603681325066";
      await sendDiscordMessage(
        ticketChannel.id,
        `<@${user.discordId}> tiket verifikasi VTC HaulMP Anda berhasil dibuat! Mohon tunggu <@&${managerRoleId}> merespon.`,
        [
          {
            title: "🚛 Tiket Verifikasi Driver VTC HaulMP",
            color: 0x10b981,
            description: `Driver telah mengajukan permohonan verifikasi keanggotaan VTC HaulMP Nismara Transport.\n\nManajemen dapat meninjau dan memproses pengajuan ini melalui Dashboard Manajemen atau memberikan instruksi langsung di channel ini.`,
            fields: [
              { name: "Nama Driver", value: `${user.name}`, inline: true },
              { name: "Discord", value: `<@${user.discordId}>`, inline: true },
              { name: "Trucky ID", value: user.truckyId ? `@${user.truckyId}` : "-", inline: true },
              { name: "Catatan / Info", value: notes?.trim() || "Tidak ada catatan.", inline: false },
              { name: "Status", value: "⏳ Menunggu Peninjauan Manajemen", inline: false },
            ],
            footer: { text: "Nismara Transport Logistics • VTC HaulMP Verification" },
            timestamp: new Date().toISOString(),
          },
        ]
      );
    }

    // 3. Simpan pengajuan ke database bersama channel ID
    await db.collection("haulmp_applications").insertOne({
      discordId: user.discordId,
      name: user.name || "Driver",
      truckyId: user.truckyId || null,
      image: user.image || null,
      notes: notes?.trim() || "",
      channelId: ticketChannel?.id || null,
      discordChannelId: ticketChannel?.id || null,
      status: "pending",
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/manage/data/haulmp");
    return {
      success: true,
      message: "Pengajuan verifikasi VTC HaulMP berhasil dikirim! Channel tiket telah dibuat di Discord.",
    };
  } catch (error) {
    console.error("HaulMP Application Error:", error);
    return { success: false, message: "Terjadi kesalahan internal saat mengajukan verifikasi." };
  }
}

export async function cancelHaulmpApplication() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return { success: false, message: "Unauthorized." };
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    const user = await db.collection("users").findOne({ email: session.user.email });

    if (!user) {
      return { success: false, message: "User tidak ditemukan." };
    }

    const pendingApp = await db.collection("haulmp_applications").findOne({
      discordId: user.discordId,
      status: "pending",
    });

    if (!pendingApp) {
      return { success: false, message: "Tidak ada pengajuan tertunda yang dapat dibatalkan." };
    }

    // Hapus channel Discord jika ada
    if (pendingApp.channelId) {
      await deleteDiscordChannel(pendingApp.channelId);
    }

    await db.collection("haulmp_applications").deleteMany({
      discordId: user.discordId,
      status: "pending",
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/manage/data/haulmp");
    return { success: true, message: "Pengajuan verifikasi HaulMP berhasil dibatalkan dan channel tiket telah dihapus." };
  } catch (error) {
    console.error("Cancel HaulMP Error:", error);
    return { success: false, message: "Terjadi kesalahan sistem." };
  }
}

export async function syncTruckersMP(tmpId: number) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return { success: false, message: "Unauthorized." };
  }

  try {
    const data = await getDriverStats(tmpId);
    if (!data || data.error) {
      return { success: false, message: "ID TruckersMP tidak valid atau API sedang gangguan." };
    }

    const vtcInfo = data.response?.vtc;
    if (!vtcInfo || !vtcInfo.inVTC || vtcInfo.id !== 82362) {
      return { 
        success: false, 
        message: "Akun TruckersMP ini bukan member Nismara Transport. Silakan buat Ticket jika merasa ini kesalahan." 
      };
    }

    const client = await clientPromise;
    const db = client.db();
    const usersCol = db.collection("users");

    const existingUser = await usersCol.findOne({ truckersmpId: tmpId.toString() });
    if (existingUser && existingUser.email !== session.user.email) {
      return { success: false, message: "ID TruckersMP ini sudah ditautkan ke akun lain." };
    }

    const updateResult = await usersCol.updateOne(
      { email: session.user.email },
      { 
        $set: { 
          truckersmpId: tmpId.toString(),
          steamId: data.response.steamID64.toString(),
          isTmpDriver: true 
        } 
      }
    );

    if (updateResult.modifiedCount > 0 || updateResult.matchedCount > 0) {
      revalidatePath("/dashboard/settings");
      return { success: true, message: "Akun TruckersMP berhasil ditautkan!" };
    }

    return { success: false, message: "Gagal memperbarui database." };
  } catch (error) {
    console.error("TMP Sync Error:", error);
    return { success: false, message: "Terjadi kesalahan internal." };
  }
}

export async function unlinkTruckersMP() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return { success: false, message: "Unauthorized." };
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    const usersCol = db.collection("users");

    const updateResult = await usersCol.updateOne(
      { email: session.user.email },
      { 
        $unset: { truckersmpId: "", steamId: "" },
        $set: { isTmpDriver: false }
      }
    );

    if (updateResult.modifiedCount > 0) {
      revalidatePath("/dashboard/settings");
      return { success: true, message: "Tautan TruckersMP berhasil diputuskan!" };
    }

    return { success: false, message: "Gagal memutus tautan database." };
  } catch (error) {
    console.error("TMP Unlink Error:", error);
    return { success: false, message: "Terjadi kesalahan internal." };
  }
}
