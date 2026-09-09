import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const MONTHLY_NC_REWARD = 10000;
const MONTHLY_TICKET_REWARD = 5;
const COOLDOWN_DAYS = 30;
const GUILD_ID = process.env.GUILD_ID || "863959415702028318";

export async function POST(request: Request) {
  let isClaimLocked = false;
  let previousLastClaimAt: Date | null = null;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const discordId = session.user.discordId;
    const client = await clientPromise;
    const db = client.db();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (COOLDOWN_DAYS * 24 * 60 * 60 * 1000));

    // Dapatkan data user saat ini
    const user = await db.collection("users").findOne({ discordId });
    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const nismaraplus = user.nismaraplus || { status: false, expiredAt: null, lastClaimAt: null };
    const isExpired = nismaraplus.expiredAt ? new Date(nismaraplus.expiredAt) < now : true;
    const isActive = nismaraplus.status && !isExpired;

    if (!isActive) {
      return NextResponse.json({ error: "Akun Nismara+ Anda tidak aktif atau sudah kedaluwarsa." }, { status: 403 });
    }

    previousLastClaimAt = nismaraplus.lastClaimAt ? new Date(nismaraplus.lastClaimAt) : null;

    // Cek Cooldown (30 Hari) awal untuk pesan error yang informatif
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
    // 🛡️ ATOMIC GATE (GATES AGAINST RACE CONDITIONS & EXPIRED STATUS)
    // Kunci status aktif, expiredAt belum lewat, DAN cooldown sekaligus dalam 1 query atomik
    // ==========================================
    const claimResult = await db.collection("users").updateOne(
      { 
        discordId,
        "nismaraplus.status": true,
        "nismaraplus.expiredAt": { $gt: now },
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
        { error: `Klaim gagal. Akun Nismara+ Anda tidak aktif, sudah kedaluwarsa, atau sedang diproses pada permintaan lain.` },
        { status: 400 }
      );
    }

    isClaimLocked = true;

    // ==========================================
    // BERIKAN REWARD KE USER
    // ==========================================

    // 1. Tambah NC
    await db.collection("currencies").updateOne(
      { userId: discordId, guildId: GUILD_ID },
      { $inc: { totalNC: MONTHLY_NC_REWARD } },
      { upsert: true }
    );

    // 2. Histori NC
    await db.collection("currencyhistories").insertOne({
      guildId: GUILD_ID,
      userId: discordId,
      amount: MONTHLY_NC_REWARD,
      type: "earn",
      reason: "Klaim Bulanan Nismara+ Premium",
      createdAt: now,
      updatedAt: now,
      __v: 0,
    });

    // 3. Tambah Penalty Tickets (Safebox) dengan default schema lengkap jika belum ada dokumen garasi
    await db.collection("garages").updateOne(
      { discordId },
      { 
        $inc: { safeboxStock: MONTHLY_TICKET_REWARD },
        $setOnInsert: {
          fleetSlot: 1,
          fleetSlotUsed: 0,
          fleetSlotLevel: 1,
          safeboxLevel: 1,
          fuelCapacity: 2000,
          fuelTankLevel: 1,
          fuelStock: 0,
          operational_cost: 0,
          status: "active",
          createdAt: now,
        }
      },
      { upsert: true }
    );

    // 4. Invalidate Cache Next.js & Vercel
    try {
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/currency");
      revalidatePath("/dashboard/garage");
      revalidatePath("/dashboard/nismaraplus");
    } catch (e) {
      console.error("Failed to revalidate paths:", e);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil mengeklaim ${MONTHLY_NC_REWARD.toLocaleString("id-ID")} NC dan ${MONTHLY_TICKET_REWARD} Tiket Penalti!` 
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      }
    });

  } catch (error: any) {
    console.error("NismaraPlus Claim Error:", error);

    // 🛡️ ROLLBACK: Jika gate terkunci namun mutasi saldo/tiket gagal
    if (isClaimLocked) {
      try {
        const session = await getServerSession(authOptions);
        if (session?.user?.discordId) {
          const client = await clientPromise;
          const db = client.db();
          await db.collection("users").updateOne(
            { discordId: session.user.discordId },
            { $set: { "nismaraplus.lastClaimAt": previousLastClaimAt } }
          );
        }
      } catch (rollbackErr) {
        console.error("Critical Rollback Error in NismaraPlus Claim:", rollbackErr);
      }
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
