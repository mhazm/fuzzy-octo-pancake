import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongoose";
import ManagerSalaryRecord from "@/lib/models/ManagerSalaryRecord";
import {
  calculateManagerPerformance,
  getCurrentAndPreviousMonthWib,
  MILESTONE_TIERS,
} from "@/lib/managerSalary";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0, s-maxage=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user.role !== "manager" && session.user.role !== "admin")) {
      return NextResponse.json(
        { error: "Unauthorized. Akses khusus Manager & Admin." },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    await dbConnect();
    const discordId = String(session.user.discordId);
    const { currentMonth, previousMonth } = getCurrentAndPreviousMonthWib();

    // 1. Live KPI Performance untuk bulan berjalan (Real-time Tracker)
    const currentMonthPerf = await calculateManagerPerformance(discordId, currentMonth);

    // 2. Status Gaji Bulan Lalu (Siap Klaim atau Sudah Diklaim)
    const prevClaimRecord = await ManagerSalaryRecord.findOne({
      month: previousMonth,
      managerId: discordId,
    }).lean();

    let previousMonthData: any = null;
    if (prevClaimRecord && prevClaimRecord.status === "CLAIMED") {
      previousMonthData = {
        month: previousMonth,
        isClaimed: true,
        record: prevClaimRecord,
      };
    } else {
      // Belum diklaim, hitung hak performanya
      const prevPerf = await calculateManagerPerformance(discordId, previousMonth);
      previousMonthData = {
        month: previousMonth,
        isClaimed: false,
        performance: prevPerf,
      };
    }

    // 3. Riwayat Slip Gaji Masa Lalu
    const historyRecords = await ManagerSalaryRecord.find({
      managerId: discordId,
      status: "CLAIMED",
    })
      .sort({ month: -1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        currentMonth,
        previousMonth,
        currentMonthPerf,
        previousMonthData,
        historyRecords,
        milestoneTiers: MILESTONE_TIERS,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error("GET /api/manage/payroll Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
