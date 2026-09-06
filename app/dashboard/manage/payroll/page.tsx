import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import dbConnect from "@/lib/mongoose";
import ManagerSalaryRecord from "@/lib/models/ManagerSalaryRecord";
import {
  calculateManagerPerformance,
  getCurrentAndPreviousMonthWib,
  MILESTONE_TIERS,
} from "@/lib/managerSalary";
import PayrollClient from "./PayrollClient";

export const metadata = {
  title: "Manager Payroll & Performance - Manager Portal",
  description: "Sistem gaji bulanan dan insentif performa berbasis pencapaian KPI Nismara Transport.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function ManagerPayrollPage() {
  const session = await getServerSession(authOptions);

  const isManager =
    session?.user?.role === "manager" || session?.user?.role === "admin";

  if (!session || !isManager) {
    redirect("/dashboard");
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
      record: JSON.parse(JSON.stringify(prevClaimRecord)),
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
  const historyRecordsRaw = await ManagerSalaryRecord.find({
    managerId: discordId,
    status: "CLAIMED",
  })
    .sort({ month: -1 })
    .lean();

  const historyRecords = JSON.parse(JSON.stringify(historyRecordsRaw));

  const initialData = {
    currentMonth,
    previousMonth,
    currentMonthPerf,
    previousMonthData,
    historyRecords,
    milestoneTiers: MILESTONE_TIERS,
  };

  const currentUser = {
    name: session.user.name || "Manager",
    discordId: String(session.user.discordId),
    role: session.user.role,
    image: session.user.image || null,
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <PayrollClient initialData={initialData} currentUser={currentUser} />
    </div>
  );
}
