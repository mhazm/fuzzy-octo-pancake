import React from "react";
import Image from "next/image";
import clientPromise from "@/lib/mongodb";
import CouponClientCard from "./CouponClientCard";

export const metadata = {
  title: "Coupons",
};

export const revalidate = 300;

// 1. Definisikan Tipe Data (Berdasarkan JSON nismara_db.couponhistories)
interface DriverClaim {
  driverId: string;
  ncAmount: number;
  claimedAt: Date | string;
}

interface Coupon {
  _id: string;
  guildId: string;
  nameCoupon: string;
  codeCoupon: string;
  minAmount: number;
  maxAmount: number;
  totalNcClaimed: number;
  imageUrl: string | null;
  setBy: string;
  startDate: Date | string;
  endDate: Date | string;
  durationDays: number;
  driverClaims: DriverClaim[];
  isActive: boolean; // Field tambahan untuk membedakan status
}

// 2. Fungsi Fetch Data dari MongoDB
async function getCouponsData(): Promise<{
  active: Coupon[];
  history: Coupon[];
}> {
  try {
    const client = await clientPromise;
    const db = client.db(); // Menggunakan database default dari MONGODB_URI

    // Fetch active coupons
    const activeRaw = await db
      .collection("coupons")
      .find({})
      .sort({ startDate: -1 })
      .toArray();

    // Fetch history coupons
    const historyRaw = await db
      .collection("couponhistories")
      .find({})
      .sort({ endDate: -1 })
      .toArray();

    const parseDate = (d: any) => {
      if (!d) return new Date().toISOString();
      if (d.$date) return new Date(d.$date).toISOString();
      return new Date(d).toISOString();
    };

    const active: Coupon[] = activeRaw.map((doc) => ({
      _id: doc._id.toString(),
      guildId: doc.guildId,
      nameCoupon: doc.nameCoupon,
      codeCoupon: doc.codeCoupon,
      minAmount: doc.minAmount,
      maxAmount: doc.maxAmount,
      totalNcClaimed: doc.totalNcClaimed || 0,
      imageUrl: doc.imageUrl || null,
      setBy: doc.setBy,
      startDate: parseDate(doc.startDate),
      endDate: parseDate(doc.endDate),
      durationDays: doc.durationDays || 0,
      driverClaims: doc.driverClaims || [],
      isActive: true,
    }));

    const history: Coupon[] = historyRaw.map((doc) => ({
      _id: doc._id.toString(),
      guildId: doc.guildId,
      nameCoupon: doc.nameCoupon,
      codeCoupon: doc.codeCoupon,
      minAmount: doc.minAmount,
      maxAmount: doc.maxAmount,
      totalNcClaimed: doc.totalNcClaimed || 0,
      imageUrl: doc.imageUrl || null,
      setBy: doc.setBy,
      startDate: parseDate(doc.startDate),
      endDate: parseDate(doc.endDate),
      durationDays: doc.durationDays || 0,
      driverClaims: doc.driverClaims || [],
      isActive: false,
    }));

    return { active, history };
  } catch (error) {
    console.error("Failed to fetch coupons:", error);
    return { active: [], history: [] };
  }
}

// 3. Helper untuk memformat tanggal
const formatDate = (dateString: string | Date) => {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
};

// 5. Komponen Halaman Utama
export default async function CouponsPage() {
  // Ambil data (Server-side)
  const { active, history } = await getCouponsData();

  return (
    <main className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent-sky/10 rounded-full blur-[120px] -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        <header className="mb-16 text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4 tracking-tight">
            Sistem Kupon{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-accent-sky">
              Nismara
            </span>
          </h1>
          <p className="text-lg text-foreground/60 leading-relaxed">
            Kelola dan pantau kupon Nismara Coin (NC) yang sedang berjalan
            maupun riwayat sebelumnya dalam ekosistem logistik virtual kami.
          </p>
        </header>

        {/* Section Kupon Aktif */}
        <section className="mb-20">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-3xl font-bold text-foreground tracking-tight">
              Kupon Aktif
            </h2>
            <div className="h-1 flex-1 bg-linear-to-r from-green-500/50 to-transparent rounded-full" />
          </div>
          {active.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {active.map((coupon) => (
                <CouponClientCard key={coupon._id} coupon={coupon} />
              ))}
            </div>
          ) : (
            <div className="bg-card/30 backdrop-blur-sm rounded-2xl p-12 text-center border border-border border-dashed">
              <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                <span className="text-2xl opacity-50">🎫</span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                Tidak Ada Kupon Aktif
              </h3>
              <p className="text-foreground/50">
                Saat ini belum ada kupon spesial yang sedang berlangsung. Pantau
                terus Discord Nismara!
              </p>
            </div>
          )}
        </section>

        {/* Section Riwayat Kupon */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-3xl font-bold text-foreground tracking-tight">
              Riwayat Kupon
            </h2>
            <div className="h-1 flex-1 bg-linear-to-r from-border to-transparent rounded-full" />
          </div>
          {history.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.map((coupon) => (
                <CouponClientCard key={coupon._id} coupon={coupon} />
              ))}
            </div>
          ) : (
            <div className="bg-card/30 backdrop-blur-sm rounded-2xl p-12 text-center border border-border border-dashed">
              <p className="text-foreground/50">Belum ada riwayat kupon.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
