"use server";

import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteFileFromR2 } from "@/lib/r2";

export async function createContractAction(formData: any) {
  const client = await clientPromise;
  const db = client.db();

  const { contractName, companyName, imageUrl, gameId, endAt, setBy, guildId } =
    formData;

  await db.collection("contracts").insertOne({
    guildId,
    contractName,
    companyName,
    imageUrl,
    gameId: String(gameId), // "1" untuk ETS2, "2" untuk ATS
    completedContracts: 0,
    totalNCEarned: 0,
    totalDistance: 0,
    totalMass: 0,
    setBy, // Discord ID Manager
    setAt: new Date(),
    endAt: new Date(endAt),
    contributors: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Integrasi Discord (Notification & Scheduled Event)
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_GENERAL_DRIVER_ID_CHANNEL;
  const driverDiscordRole = process.env.DISCORD_DRIVER_ROLE_ID;
  const internDiscordRole = process.env.DISCORD_INTERN_ROLE_ID;

  if (botToken && guildId) {
    const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, "-");
    const contractUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/special-contracts/${slugify(contractName)}`;

    // 1. Kirim Pesan Notifikasi ke Channel Driver
    if (channelId) {
      try {
        await fetch(
          `https://discord.com/api/v10/channels/${channelId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bot ${botToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: `🚨 **NEW SPECIAL CONTRACT DEPLOYED** 🚨\n-# <@&${driverDiscordRole}> <@&${internDiscordRole}>`,
              embeds: [
                {
                  title: `${contractName}`,
                  description: `Nismara Transport telah mendapatkan special contract dari **${companyName}**! Ayo segera ambil pekerjaan dari atau menuju ke ${companyName}. Jangan sampai terlambat!`,
                  url: contractUrl,
                  color: gameId === "1" ? 3447003 : 15844367, // Biru ETS2, Orange ATS
                  image: imageUrl ? { url: imageUrl } : undefined,
                  fields: [
                    {
                      name: "Target Game",
                      value:
                        gameId === "1"
                          ? "Euro Truck Simulator 2"
                          : "American Truck Simulator",
                      inline: true,
                    },
                    {
                      name: "Deadline",
                      value: `<t:${Math.floor(new Date(endAt).getTime() / 1000)}:R>`,
                      inline: true,
                    },
                  ],
                  footer: { text: "Nismara Transport - Special Contract" },
                },
              ],
              components: [
                {
                  type: 1,
                  components: [
                    {
                      type: 2,
                      style: 5,
                      label: "Lihat Detail Kontrak",
                      url: contractUrl,
                    },
                  ],
                },
              ],
            }),
          },
        );
      } catch (err) {
        console.error("Gagal mengirim notifikasi discord:", err);
      }
    }

    // 2. Buat Scheduled Event di Guild
    try {
      let base64Image = undefined;
      if (imageUrl) {
        try {
          const imgRes = await fetch(imageUrl);
          const arrayBuffer = await imgRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64 = buffer.toString("base64");
          // Gunakan tipe webp karena dikompresi jadi webp
          base64Image = `data:image/webp;base64,${base64}`;
        } catch (e) {
          console.error(
            "Gagal mengonversi image ke base64 untuk Discord Event",
            e,
          );
        }
      }

      await fetch(
        `https://discord.com/api/v10/guilds/${guildId}/scheduled-events`,
        {
          method: "POST",
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: contractName,
            privacy_level: 2, // GUILD_ONLY
            scheduled_start_time: new Date(Date.now() + 60000).toISOString(), // Harus di masa depan
            scheduled_end_time: new Date(endAt).toISOString(),
            entity_type: 3, // EXTERNAL
            entity_metadata: {
              location: `${companyName} - ${gameId === "1" ? "ETS2" : "ATS"}`,
            },
            description: `Kontrak logistik khusus dari ${companyName}. Info lebih lanjut: ${contractUrl}`,
            image: base64Image,
          }),
        },
      );
    } catch (err) {
      console.error("Gagal membuat Discord Event:", err);
    }
  }

  revalidatePath("/dashboard/manage/events/contracts");
}

export async function updateContractAction(
  contractId: string,
  formData: FormData,
) {
  const client = await clientPromise;
  const db = client.db();

  const rawData = Object.fromEntries(formData.entries());

  try {
    const existingContract = await db
      .collection("contracts")
      .findOne({ _id: new ObjectId(contractId) });

    await db.collection("contracts").updateOne(
      { _id: new ObjectId(contractId) },
      {
        $set: {
          contractName: rawData.contractName,
          companyName: rawData.companyName,
          imageUrl: rawData.imageUrl || null,
          gameId: rawData.gameId,
          endAt: new Date(rawData.endAt as string),
          updatedAt: new Date(),
        },
      },
    );

    // Jika gambar diubah, hapus gambar lama dari R2
    if (
      existingContract &&
      rawData.imageUrl &&
      existingContract.imageUrl !== rawData.imageUrl
    ) {
      await deleteFileFromR2(existingContract.imageUrl);
    }
  } catch (error) {
    console.error("Gagal update kontrak:", error);
    throw new Error("Gagal memperbarui data kontrak");
  }

  revalidatePath("/dashboard/manage/events/contracts");
  redirect("/dashboard/manage/events/contracts");
}
