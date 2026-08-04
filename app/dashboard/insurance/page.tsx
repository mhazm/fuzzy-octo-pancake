import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { redirect } from "next/navigation";
import DriverAccessBlocker from "@/components/DriverAccessBlocker";
import BuyInsuranceButton from "./BuyInsuranceButton";
import {
  ShieldAlert,
  ArrowRight,
  Lock,
  Calendar,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function InsurancePage() {
  const session = await getServerSession(authOptions);

  // 1. Proteksi Login
  if (!session) {
    redirect("/login");
  }

  // 2. Proteksi Akses Driver
  if (!session.user?.isDriver || !session.user.driverData) {
    return <DriverAccessBlocker session={session} />;
  }

  const discordId = session.user.discordId || session.user.id;
  const client = await clientPromise;
  const db = client.db();

  // 3. Fetch Data Pengedar & Log Klaim
  const user = await db.collection("users").findOne({ discordId });
  const claims = await db
    .collection("insuranceclaimhistories")
    .find({ discordId })
    .sort({ createdAt: -1 })
    .limit(15)
    .toArray();

  const insurance = user?.insurance || {
    status: false,
    rating: 100,
    startedAt: null,
    expiredAt: null,
  };

  const now = new Date();
  const isExpired = insurance.expiredAt
    ? new Date(insurance.expiredAt) < now
    : true;
  const isActive = insurance.status && !isExpired;

  // 4. Hitung dynamic usage (Mingguan & Bulanan)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

  // Filter klaim mingguan & bulanan
  const weeklyClaims = claims.filter(
    (c) => new Date(c.createdAt) >= oneWeekAgo,
  );
  const monthlyClaims = claims.filter(
    (c) => new Date(c.createdAt) >= oneMonthAgo,
  );

  const weeklyUsed = weeklyClaims.reduce(
    (acc, curr) => acc + (curr.claimAmount || 0),
    0,
  );
  const monthlyUsed = monthlyClaims.reduce(
    (acc, curr) => acc + (curr.claimAmount || 0),
    0,
  );

  // Konfigurasi Batas/Limit Klaim Aman (Sesuai Threshhold Rating Drop Anda)
  const WEEKLY_LIMIT = 5000;
  const MONTHLY_LIMIT = 20000; // Akumulasi 4 minggu aman

  // Hitung persentase penggunaan
  const weeklyPercentage = Math.min(
    Math.round((weeklyUsed / WEEKLY_LIMIT) * 100),
    100,
  );
  const monthlyPercentage = Math.min(
    Math.round((monthlyUsed / MONTHLY_LIMIT) * 100),
    100,
  );

  // Kalkulasi harga dinamis di UI jika mau beli
  const isBooster = (session.user as any)?.isBooster;
  const BASE_PRICE = 5000;
  const currentRating = insurance.rating ?? 100;
  let currentPrice = BASE_PRICE + (100 - currentRating) * 50;
  const originalPrice = currentPrice;

  if (isBooster) {
    currentPrice = Math.floor(currentPrice * 0.7);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
          <ShieldCheck className="text-primary h-8 w-8" />
          Nismara Insurance
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Pantau status risiko berkendara dan penggunaan kuota klaim jaminan
          kerusakan kargo Anda.
        </p>
      </div>

      {/* KONDISI A: TIDAK AKTIF ATAU EXPIRED */}
      {!isActive ? (
        <div className="bg-card border border-border rounded-2xl p-8 max-w-md mx-auto text-center shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -z-10" />

          {isExpired && insurance.startedAt && (
            <div className="bg-destructive/10 border border-red-500/20 text-destructive text-xs font-semibold py-2 px-3 rounded-lg mb-6 flex items-center justify-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Masa berlaku asuransi Anda
              telah berakhir.
            </div>
          )}

          <h2 className="text-xl font-bold text-foreground">Proteksi Armada</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Aktifkan Asuransi untuk proteksi dari denda kerusakan selama
            pengiriman barang. Asuransi dapat mengkompensasi denda kerusakaan
            sebanyak 40% dari denda kerusakaan disetiap pekerjaan anda. Proteksi
            berlaku selama 30 hari
          </p>

          <div className="my-6">
            <span className="text-5xl font-black text-primary">
              {currentPrice.toLocaleString("id-ID")}
            </span>
            <span className="text-lg text-muted-foreground font-bold ml-2">
              NC
            </span>
          </div>

          <div className="bg-muted/50 border border-border p-4 rounded-xl mb-6 text-left text-sm space-y-2">
            <div className="flex justify-between text-muted-foreground">
              <span>Harga Dasar Paket (30 Hari):</span>
              <span className="font-medium text-foreground">
                {BASE_PRICE.toLocaleString()} NC
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Penyesuaian Risiko Risk ({currentRating}/100):</span>
              <span
                className={`font-semibold ${currentRating < 100 ? "text-destructive" : "text-emerald-500"}`}
              >
                +{((100 - currentRating) * 50).toLocaleString()} NC
              </span>
            </div>
            {isBooster && (
              <div className="flex justify-between text-emerald-500 font-bold border-t border-border pt-3 mt-1">
                <span>Diskon Server Booster (30%):</span>
                <span>
                  -{Math.floor(originalPrice * 0.3).toLocaleString()} NC
                </span>
              </div>
            )}
          </div>

          <BuyInsuranceButton price={currentPrice} />
        </div>
      ) : (
        /* KONDISI B: ASURANSI AKTIF */
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* 1. Baris Informasi Utama & Rating */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex items-start gap-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status Polis
                </p>
                <p className="text-2xl font-black text-emerald-500 mt-1">
                  AKTIF
                </p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Hingga:{" "}
                  {insurance.expiredAt
                    ? new Date(insurance.expiredAt).toLocaleDateString("id-ID")
                    : "-"}
                </p>
                <div className="mt-5">
                  <BuyInsuranceButton price={currentPrice} isExtend={true} />
                </div>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex items-start gap-4 md:col-span-2">
              <div className="p-3 bg-primary/10 text-primary rounded-xl">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-baseline">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Risk Score Pengemudi
                  </p>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${currentRating >= 80 ? "bg-emerald-500/10 text-emerald-500" : currentRating >= 50 ? "bg-yellow-500/10 text-yellow-500" : "bg-destructive/10 text-destructive"}`}
                  >
                    {currentRating >= 80
                      ? "Aman"
                      : currentRating >= 50
                        ? "Waspada"
                        : "Bahaya"}
                  </span>
                </div>
                <div className="flex items-end gap-1 mt-1">
                  <p className="text-3xl font-black tracking-tight">
                    {currentRating}
                  </p>
                  <span className="text-muted-foreground font-semibold text-sm mb-1">
                    / 100 Poin
                  </span>
                </div>
                <div className="w-full bg-muted h-2 mt-2 rounded-full overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${currentRating >= 80 ? "bg-emerald-500" : currentRating >= 50 ? "bg-yellow-500" : "bg-destructive"}`}
                    style={{ width: `${currentRating}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. INFORMASI USAGE (Klaim Mingguan & Bulanan sebelum Table) */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground tracking-tight">
              Akumulasi Batas Klaim Kuota
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Batas Mingguan */}
              <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    Batas Klaim Minggu Ini
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {weeklyPercentage}% Terpakai
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <div className="text-xl font-black text-foreground">
                    {weeklyUsed.toLocaleString("id-ID")}{" "}
                    <span className="text-xs text-muted-foreground font-normal">
                      / {WEEKLY_LIMIT.toLocaleString("id-ID")} NC
                    </span>
                  </div>
                </div>
                <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${weeklyPercentage >= 100 ? "bg-destructive" : weeklyPercentage >= 75 ? "bg-yellow-500" : "bg-primary"}`}
                    style={{ width: `${weeklyPercentage}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  *Jika penggunaan melebihi{" "}
                  <strong>{WEEKLY_LIMIT.toLocaleString()} NC</strong> dalam
                  seminggu, Risk Score pengemudi akan otomatis berkurang pada
                  hari Minggu malam.
                </p>
              </div>

              {/* Batas Bulanan */}
              <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Batas Klaim Bulan Ini
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {monthlyPercentage}% Terpakai
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <div className="text-xl font-black text-foreground">
                    {monthlyUsed.toLocaleString("id-ID")}{" "}
                    <span className="text-xs text-muted-foreground font-normal">
                      / {MONTHLY_LIMIT.toLocaleString("id-ID")} NC
                    </span>
                  </div>
                </div>
                <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${monthlyPercentage >= 100 ? "bg-destructive" : "bg-blue-500"}`}
                    style={{ width: `${monthlyPercentage}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  *Estimasi akumulasi kuota keamanan berkendara jangka panjang
                  bulanan Anda untuk menahan lonjakan penalti denda berat.
                </p>
              </div>
            </div>
          </div>

          {/* 3. TABEL RIWAYAT KLAIM */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-base font-bold text-foreground">
                Riwayat Klaim Kerusakan (Damage Logs)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-muted-foreground">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Job ID</th>
                    <th className="px-6 py-4">Keterangan Kerusakan</th>
                    <th className="px-6 py-4">Denda Truk/Kargo</th>
                    <th className="px-6 py-4 text-right">
                      Ditanggung Asuransi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {claims.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-muted-foreground/60"
                      >
                        <p className="text-base">🚛</p>
                        <p className="text-xs mt-1">
                          Belum ada riwayat kecelakaan atau klaim denda kargo.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    claims.map((claim) => (
                      <tr
                        key={claim._id.toString()}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground">
                          {new Date(claim.createdAt).toLocaleDateString(
                            "id-ID",
                          )}
                        </td>
                        <td className="px-6 py-4 text-primary font-bold">
                          #{claim.jobId}
                        </td>
                        <td className="px-6 py-4 font-medium max-w-[200px] truncate">
                          {claim.claimReason}
                        </td>
                        <td className="px-6 py-4 text-destructive/70 font-medium line-through">
                          {claim.realCost.toLocaleString("id-ID")} NC
                        </td>
                        <td className="px-6 py-4 font-black text-emerald-500 text-right">
                          {claim.claimAmount.toLocaleString("id-ID")} NC
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
