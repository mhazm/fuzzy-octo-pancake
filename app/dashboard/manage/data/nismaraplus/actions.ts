"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { revalidatePath } from "next/cache";

export async function searchUsers(query: string) {
  try {
    const session = await getServerSession(authOptions);
    const isOwner =
      session?.user?.discordId === process.env.OWNER_DISCORD_ID ||
      session?.user?.discordId === process.env.NISMARA_OWNER_DISCORD_ID;

    if (!session?.user?.discordId || session.user.role !== "manager" || !isOwner) {
      throw new Error("Unauthorized");
    }

    const client = await clientPromise;
    const db = client.db();

    const users = await db.collection("users").find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { discordId: query }
      ]
    }).limit(10).project({ name: 1, discordId: 1, image: 1, nismaraplus: 1 }).toArray();

    return { 
      success: true, 
      data: users.map(u => ({
        ...u,
        _id: u._id.toString()
      })) 
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to search users" };
  }
}

export async function grantOrExtendNismaraPlus(discordId: string, durationMonths: number) {
  try {
    const session = await getServerSession(authOptions);
    const isOwner =
      session?.user?.discordId === process.env.OWNER_DISCORD_ID ||
      session?.user?.discordId === process.env.NISMARA_OWNER_DISCORD_ID;

    if (!session?.user?.discordId || session.user.role !== "manager" || !isOwner) {
      throw new Error("Unauthorized");
    }

    const client = await clientPromise;
    const db = client.db();

    const user = await db.collection("users").findOne({ discordId });
    if (!user) throw new Error("User tidak ditemukan");

    const now = new Date();
    const durationMs = durationMonths * 30 * 24 * 60 * 60 * 1000;
    
    let newStartedAt = now;
    let newExpiredAt = new Date(now.getTime() + durationMs);

    const nismaraplus = user.nismaraplus || {};
    
    // Jika extend (status aktif dan belum expired)
    if (nismaraplus.status && nismaraplus.expiredAt && new Date(nismaraplus.expiredAt) > now) {
      newStartedAt = new Date(nismaraplus.startedAt); // Tetap gunakan start lama
      newExpiredAt = new Date(new Date(nismaraplus.expiredAt).getTime() + durationMs);
    }

    await db.collection("users").updateOne(
      { discordId },
      { 
        $set: { 
          "nismaraplus.status": true,
          "nismaraplus.startedAt": newStartedAt,
          "nismaraplus.expiredAt": newExpiredAt,
        } 
      }
    );

    revalidatePath("/dashboard/manage/data/nismaraplus");
    return { success: true, message: `Berhasil menambahkan ${durationMonths} bulan Nismara+ untuk ${user.name || discordId}.` };
  } catch (error: any) {
    return { success: false, message: error.message || "Gagal memproses langganan" };
  }
}

export async function revokeNismaraPlus(discordId: string) {
  try {
    const session = await getServerSession(authOptions);
    const isOwner =
      session?.user?.discordId === process.env.OWNER_DISCORD_ID ||
      session?.user?.discordId === process.env.NISMARA_OWNER_DISCORD_ID;

    if (!session?.user?.discordId || session.user.role !== "manager" || !isOwner) {
      throw new Error("Unauthorized");
    }

    const client = await clientPromise;
    const db = client.db();

    const user = await db.collection("users").findOne({ discordId });
    if (!user) throw new Error("User tidak ditemukan");

    await db.collection("users").updateOne(
      { discordId },
      { 
        $set: { 
          "nismaraplus.status": false,
          // Opsional: kita bisa mengatur expiredAt ke masa lalu atau null, tapi mengubah status saja cukup.
        } 
      }
    );

    revalidatePath("/dashboard/manage/data/nismaraplus");
    return { success: true, message: `Akses Nismara+ untuk ${user.name || discordId} telah dicabut.` };
  } catch (error: any) {
    return { success: false, message: error.message || "Gagal mencabut akses" };
  }
}
