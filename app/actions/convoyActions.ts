"use server";

import clientPromise from "@/lib/mongodb";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { deleteFileFromR2 } from "@/lib/r2";

export async function createConvoy(formData: FormData) {
  const client = await clientPromise;
  const db = client.db();

  const rawData = Object.fromEntries(formData.entries());

  const meetupDateTime = `${rawData.meetupDate}T${rawData.meetupTime}:00`;
  const startDateTime = `${rawData.startDate}T${rawData.startTime}:00`;

  const meetupDate = rawData.meetupDate ? new Date(meetupDateTime) : null;
  const startDate = rawData.startDate ? new Date(startDateTime) : null;

  const session = await getServerSession(authOptions);
  const discordId = session?.user?.discordId?.toString() || "Admin";
  const guildId = "863959415702028318";

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
      setBy: discordId,
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
      interested: [],
      roadCaptain: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Integrasi Discord (Notification & Scheduled Event)
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const channelId = process.env.DISCORD_GENERAL_DRIVER_ID_CHANNEL;
    const driverDiscordRole = process.env.DISCORD_DRIVER_ROLE_ID;
    const internDiscordRole = process.env.DISCORD_INTERN_ROLE_ID;

    if (botToken) {
      const convoyUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/convoy/${rawData.convoyUri}`;

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
                content: `🚛 **NEW CONVOY SCHEDULED** 🚛\n-# <@&${driverDiscordRole}> <@&${internDiscordRole}>`,
                embeds: [
                  {
                    title: `${rawData.convoyName}`,
                    description: `Jadwal convoy ${rawData.typeConvoy} baru telah diatur! Pastikan untuk berkumpul tepat waktu pada jam yang ditentukan.\n\n${rawData.description}`,
                    url: convoyUrl,
                    color: rawData.gameId === "1" ? 3447003 : 15844367, // Biru ETS2, Orange ATS
                    image: rawData.imageUrl
                      ? { url: rawData.imageUrl }
                      : undefined,
                    fields: [
                      {
                        name: "Target Game",
                        value:
                          rawData.gameId === "1"
                            ? "Euro Truck Simulator 2"
                            : "American Truck Simulator",
                        inline: true,
                      },
                      {
                        name: "Meetup Time",
                        value: meetupDate
                          ? `<t:${Math.floor(meetupDate.getTime() / 1000)}:R>`
                          : "N/A",
                        inline: true,
                      },
                    ],
                    footer: { text: "Nismara Logistics Control System" },
                  },
                ],
                components: [
                  {
                    type: 1,
                    components: [
                      {
                        type: 2,
                        style: 5,
                        label: "Lihat Detail Convoy",
                        url: convoyUrl,
                      },
                    ],
                  },
                ],
              }),
            },
          );
        } catch (err) {
          console.error("Gagal mengirim notifikasi discord convoy:", err);
        }
      }

      if (meetupDate) {
        try {
          let base64Image = undefined;
          if (rawData.imageUrl) {
            try {
              const imgRes = await fetch(rawData.imageUrl as string);
              const arrayBuffer = await imgRes.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              base64Image = `data:image/webp;base64,${buffer.toString("base64")}`;
            } catch (e) {
              console.error(
                "Gagal convert image base64 untuk Convoy Discord Event",
                e,
              );
            }
          }

          // Waktu mulai tidak boleh di masa lalu (kalau lewat dari sekarang, +1 menit)
          let scheduledStartTime = new Date(meetupDate);
          if (scheduledStartTime.getTime() <= Date.now()) {
            scheduledStartTime = new Date(Date.now() + 60000);
          }
          let scheduledEndTime = new Date(
            scheduledStartTime.getTime() + 2 * 60 * 60 * 1000,
          ); // 2 hours default
          if (startDate && startDate.getTime() > scheduledStartTime.getTime()) {
            scheduledEndTime = new Date(
              startDate.getTime() + 3 * 60 * 60 * 1000,
            ); // 3 hours after start
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
                name: rawData.convoyName,
                privacy_level: 2,
                scheduled_start_time: scheduledStartTime.toISOString(),
                scheduled_end_time: scheduledEndTime.toISOString(),
                entity_type: 3,
                entity_metadata: {
                  location: `Convoy: ${rawData.sourceCity} -> ${rawData.destinationCity}`,
                },
                description: `Konvoi Nismara: ${rawData.convoyName}. Cek Info detail di website.`,
                image: base64Image,
              }),
            },
          );
        } catch (err) {
          console.error("Gagal membuat Discord Event convoy:", err);
        }
      }
    }
  } catch (error) {
    console.error("Gagal membuat convoy:", error);
    throw new Error("Gagal menyimpan data convoy ke database");
  }

  revalidatePath("/convoy");
  redirect("/convoy");
}

export async function rsvpConvoyAction(convoyId: string) {
  const client = await clientPromise;
  const db = client.db();
  const session = await getServerSession(authOptions);

  if (!session?.user?.discordId) {
    throw new Error("Sesi tidak valid atau Discord ID tidak ditemukan.");
  }

  const discordId = session.user.discordId.toString();

  const convoy = await db
    .collection("convoylobby")
    .findOne({ _id: new ObjectId(convoyId) });
  if (!convoy) throw new Error("Convoy tidak ditemukan.");

  if (convoy.interested && convoy.interested.includes(discordId)) {
    throw new Error("Kamu sudah mendaftar untuk hadir di convoy ini.");
  }

  await db
    .collection("convoylobby")
    .updateOne(
      { _id: new ObjectId(convoyId) },
      { $push: { interested: discordId } as any },
    );

  revalidatePath(`/convoy/${convoy.convoyUri}`);
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

  // --- VALIDASI JOB ID ---
  const jobHistory = await db
    .collection("jobhistories")
    .findOne({ jobId: String(jobId) });
  if (!jobHistory) {
    throw new Error(
      "Job ID tidak ditemukan di sistem. Pastikan pekerjaanmu sudah terekam oleh Trucky.",
    );
  }

  // Validasi Rute (Hilangkan bagian "(DLC)" dari string convoy sebelum validasi jika ada)
  const baseConvoySource = convoy.sourceCity?.replace(/\s*\(.*\)$/, "");
  const baseConvoyDest = convoy.destinationCity?.replace(/\s*\(.*\)$/, "");

  if (
    jobHistory.sourceCity !== baseConvoySource ||
    jobHistory.destinationCity !== baseConvoyDest
  ) {
    throw new Error(
      `Rute tidak sesuai! Convoy ini rutenya dari ${convoy.sourceCity} menuju ${convoy.destinationCity}.`,
    );
  }

  // Validasi Status (Sementara diizinkan COMPLETED untuk testing)
  // TODO: Hapus validasi COMPLETED saat di-deploy untuk production, pastikan hanya menerima ONGOING
  const currentJobStatus =
    jobHistory.jobStatus?.toUpperCase() || jobHistory.status?.toUpperCase();
  if (currentJobStatus !== "ONGOING" && currentJobStatus !== "COMPLETED") {
    throw new Error(
      `Status pekerjaanmu saat ini adalah ${currentJobStatus || "Unknown"}. Harus dalam status ONGOING untuk bergabung.`,
    );
  }
  // -------------------------

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
    const existingConvoy = await db
      .collection("convoylobby")
      .findOne({ _id: new ObjectId(convoyId) });

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
          roadCaptain: rawData.roadCaptain || "",
          updatedAt: new Date(),
        },
      },
    );

    if (
      existingConvoy &&
      rawData.imageUrl &&
      existingConvoy.imageUrl !== rawData.imageUrl
    ) {
      await deleteFileFromR2(existingConvoy.imageUrl);
    }
  } catch (error) {
    console.error("Gagal update convoy:", error);
    throw new Error("Gagal memperbarui data convoy");
  }

  revalidatePath(`/dashboard/manage/events/convoy`);
  redirect(`/dashboard/manage/events/convoy`);
}

export async function claimConvoyRewardAction(convoyId: string) {
  const client = await clientPromise;
  const db = client.db();
  const session = await getServerSession(authOptions);

  if (!session?.user?.discordId) {
    throw new Error("Sesi tidak valid atau Discord ID tidak ditemukan.");
  }
  const discordId = session.user.discordId.toString();

  const convoy = await db
    .collection("convoylobby")
    .findOne({ _id: new ObjectId(convoyId) });
  if (!convoy) throw new Error("Convoy tidak ditemukan.");

  const partisipan = convoy.partisipan?.find(
    (p: any) => p.discordId === discordId,
  );
  if (!partisipan) {
    throw new Error(
      "Kamu belum tergabung dalam convoy ini secara resmi (belum input Job ID).",
    );
  }

  if (partisipan.claimedReward) {
    throw new Error("Kamu sudah mengklaim hadiah untuk convoy ini.");
  }

  // Cari JobHistory
  const jobHistory = await db
    .collection("jobhistories")
    .findOne({ jobId: String(partisipan.jobId) });
  if (!jobHistory) {
    throw new Error(
      "Data pekerjaan (Job ID) tidak ditemukan di database server Nismara. Pastikan sinkronisasi Trucky sudah berjalan.",
    );
  }

  if (
    jobHistory.jobStatus !== "COMPLETED" &&
    jobHistory.status !== "completed"
  ) {
    throw new Error(
      "Pekerjaanmu di Trucky belum berstatus Selesai (Completed). Selesaikan dulu pengirimanmu!",
    );
  }

  // Hitung Hadiah
  let totalReward = 0;
  const participantCount = convoy.partisipan?.length || 0;

  if (convoy.typeConvoy === "Mingguan") {
    totalReward += 1000 + (150 * participantCount); // 1000 Base + (150 * Player)
  } else if (convoy.typeConvoy === "Bulanan") {
    totalReward += 2000 + (250 * participantCount); // 2000 Base + (250 * Player)
  }

  // Bonus Ekstra
  if (convoy.setBy === discordId) {
    totalReward += 3000;
  }
  if (convoy.roadCaptain === discordId) {
    totalReward += 1500;
  }

  // Update Saldo NC Pemain
  const guildId = "863959415702028318";
  await db
    .collection("currencies")
    .updateOne(
      { userId: discordId, guildId: guildId },
      { $inc: { totalNC: totalReward } },
    );

  // Catat riwayat transaksi
  await db.collection("currencyhistories").insertOne({
    userId: discordId,
    guildId: guildId,
    amount: totalReward,
    type: "earn",
    reason: `Reward Sesi Convoy: ${convoy.convoyName}`,
    createdAt: new Date(),
  });

  // Generate Collectible Ticket
  let ticketNumber = convoy.ticketNumber;
  if (!ticketNumber) {
    const highestTicketConvoy = await db
      .collection("convoylobby")
      .find({ ticketNumber: { $exists: true } })
      .sort({ ticketNumber: -1 })
      .limit(1)
      .toArray();
      
    let nextNum = 1;
    if (highestTicketConvoy.length > 0 && highestTicketConvoy[0].ticketNumber) {
      const parts = highestTicketConvoy[0].ticketNumber.split("-");
      if (parts.length > 1) {
        nextNum = parseInt(parts[1]) + 1;
      }
    }
    ticketNumber = `NCE-${nextNum.toString().padStart(4, "0")}`;

    await db.collection("convoylobby").updateOne(
      { _id: new ObjectId(convoyId) },
      { $set: { ticketNumber } }
    );
  }
  
  const seatLetter = String.fromCharCode(65 + Math.floor(Math.random() * 6)); // A-F
  const seatNumber = Math.floor(Math.random() * 20) + 1;
  const gateNumber = (Math.floor(Math.random() * 9) + 1).toString().padStart(2, "0");
  
  await db.collection("collectibles").insertOne({
    discordId: discordId,
    type: "convoy_ticket",
    title: convoy.convoyName,
    subtitle: `${convoy.sourceCity?.replace(/\s*\(.*\)$/, "")} -> ${convoy.destinationCity?.replace(/\s*\(.*\)$/, "")}`,
    date: convoy.meetupDate,
    seat: `${seatLetter}${seatNumber}`,
    gate: gateNumber,
    ticketNumber: ticketNumber,
    createdAt: new Date(),
  });

  // Tandai sebagai sudah diklaim
  await db
    .collection("convoylobby")
    .updateOne(
      { _id: new ObjectId(convoyId), "partisipan.discordId": discordId },
      { $set: { "partisipan.$.claimedReward": true } },
    );

  return {
    success: true,
    message: `Berhasil klaim hadiah sebesar ${totalReward.toLocaleString("id-ID")} NC!`,
  };
}

export async function endConvoyAction(convoyId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    throw new Error("Unauthorized");
  }

  const client = await clientPromise;
  const db = client.db();

  const convoy = await db
    .collection("convoylobby")
    .findOne({ _id: new ObjectId(convoyId) });
  if (!convoy) {
    throw new Error("Convoy tidak ditemukan");
  }

  const isManager =
    session.user.role === "manager" || session.user.role === "admin";
  const isCreator = convoy.setBy === session.user.discordId;
  const isRC = convoy.roadCaptain === session.user.discordId;

  if (!isManager && !isCreator && !isRC) {
    throw new Error("Anda tidak memiliki akses untuk mengakhiri convoy ini");
  }

  await db
    .collection("convoylobby")
    .updateOne(
      { _id: new ObjectId(convoyId) },
      { $set: { isEnded: true, isActive: false, updatedAt: new Date() } },
    );

  revalidatePath(`/convoy/${convoy.convoyUri}`);
  return { success: true, message: "Convoy berhasil diakhiri secara manual." };
}
