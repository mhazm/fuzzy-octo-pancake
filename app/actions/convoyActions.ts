"use server";

import clientPromise from "@/lib/mongodb";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function createConvoy(formData: FormData) {
  const client = await clientPromise;
  const db = client.db();

  const rawData = Object.fromEntries(formData.entries());

  const meetupDateTime = `${rawData.meetupDate}T${rawData.meetupTime}:00`;
  const startDateTime = `${rawData.startDate}T${rawData.startTime}:00`;

  const meetupDate = rawData.meetupDate ? new Date(meetupDateTime) : null;
  const startDate = rawData.startDate ? new Date(startDateTime) : null;

  try {
    await db.collection("convoylobby").insertOne({
      guildId: "863959415702028318",
      gameId: rawData.gameId,
      convoyUri: rawData.convoyUri,
      convoyName: rawData.convoyName,
      description: rawData.description,
      imageUrl: rawData.imageUrl || null,
      password: rawData.password,
      active: true,
      setBy: "Admin",
      typeConvoy: rawData.typeConvoy || "Mingguan",
      startDate,
      meetupDate,
      sourceCity: rawData.sourceCity || null,
      destinationCity: rawData.destinationCity || null,
      sourceCompany: rawData.sourceCompany || null,
      destinationCompany: rawData.destinationCompany || null,
      cargoName: rawData.cargoName || null,
      cargoMass: rawData.cargoMass ? Number(rawData.cargoMass) : null,
      plannedDistanceKm: rawData.plannedDistanceKm
        ? Number(rawData.plannedDistanceKm)
        : null,
      partisipan: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Gagal membuat convoy:", error);
    throw new Error("Gagal menyimpan data convoy ke database");
  }

  revalidatePath("/convoy");
  redirect("/convoy");
}

export async function joinConvoyAction(
  convoyId: string,
  inputPassword: string,
  jobId: number,
) {
  const client = await clientPromise;
  const db = client.db();

  const session = await getServerSession(authOptions);

  if (
    !session?.user ||
    !("isDriver" in session.user) ||
    !("driverData" in session.user)
  ) {
    throw new Error("Hanya driver resmi Nismara yang dapat bergabung.");
  }

  const discordId = session.user.discordId?.toString() || null;
  const truckyId = (session.user as any).driverData.truckyId.toString();

  const convoy = await db.collection("convoylobby").findOne({
    _id: new ObjectId(convoyId),
  });

  if (!convoy) throw new Error("Convoy tidak ditemukan.");
  if (convoy.password !== inputPassword) {
    throw new Error("Password yang kamu masukkan salah.");
  }

  const isJoined = convoy.partisipan?.some(
    (p: any) =>
      p.truckyId === truckyId || (discordId && p.discordId === discordId),
  );
  if (isJoined) throw new Error("Kamu sudah bergabung di dalam convoy ini.");

  // 1. Masukkan driver ke daftar partisipan convoy
  await db.collection("convoylobby").updateOne(
    { _id: new ObjectId(convoyId) },
    {
      $push: {
        partisipan: {
          truckyId,
          discordId,
          jobId,
        },
      } as any,
      $set: { updatedAt: new Date() },
    },
  );

  // 2. Tambahkan (increment) poin joinedconvoy pada dokumen user di database
  if (discordId) {
    await db
      .collection("users")
      .updateOne({ discordId: discordId }, { $inc: { joinedConvoy: 1 } });
  }

  revalidatePath(`/convoy/${convoy.convoyUri}`);
}

export async function updateConvoy(convoyId: string, formData: FormData) {
  const client = await clientPromise;
  const db = client.db();

  const rawData = Object.fromEntries(formData.entries());

  // Format ulang tanggal dan waktu
  const meetupDateTime = `${rawData.meetupDate}T${rawData.meetupTime}:00`;
  const startDateTime = `${rawData.startDate}T${rawData.startTime}:00`;

  const meetupDate = rawData.meetupDate ? new Date(meetupDateTime) : null;
  const startDate = rawData.startDate ? new Date(startDateTime) : null;

  try {
    await db.collection("convoylobby").updateOne(
      { _id: new ObjectId(convoyId) },
      {
        $set: {
          convoyName: rawData.convoyName,
          description: rawData.description,
          imageUrl: rawData.imageUrl || null,
          password: rawData.password,
          typeConvoy: rawData.typeConvoy,
          startDate,
          meetupDate,
          sourceCity: rawData.sourceCity,
          destinationCity: rawData.destinationCity,
          sourceCompany: rawData.sourceCompany,
          destinationCompany: rawData.destinationCompany,
          cargoName: rawData.cargoName,
          cargoMass: Number(rawData.cargoMass),
          plannedDistanceKm: Number(rawData.plannedDistanceKm),
          updatedAt: new Date(),
        },
      },
    );
  } catch (error) {
    console.error("Gagal update convoy:", error);
    throw new Error("Gagal memperbarui data convoy");
  }

  revalidatePath(`/dashboard/manage/events/convoy`);
  redirect(`/dashboard/manage/events/convoy`);
}
