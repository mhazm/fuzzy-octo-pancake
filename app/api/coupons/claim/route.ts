import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const discordId = session.user.discordId;

    // Check if user is a driver
    if (!session.user.isDriver || !session.user.driverData) {
      return NextResponse.json({ error: "Hanya Pengemudi (Driver) Nismara yang bisa mengeklaim kupon." }, { status: 403 });
    }

    const driverId = session.user.driverData.truckyId 
      ? String(session.user.driverData.truckyId) 
      : String(discordId);

    const body = await request.json();
    const { codeCoupon } = body;

    if (typeof codeCoupon !== "string" || !codeCoupon) {
      return NextResponse.json({ error: "Kode kupon tidak valid." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Find the coupon first to get min/max amount and validate expiration
    const coupon = await db.collection("coupons").findOne({
      codeCoupon: { $regex: new RegExp(`^${codeCoupon}$`, "i") },
      isActive: true,
    });

    if (!coupon) {
      return NextResponse.json({ error: "Kupon tidak ditemukan atau sudah tidak aktif." }, { status: 404 });
    }

    // Check expiration
    const now = new Date();
    const endDate = new Date(coupon.endDate);
    if (now > endDate) {
      return NextResponse.json({ error: "Kupon sudah kedaluwarsa." }, { status: 400 });
    }

    // Calculate Reward first
    let rewardAmount = 0;
    let rewardText = "";

    if (coupon.type === "NC") {
      const raw = Math.floor(Math.random() * (coupon.maxAmount - coupon.minAmount + 1)) + coupon.minAmount;
      rewardAmount = Math.round(raw / 1000) * 1000;
      rewardText = `${rewardAmount.toLocaleString("id-ID")} NC`;
    } else if (coupon.type === "PENALTY_TICKET") {
      rewardAmount = Math.floor(Math.random() * (coupon.maxAmount - coupon.minAmount + 1)) + coupon.minAmount;
      rewardText = `${rewardAmount} Tiket Hapus Penalti`;
    } else {
      return NextResponse.json({ error: "Tipe kupon tidak didukung." }, { status: 400 });
    }

    // Prepare Claim Record
    const claimRecord = {
      discordId,
      driverId,
      amount: rewardAmount,
      claimedAt: now,
    };

    const updateQuery: any = {
      $push: { driverClaims: claimRecord },
    };

    if (coupon.type === "NC") {
      updateQuery.$inc = { totalNcClaimed: rewardAmount };
    }

    // ==========================================
    // 🛡️ ATOMIC UPDATE (GATES AGAINST RACE CONDITIONS)
    // Only updates if discordId is NOT already in the driverClaims array
    // ==========================================
    const claimResult = await db.collection("coupons").updateOne(
      { 
        _id: coupon._id,
        "driverClaims.discordId": { $ne: discordId } 
      },
      updateQuery
    );

    if (claimResult.modifiedCount === 0) {
      // Either already claimed, or coupon was deleted/inactivated exactly now
      return NextResponse.json({ error: "Anda sudah mengeklaim kupon ini sebelumnya atau kupon sudah tidak valid!" }, { status: 400 });
    }

    // ==========================================
    // SEKARANG BARU BERIKAN HADIAH KE USER
    // ==========================================
    if (coupon.type === "NC") {
      await db.collection("currencies").updateOne(
        { userId: discordId, guildId: "863959415702028318" },
        { $inc: { totalNC: rewardAmount } },
        { upsert: true }
      );

      await db.collection("currencyhistories").insertOne({
        guildId: "863959415702028318",
        userId: discordId,
        amount: rewardAmount,
        type: "earn",
        reason: `Klaim Kupon: ${coupon.nameCoupon} (${coupon.codeCoupon})`,
        createdAt: new Date(),
        updatedAt: new Date(),
        __v: 0,
      });

    } else if (coupon.type === "PENALTY_TICKET") {
      await db.collection("garages").updateOne(
        { discordId },
        { $inc: { safeboxStock: rewardAmount } },
        { upsert: true }
      );
    }

    return NextResponse.json({ 
      success: true, 
      rewardText, 
      type: coupon.type 
    });

  } catch (error: any) {
    console.error("Claim Coupon Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
