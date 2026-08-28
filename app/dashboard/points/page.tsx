import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getUserPointsData, getEligibleJobsForValidation } from "./actions";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import PenaltyClientUI from "./PenaltyClientUI";
import Link from "next/link";
import { ShieldAlert, ArrowRight } from "lucide-react";
import DriverAccessBlocker from "@/components/DriverAccessBlocker";

interface HistoryItem {
  _id: string;
  points: number;
  reason: string;
  type: "add" | "remove";
  createdAt: string | Date;
}

export const metadata = {
  title: "Poin & Penalti",
  description: "Pantau dan kelola poin penalti Anda di Nismara Transport.",
};

export default async function PointsPage() {
  const session = await getServerSession(authOptions);

  // Pastikan Anda mengambil discordId, sesuai dengan konfigurasi NextAuth Anda
  const userId = session?.user?.discordId;

  if (!userId) {
    redirect("/login");
  }

  if (!session.user?.isDriver || !session.user.driverData) {
    return <DriverAccessBlocker session={session} />;
  }

  // Mengambil data dari database
  const data = await getUserPointsData(String(userId));
  const eligibleJobs = await getEligibleJobsForValidation(String(userId));

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Sistem Poin & Penalti
        </h2>
      </div>

      <p className="text-muted-foreground max-w-3xl">
        Pantau poin penalti Anda di Nismara Transport. Poin yang melewati batas
        maksimal dapat mengakibatkan sanksi. Anda dapat menebus poin penalti
        menggunakan Nismara Coin (NC).
      </p>

      {/* Melempar data ke Client Component agar UI bisa interaktif */}
      <PenaltyClientUI
        initialPoints={data.totalPoints}
        totalNC={data.totalNC}
        pointPrice={data.pointPrice}
        discountBooster={data.discountBooster}
        totalPenaltyTickets={data.totalPenaltyTickets}
        maxPenaltyTickets={data.maxPenaltyTickets}
        history={data.history as HistoryItem[]}
        eligibleJobs={eligibleJobs}
      />
    </div>
  );
}
