"use server";

import clientPromise from "@/lib/mongodb";
import { revalidatePath } from "next/cache";

export async function createNCEventAction(formData: any) {
  const client = await clientPromise;
  const db = client.db();

  const { nameEvent, slug, type, gameId, multiplier, imageUrl, isScheduled, startDate, endAt, setBy, guildId } = formData;

  await db.collection("ncevents").insertOne({
    guildId,
    slug,
    nameEvent,
    multiplier: Number(multiplier),
    imageUrl: imageUrl || null,
    type: type || "all",
    gameId: gameId || "all",
    participants: [],
    isActive: !isScheduled,
    isScheduled: !!isScheduled,
    setBy, // Discord ID Manager
    setAt: new Date(),
    startDate: isScheduled && startDate ? new Date(startDate) : new Date(),
    endAt: new Date(endAt),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  revalidatePath("/dashboard/manage/events");
}
