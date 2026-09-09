"use server";

import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { deleteFileFromR2 } from "@/lib/r2";
import { slugify } from "@/lib/utils";

export async function createNCEventAction(formData: any) {
  const client = await clientPromise;
  const db = client.db();

  const {
    nameEvent,
    slug: rawSlug,
    type,
    gameId,
    multiplier,
    imageUrl,
    isScheduled,
    startDate,
    endAt,
    setBy,
    guildId = process.env.DISCORD_GUILD_ID || "863959415702028318",
  } = formData;

  const isSched = Boolean(isScheduled);
  const startDt = isSched && startDate ? new Date(`${startDate}+07:00`) : new Date();
  const endDt = new Date(`${endAt}+07:00`);
  const now = new Date();

  const isCurrentlyActive = !isSched || startDt <= now;
  const isTrulyScheduled = isSched && startDt > now;
  const finalSlug = rawSlug && rawSlug.trim() ? slugify(rawSlug) : slugify(nameEvent);

  const newEventDoc = {
    guildId,
    slug: finalSlug,
    nameEvent,
    multiplier: Number(multiplier),
    imageUrl: imageUrl || null,
    type: type || "all",
    gameId: gameId || "all",
    participants: [],
    isActive: isCurrentlyActive,
    isScheduled: isTrulyScheduled,
    setBy, // Discord ID Manager
    setAt: new Date(),
    startDate: startDt,
    endAt: endDt,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection("ncevents").insertOne(newEventDoc);

  // Optional Discord Notification
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_GENERAL_DRIVER_ID_CHANNEL;
  const driverDiscordRole = process.env.DISCORD_DRIVER_ROLE_ID;
  const internDiscordRole = process.env.DISCORD_INTERN_ROLE_ID;

  if (botToken && guildId && channelId) {
    try {
      const eventUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://transport.nismara.web.id"}/currency-boost/${finalSlug}`;
      const boostPercent = Math.round(Number(multiplier) * 100);

      const announcementContent = isTrulyScheduled
        ? `📅 **CURRENCY BOOST EVENT SCHEDULED** 📅\n-# <@&${driverDiscordRole}> <@&${internDiscordRole}>`
        : `⚡ **NEW CURRENCY BOOST EVENT ACTIVE** ⚡\n-# <@&${driverDiscordRole}> <@&${internDiscordRole}>`;

      const descMessage = isTrulyScheduled
        ? `Nismara Transport telah menjadwalkan Boost Event **+${boostPercent}% NC (+${multiplier}x)**! Event akan resmi aktif pada <t:${Math.floor(startDt.getTime() / 1000)}:F> (<t:${Math.floor(startDt.getTime() / 1000)}:R>). Bersiaplah!`
        : `Event **${nameEvent}** kini telah aktif! Seluruh pengiriman mendapatkan bonus **+${boostPercent}% NC (+${multiplier}x)**. Ambil job sekarang sebelum deadline berakhir!`;

      await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: announcementContent,
          embeds: [
            {
              title: isTrulyScheduled ? `[SCHEDULED] ${nameEvent}` : `${nameEvent}`,
              description: descMessage,
              url: eventUrl,
              color: 16753920, // Amber Gold
              image: imageUrl ? { url: imageUrl } : undefined,
              fields: [
                {
                  name: "Bonus Multiplier",
                  value: `+${boostPercent}% NC (+${multiplier}x)`,
                  inline: true,
                },
                {
                  name: "Target Game",
                  value: gameId === "1" ? "Euro Truck Simulator 2" : gameId === "2" ? "American Truck Simulator" : "Semua Game",
                  inline: true,
                },
                {
                  name: isTrulyScheduled ? "Waktu Mulai" : "Deadline",
                  value: isTrulyScheduled
                    ? `<t:${Math.floor(startDt.getTime() / 1000)}:R>`
                    : `<t:${Math.floor(endDt.getTime() / 1000)}:R>`,
                  inline: true,
                },
              ],
              footer: {
                text: "Nismara Transport • Currency Boost Event",
              },
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });
    } catch (err) {
      console.error("Failed to send Discord event announcement:", err);
    }
  }

  revalidatePath("/dashboard/manage/events/ncboost");
  revalidatePath("/currency-boost");
  revalidatePath("/calendar");
  revalidatePath("/");

  return { success: true };
}

export async function updateNCEventAction(eventId: string, formData: any) {
  const client = await clientPromise;
  const db = client.db();

  const {
    nameEvent,
    slug: rawSlug,
    type,
    gameId,
    multiplier,
    imageUrl,
    isScheduled,
    startDate,
    endAt,
  } = formData;

  try {
    const existing = await db
      .collection("ncevents")
      .findOne({ _id: new ObjectId(eventId) });

    if (!existing) {
      return { success: false, error: "Event tidak ditemukan." };
    }

    const isSched = Boolean(isScheduled);
    const startDt = isSched && startDate ? new Date(`${startDate}+07:00`) : new Date();
    const endDt = new Date(`${endAt}+07:00`);
    const now = new Date();

    const isCurrentlyActive = !isSched || startDt <= now;
    const isTrulyScheduled = isSched && startDt > now;
    const finalSlug = rawSlug && rawSlug.trim() ? slugify(rawSlug) : slugify(nameEvent);

    await db.collection("ncevents").updateOne(
      { _id: new ObjectId(eventId) },
      {
        $set: {
          nameEvent,
          slug: finalSlug,
          multiplier: Number(multiplier),
          type: type || "all",
          gameId: gameId || "all",
          imageUrl: imageUrl || null,
          isActive: isCurrentlyActive,
          isScheduled: isTrulyScheduled,
          startDate: startDt,
          endAt: endDt,
          updatedAt: new Date(),
        },
      }
    );

    // Rule 4 Storage Hygiene: Hapus gambar lama jika diganti
    if (existing.imageUrl && imageUrl && existing.imageUrl !== imageUrl) {
      await deleteFileFromR2(existing.imageUrl);
    }

    revalidatePath("/dashboard/manage/events/ncboost");
    revalidatePath("/currency-boost");
    revalidatePath("/calendar");
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    console.error("Gagal mengupdate event NC Boost:", error);
    return { success: false, error: error.message || "Gagal mengupdate event." };
  }
}

export async function closeNCEventAction(eventId: string) {
  const client = await clientPromise;
  const db = client.db();

  try {
    await db.collection("ncevents").updateOne(
      { _id: new ObjectId(eventId) },
      {
        $set: {
          isActive: false,
          isScheduled: false,
          endAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    revalidatePath("/dashboard/manage/events/ncboost");
    revalidatePath("/currency-boost");
    revalidatePath("/calendar");
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    console.error("Gagal menutup event:", error);
    return { success: false, error: error.message || "Gagal menutup event." };
  }
}

export async function publishScheduledNCEventAction(eventId: string) {
  const client = await clientPromise;
  const db = client.db();

  try {
    await db.collection("ncevents").updateOne(
      { _id: new ObjectId(eventId) },
      {
        $set: {
          isActive: true,
          isScheduled: false,
          startDate: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    revalidatePath("/dashboard/manage/events/ncboost");
    revalidatePath("/currency-boost");
    revalidatePath("/calendar");
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    console.error("Gagal mempublikasikan event terjadwal:", error);
    return { success: false, error: error.message || "Gagal mempublikasikan event." };
  }
}

export async function deleteNCEventAction(eventId: string) {
  const client = await clientPromise;
  const db = client.db();

  try {
    const existing = await db
      .collection("ncevents")
      .findOne({ _id: new ObjectId(eventId) });

    if (existing?.imageUrl) {
      await deleteFileFromR2(existing.imageUrl);
    }

    await db
      .collection("ncevents")
      .deleteOne({ _id: new ObjectId(eventId) });

    revalidatePath("/dashboard/manage/events/ncboost");
    revalidatePath("/currency-boost");
    revalidatePath("/calendar");
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    console.error("Gagal menghapus event NC Boost:", error);
    return { success: false, error: error.message || "Gagal menghapus event." };
  }
}
