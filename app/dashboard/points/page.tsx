import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getUserPointsData, getEligibleJobsForValidation } from "./actions";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import PenaltyClientUI from "./PenaltyClientUI";
import Link from "next/link";
import { ShieldAlert, ArrowRight } from "lucide-react";

interface HistoryItem {
  _id: string;
  points: number;
  reason: string;
  type: "add" | "remove";
  createdAt: string | Date;
}

export const metadata = {
  title: "Poin & Penalti | Nismara Logistics",
  description: "Pantau dan kelola poin penalti Anda di Nismara Logistics.",
};

export default async function PointsPage() {
  const session = await getServerSession(authOptions);

  // Pastikan Anda mengambil discordId, sesuai dengan konfigurasi NextAuth Anda
  const userId = session?.user?.discordId;

  if (!userId) {
    redirect("/login");
  }

  if (!session.user?.isDriver || !session.user.driverData) {
    return (
      <main className="min-h-[80vh] w-full flex items-center justify-center p-6 bg-(-background)">
        <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-700">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full" />
            <div className="relative w-24 h-24 bg-card border border-red-500/30 text-red-500 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl">
              <ShieldAlert size={48} />
            </div>
          </div>
          <div className="space-y-3">
            <h2 className="text-4xl font-black text-(-primary-foreground) uppercase tracking-tighter">
              Akses <span className="text-red-500">Ditolak</span>
            </h2>
            <p className="text-foreground/50 font-medium leading-relaxed">
              Kamu belum terdaftar sebagai pengemudi resmi Nismara Logistics.
              Fitur manage point penalty hanya tersedia untuk anggota aktif.
            </p>
          </div>
          <div className="flex flex-col gap-4 items-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-3 px-10 py-4 bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-primary/80 transition-all shadow-lg shadow-primary/20"
            >
              Daftar Sekarang <ArrowRight size={14} />
            </Link>
            <Link
              href="/"
              className="text-[10px] font-bold text-foreground/20 uppercase tracking-widest hover:text-foreground/50 transition-colors"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </main>
    );
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
        Pantau poin penalti Anda di Nismara Logistics. Poin yang melewati batas
        maksimal dapat mengakibatkan sanksi. Anda dapat menebus poin penalti
        menggunakan Nismara Coin (NC).
      </p>

      {/* Melempar data ke Client Component agar UI bisa interaktif */}
      <PenaltyClientUI
        initialPoints={data.totalPoints}
        totalNC={data.totalNC}
        pointPrice={data.pointPrice}
        discountBooster={data.discountBooster} // ---> Tambahkan prop ini
        history={data.history as HistoryItem[]}
        eligibleJobs={eligibleJobs}
      />
    </div>
  );
}
