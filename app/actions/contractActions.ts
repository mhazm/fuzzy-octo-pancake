"use server";

import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
  } catch (error) {
    console.error("Gagal update kontrak:", error);
    throw new Error("Gagal memperbarui data kontrak");
  }

  revalidatePath("/dashboard/manage/events/contracts");
  redirect("/dashboard/manage/events/contracts");
}
