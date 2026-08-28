"use server";

import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";

export async function getPopupConfig() {
  try {
    const client = await clientPromise;
    const db = client.db();
    
    const popup = await db.collection("settings").findOne({ _id: "global_popup" });
    
    if (!popup) {
      return {
        isActive: false,
        title: "Pengumuman Spesial!",
        description: "Selamat datang di Nismara Transport.",
        imageUrl: "",
        actionLink: "/dashboard",
        actionText: "Lihat Detail",
        cooldownHours: 3,
      };
    }
    
    return popup;
  } catch (error) {
    console.error("Gagal mendapatkan config popup:", error);
    return null;
  }
}

export async function updatePopupConfig(data: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "admin" && session.user.role !== "manager")) {
      throw new Error("Unauthorized");
    }

    const client = await clientPromise;
    const db = client.db();
    
    await db.collection("settings").updateOne(
      { _id: "global_popup" },
      {
        $set: {
          isActive: data.isActive,
          title: data.title,
          description: data.description,
          imageUrl: data.imageUrl,
          actionLink: data.actionLink,
          actionText: data.actionText,
          cooldownHours: parseInt(data.cooldownHours) || 3,
          updatedAt: new Date(),
          updatedBy: session.user.discordId
        }
      },
      { upsert: true }
    );
    
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: any) {
    console.error("Gagal update config popup:", error);
    return { success: false, error: error.message };
  }
}
