import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { jsonNoCache } from "@/lib/antiCache";
import {
  sendDiscordDM,
  sendDiscordMessage,
  deleteDiscordChannel,
} from "@/lib/discord";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// Helper check manager
async function checkManager() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "manager" && session.user.role !== "admin")) {
    return null;
  }
  return session;
}

// GET: Ambil daftar Driver HaulMP aktif dan daftar pengajuan (applications)
export async function GET() {
  const session = await checkManager();
  if (!session) {
    return jsonNoCache({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    const [activeDrivers, applications, allVerifiedDrivers] = await Promise.all([
      db
        .collection("users")
        .find({ isHaulmpDriver: true })
        .project({
          _id: 1,
          name: 1,
          discordId: 1,
          truckyId: 1,
          haulmpId: 1,
          image: 1,
          isHaulmpDriver: 1,
          updatedAt: 1,
        })
        .toArray(),
      db
        .collection("haulmp_applications")
        .find({})
        .sort({ submittedAt: -1 })
        .toArray(),
      db
        .collection("users")
        .find({ isDriver: true })
        .project({
          _id: 1,
          name: 1,
          discordId: 1,
          truckyId: 1,
          image: 1,
          isHaulmpDriver: 1,
        })
        .toArray(),
    ]);

    // Deduplikasi driver aktif berdasarkan discordId (ambil dokumen terbaru)
    const seenActiveDiscord = new Set<string>();
    const uniqueActiveDrivers = activeDrivers
      .sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
      .filter((d: any) => {
        const id = String(d.discordId || "");
        if (!id || seenActiveDiscord.has(id)) return false;
        seenActiveDiscord.add(id);
        return true;
      });

    // Deduplikasi driver verified berdasarkan discordId
    const seenVerifiedDiscord = new Set<string>();
    const uniqueVerifiedDrivers = allVerifiedDrivers
      .sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
      .filter((d: any) => {
        const id = String(d.discordId || "");
        if (!id || seenVerifiedDiscord.has(id)) return false;
        seenVerifiedDiscord.add(id);
        return true;
      });

    // Populate reviewerName jika belum ada di dokumen aplikasi
    const missingReviewerDiscordIds = applications
      .filter((a: any) => !a.reviewerName && a.reviewedBy)
      .map((a: any) => a.reviewedBy);

    if (missingReviewerDiscordIds.length > 0) {
      const reviewers = await db
        .collection("users")
        .find({ discordId: { $in: missingReviewerDiscordIds } })
        .project({ discordId: 1, name: 1 })
        .toArray();
      const reviewerMap = new Map(reviewers.map((r: any) => [r.discordId, r.name]));
      for (const app of applications) {
        if (!app.reviewerName && app.reviewedBy) {
          const resolvedName = reviewerMap.get(app.reviewedBy) || "Manager";
          app.reviewerName = resolvedName;
          db.collection("haulmp_applications")
            .updateOne({ _id: app._id }, { $set: { reviewerName: resolvedName } })
            .catch(() => {});
        }
      }
    }

    return jsonNoCache({
      success: true,
      activeDrivers: uniqueActiveDrivers,
      applications,
      allVerifiedDrivers: uniqueVerifiedDrivers,
    });
  } catch (error: any) {
    console.error("GET /api/manage/haulmp Error:", error);
    return jsonNoCache(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

// POST: Setujui pengajuan ATAU Tambah driver manual
export async function POST(req: Request) {
  const session = await checkManager();
  if (!session) {
    return jsonNoCache({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, applicationId, discordId } = body;
    const client = await clientPromise;
    const db = client.db();

    if (action === "approve") {
      if (!applicationId || !discordId) {
        return jsonNoCache({ error: "Data permohonan tidak lengkap." }, { status: 400 });
      }

      // 1. Ambil data aplikasi terlebih dahulu
      const application = await db.collection("haulmp_applications").findOne({
        _id: new ObjectId(applicationId),
      });

      // 2. Update status aplikasi
      await db.collection("haulmp_applications").updateOne(
        { _id: new ObjectId(applicationId) },
        {
          $set: {
            status: "approved",
            reviewedAt: new Date(),
            reviewedBy: session.user.discordId,
            reviewerName: session.user.name || "Manager",
          },
        }
      );

      // 3. Aktifkan isHaulmpDriver pada pengguna
      await db.collection("users").updateOne(
        { discordId: String(discordId) },
        {
          $set: {
            isHaulmpDriver: true,
          },
        }
      );

      // 4. Kirim DM Discord ke Driver memberitahukan bahwa verifikasi disetujui
      await sendDiscordDM(
        String(discordId),
        `Halo <@${discordId}>, selamat! Pengajuan verifikasi Driver VTC HaulMP Anda telah **DISETUJUI** oleh Manajemen Nismara Transport.`,
        [
          {
            title: "🎉 Selamat! Verifikasi VTC HaulMP Disetujui",
            color: 0x10b981,
            description: `Akun Anda sekarang telah resmi terdaftar sebagai **Driver HaulMP Nismara Transport**.\n\nStatus dan badge terverifikasi HaulMP kini aktif di profil Anda. Anda siap mencatat pekerjaan serta mengikuti konvoi resmi Nismara Transport di HaulMP!`,
            fields: [
              { name: "Nama Driver", value: application?.name || "Driver", inline: true },
              { name: "Ditinjau Oleh", value: session.user.name || "Manajemen Nismara", inline: true },
              {
                name: "Waktu Persetujuan",
                value: `${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`,
                inline: false,
              },
            ],
            footer: { text: "Nismara Transport Logistics • VTC HaulMP" },
            timestamp: new Date().toISOString(),
          },
        ]
      );

      // 5. Tutup & hapus channel tiket Discord jika ada
      if (application?.channelId) {
        try {
          await sendDiscordMessage(
            application.channelId,
            `✅ **VERIFIKASI DISETUJUI**\nHalo <@${discordId}>, pengajuan verifikasi VTC HaulMP Anda telah **DISETUJUI** oleh <@${session.user.discordId}>. Channel tiket ini akan segera ditutup dan dihapus otomatis.`
          );
          await deleteDiscordChannel(application.channelId);
        } catch (discordErr) {
          console.error("Error closing Discord ticket channel on approve:", discordErr);
        }
      }

      revalidatePath("/dashboard/manage/data/haulmp");
      revalidatePath("/dashboard/settings");

      return jsonNoCache({
        success: true,
        message: "Pengajuan berhasil disetujui! Driver kini aktif sebagai Driver HaulMP dan DM notifikasi telah dikirimkan.",
      });
    }

    if (action === "add_manual") {
      if (!discordId) {
        return jsonNoCache({ error: "Discord ID wajib disertakan." }, { status: 400 });
      }

      // 1. Ambil data driver
      const targetUser = await db.collection("users").findOne({ discordId: String(discordId) });

      // 2. Aktifkan status isHaulmpDriver untuk user
      await db.collection("users").updateMany(
        { discordId: String(discordId) },
        {
          $set: {
            isHaulmpDriver: true,
          },
        }
      );

      const reviewerName = session.user.name || "Manager";

      // 3. Catat riwayat penambahan manual ke haulmp_applications agar muncul di tab Riwayat
      const newHistory = {
        discordId: String(discordId),
        name: targetUser?.name || "Driver",
        truckyId: targetUser?.truckyId || null,
        image: targetUser?.image || null,
        notes: "Ditambahkan secara manual oleh Manajemen",
        status: "approved" as const,
        submittedAt: new Date(),
        reviewedAt: new Date(),
        reviewedBy: session.user.discordId,
        reviewerName: reviewerName,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const insertRes = await db.collection("haulmp_applications").insertOne(newHistory);

      // 4. Kirim DM notifikasi Discord ke Driver
      await sendDiscordDM(
        String(discordId),
        `Halo <@${discordId}>, selamat! Akun Anda telah didaftarkan sebagai **Driver HaulMP Nismara Transport** oleh Manajemen.`,
        [
          {
            title: "🎉 Selamat! Terdaftar sebagai Driver VTC HaulMP",
            color: 0x10b981,
            description: `Akun Anda sekarang telah resmi terdaftar sebagai **Driver HaulMP Nismara Transport** secara langsung oleh tim Manajemen.\n\nStatus dan badge terverifikasi HaulMP kini aktif di profil Anda. Anda siap mencatat pekerjaan serta mengikuti konvoi resmi Nismara Transport di HaulMP!`,
            fields: [
              { name: "Nama Driver", value: targetUser?.name || "Driver", inline: true },
              { name: "Didaftarkan Oleh", value: reviewerName, inline: true },
              {
                name: "Waktu",
                value: `${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`,
                inline: false,
              },
            ],
            footer: { text: "Nismara Transport Logistics • VTC HaulMP" },
            timestamp: new Date().toISOString(),
          },
        ]
      );

      revalidatePath("/dashboard/manage/data/haulmp");
      revalidatePath("/dashboard/settings");

      return jsonNoCache({
        success: true,
        message: `Driver "${targetUser?.name || discordId}" berhasil ditambahkan ke daftar Driver HaulMP dan dicatat ke riwayat.`,
        historyRecord: {
          ...newHistory,
          _id: insertRes.insertedId.toString(),
        },
      });
    }

    return jsonNoCache({ error: "Aksi tidak dikenali." }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/manage/haulmp Error:", error);
    return jsonNoCache(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

// PUT: Tolak pengajuan (Reject)
export async function PUT(req: Request) {
  const session = await checkManager();
  if (!session) {
    return jsonNoCache({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { applicationId, reviewReason } = body;

    if (!applicationId) {
      return jsonNoCache({ error: "ID Permohonan tidak valid." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // 1. Ambil data aplikasi terlebih dahulu
    const application = await db.collection("haulmp_applications").findOne({
      _id: new ObjectId(applicationId),
    });

    const reason = reviewReason?.trim() || "Tidak memenuhi syarat keanggotaan VTC HaulMP.";

    // 2. Update status aplikasi ke rejected
    await db.collection("haulmp_applications").updateOne(
      { _id: new ObjectId(applicationId) },
      {
        $set: {
          status: "rejected",
          reviewedAt: new Date(),
          reviewedBy: session.user.discordId,
          reviewerName: session.user.name || "Manager",
          reviewReason: reason,
        },
      }
    );

    // 3. Kirim DM Discord ke Driver mengenai penolakan
    if (application?.discordId) {
      await sendDiscordDM(
        application.discordId,
        `Halo <@${application.discordId}>, pemberitahuan mengenai permohonan verifikasi Driver VTC HaulMP Anda.`,
        [
          {
            title: "❌ Pengajuan VTC HaulMP Ditolak",
            color: 0xef4444,
            description: `Mohon maaf, pengajuan verifikasi Driver VTC HaulMP Anda belum dapat disetujui oleh Manajemen Nismara Transport.\n\n**Alasan / Catatan:**\n> ${reason}\n\nAnda dapat memperbaiki persyaratan dan mengajukan kembali verifikasi melalui halaman Pengaturan Akun di website Nismara Logistics.`,
            fields: [
              { name: "Nama Driver", value: application.name || "Driver", inline: true },
              { name: "Ditinjau Oleh", value: session.user.name || "Manajemen Nismara", inline: true },
              {
                name: "Waktu Keputusan",
                value: `${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`,
                inline: false,
              },
            ],
            footer: { text: "Nismara Transport Logistics • VTC HaulMP" },
            timestamp: new Date().toISOString(),
          },
        ]
      );
    }

    // 4. Tutup & hapus channel tiket Discord jika ada
    if (application?.channelId) {
      try {
        await sendDiscordMessage(
          application.channelId,
          `❌ **VERIFIKASI DITOLAK**\nHalo <@${application.discordId}>, pengajuan verifikasi VTC HaulMP Anda **DITOLAK** oleh <@${session.user.discordId}>.\n**Alasan:** ${reason}\nChannel tiket ini akan segera dihapus otomatis.`
        );
        await deleteDiscordChannel(application.channelId);
      } catch (discordErr) {
        console.error("Error closing Discord ticket channel on reject:", discordErr);
      }
    }

    revalidatePath("/dashboard/manage/data/haulmp");
    revalidatePath("/dashboard/settings");

    return jsonNoCache({
      success: true,
      message: "Pengajuan Driver HaulMP telah ditolak dan DM notifikasi telah dikirimkan ke driver.",
    });
  } catch (error: any) {
    console.error("PUT /api/manage/haulmp Error:", error);
    return jsonNoCache(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Hapus status driver HaulMP (isHaulmpDriver = false)
export async function DELETE(req: Request) {
  const session = await checkManager();
  if (!session) {
    return jsonNoCache({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const discordId = searchParams.get("discordId");

    if (!discordId) {
      return jsonNoCache({ error: "Discord ID wajib disertakan." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const updateRes = await db.collection("users").updateOne(
      { discordId: String(discordId) },
      {
        $set: {
          isHaulmpDriver: false,
        },
      }
    );

    if (updateRes.modifiedCount === 0 && updateRes.matchedCount === 0) {
      return jsonNoCache({ error: "Pengemudi tidak ditemukan." }, { status: 404 });
    }

    revalidatePath("/dashboard/manage/data/haulmp");
    revalidatePath("/dashboard/settings");

    return jsonNoCache({
      success: true,
      message: "Driver berhasil dihapus dari daftar Driver HaulMP.",
    });
  } catch (error: any) {
    console.error("DELETE /api/manage/haulmp Error:", error);
    return jsonNoCache(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
