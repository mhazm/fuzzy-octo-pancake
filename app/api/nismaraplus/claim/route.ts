import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";

const MONTHLY_NC_REWARD = 10000;
const MONTHLY_TICKET_REWARD = 5;
const COOLDOWN_DAYS = 30;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const discordId = session.user.discordId;
    const client = await clientPromise;
    const db = client.db();

    // Dapatkan data user
    const user = await db.collection("users").findOne({ discordId });
    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const nismaraplus = user.nismaraplus || { status: false, expiredAt: null, lastClaimAt: null };
    const now = new Date();
    const isExpired = nismaraplus.expiredAt ? new Date(nismaraplus.expiredAt) < now : true;
    const isActive = nismaraplus.status && !isExpired;

    if (!isActive) {
      return NextResponse.json({ error: "Akun Nismara+ Anda tidak aktif atau sudah kedaluwarsa." }, { status: 403 });
    }

    // Cek Cooldown (30 Hari)
    if (nismaraplus.lastClaimAt) {
      const lastClaim = new Date(nismaraplus.lastClaimAt);
      const diffTime = Math.abs(now.getTime() - lastClaim.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= COOLDOWN_DAYS) {
        return NextResponse.json(
          { error: `Anda baru bisa mengeklaim hadiah lagi dalam ${COOLDOWN_DAYS - diffDays + 1} hari.` },
          { status: 400 }
        );
      }
    }

    // ==========================================
    // 🛡️ ATOMIC UPDATE (GATES AGAINST RACE CONDITIONS)
    // Hanya update jika belum pernah klaim atau klaim terakhir <= 30 hari yang lalu
    // ==========================================
    const thirtyDaysAgo = new Date(now.getTime() - (COOLDOWN_DAYS * 24 * 60 * 60 * 1000));
    
    const claimResult = await db.collection("users").updateOne(
      { 
        discordId,
        $or: [
          { "nismaraplus.lastClaimAt": null },
          { "nismaraplus.lastClaimAt": { $exists: false } },
          { "nismaraplus.lastClaimAt": { $lte: thirtyDaysAgo } }
        ]
      },
      { $set: { "nismaraplus.lastClaimAt": now } }
    );

    if (claimResult.modifiedCount === 0) {
      return NextResponse.json(
        { error: `Anda sedang diproses atau belum melewati masa cooldown ${COOLDOWN_DAYS} hari.` },
        { status: 400 }
      );
    }

    // ==========================================
    // SEKARANG BARU BERIKAN HADIAH KE USER
    // ==========================================
    const driverId = session.user.driverData?.truckyId 
      ? String(session.user.driverData.truckyId) 
      : discordId;
    const guildId = "863959415702028318";

    // 1. Tambah NC
    await db.collection("currencies").updateOne(
      { userId: discordId, guildId },
      { $inc: { totalNC: MONTHLY_NC_REWARD } },
      { upsert: true }
    );

    // 2. Histori NC
    await db.collection("currencyhistories").insertOne({
      guildId,
      userId: discordId,
      amount: MONTHLY_NC_REWARD,
      type: "earn",
      reason: "Klaim Bulanan Nismara+ Premium",
      createdAt: now,
      updatedAt: now,
      __v: 0,
    });

    // 3. Tambah Penalty Tickets (Via Safebox)
    await db.collection("garages").updateOne(
      { discordId },
      { $inc: { safeboxStock: MONTHLY_TICKET_REWARD } },
      { upsert: true }
    );

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil mengeklaim ${MONTHLY_NC_REWARD.toLocaleString("id-ID")} NC dan ${MONTHLY_TICKET_REWARD} Tiket Penalti!` 
    });

  } catch (error: any) {
    console.error("NismaraPlus Claim Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
