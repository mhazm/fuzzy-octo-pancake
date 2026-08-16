import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { redirect } from "next/navigation";
import {
  Crown,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Award,
  Coins,
  Wrench,
  CalendarDays,
  Percent,
  Truck,
  ScrollText,
  AlertTriangle,
} from "lucide-react";
import DriverAccessBlocker from "@/components/DriverAccessBlocker";
import NismaraPlusClient from "./NismaraPlusClient";
import NismaraPlusClaimClient from "./NismaraPlusClaimClient";
import NismaraPlusOrder from "@/lib/models/NismaraPlusOrder";
import dbConnect from "@/lib/mongoose";

export const metadata = {
  title: "Nismaraplus",
};

export const dynamic = "force-dynamic";

// 💡 CONFIG DAFTAR BENEFIT (Sangat Mudah Di-extend Tinggal Tambah Baris Di Sini)
const PREMIUM_FEATURES = [
  {
    id: "nc-bonus",
    title: "Bonus Pendapatan NC",
    description:
      "Mendapatkan bonus tambahan Nismara Coin (NC) dari setiap lembar pekerjaan logistik yang Anda selesaikan.",
    icon: Coins,
    iconColor: "text-amber-400",
    bgColor: "bg-amber-400/10",
  },
  {
    id: "damage-reduction",
    title: "Potongan Biaya Kerusakan 30%",
    description:
      "Diskon setengah harga denda perbaikan jika armada atau kargo Anda mengalami crash/kerusakan selama trip.",
    icon: Wrench,
    iconColor: "text-red-400",
    bgColor: "bg-red-400/10",
  },
  {
    id: "monthly-nc",
    title: "Klaim Koin Bulanan (NC)",
    description:
      "Hak akses klaim gaji NC pasif berkala gratis setiap bulan langsung masuk ke dompet digital Anda.",
    icon: CalendarDays,
    iconColor: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
  },
  {
    id: "penalty-discount",
    title: "Diskon Poin Penalti 30%",
    description:
      "Mendapatkan pemotongan harga tebusan koin sebesar 30% saat melakukan pembersihan rekam jejak poin penalti buruk.",
    icon: Percent,
    iconColor: "text-blue-400",
    bgColor: "bg-blue-400/10",
  },
  {
    id: "fleet-discount",
    title: "Diskon Fleet Pembelian 20%",
    description:
      "Potongan harga khusus bagi pengemudi premium saat mengajukan penambahan/pembelian truk di menu manajemen fleet.",
    icon: Truck,
    iconColor: "text-indigo-400",
    bgColor: "bg-indigo-400/10",
  },
  {
    id: "insurance-discount",
    title: "Potongan Premi Asuransi 30%",
    description:
      "Biaya dasar pembelian baru maupun perpanjangan durasi jaminan asuransi armada dipotong sebesar 30% flat.",
    icon: ShieldCheck,
    iconColor: "text-purple-400",
    bgColor: "bg-purple-400/10",
  },
  {
    id: "exclusif-badge",
    title: "Badge Eksklusif Profil",
    description:
      "Penyematan lencana emas VIP spesial pada widget profil website utama dan perolehan role kustom di server Discord.",
    icon: Award,
    iconColor: "text-pink-400",
    bgColor: "bg-pink-400/10",
  },
  {
    id: "xp-multiplier",
    title: "Multiplier Bonus XP +20%",
    description:
      "Peningkatan rasio pemerolehan Experience Points (XP) sebesar 20% lebih melimpah untuk mempercepat kenaikan level supir.",
    icon: Zap,
    iconColor: "text-yellow-400",
    bgColor: "bg-yellow-400/10",
  },
];

export default async function NismaraPlusPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  if (!session.user?.isDriver || !session.user.driverData) {
    return <DriverAccessBlocker session={session} />;
  }

  const discordId = session.user.discordId || session.user.id;
  const client = await clientPromise;
  const db = client.db();

  const user = await db.collection("users").findOne({ discordId });
  const nismaraplus = user?.nismaraplus || {
    status: false,
    startedAt: null,
    expiredAt: null,
  };

  const now = new Date();
  const isExpired = nismaraplus.expiredAt
    ? new Date(nismaraplus.expiredAt) < now
    : true;
  const isActive = nismaraplus.status && !isExpired;

  await dbConnect();
  const pendingOrder = await NismaraPlusOrder.findOne({ discordId, status: "pending" });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <Crown className="text-amber-400 h-8 w-8 drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]" />
            Nismara<span className="text-primary font-black">Plus</span> Account
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Membuka potensi penuh pengalaman berkendara simulasi logistik
            premium Anda.
          </p>
        </div>
        {isActive && (
          <span className="bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-black px-4 py-2 rounded-full tracking-wider uppercase inline-flex items-center gap-2 self-start md:self-center">
            <Sparkles className="h-3.5 w-3.5" /> Premium Active
          </span>
        )}
      </div>

      {/* KONDISI 1: JIKA USER SUDAH AKTIF PREMIUM-NYA */}
      {isActive ? (
        <div className="space-y-8 animate-in fade-in duration-500">
          <NismaraPlusClaimClient
            lastClaimAt={
              nismaraplus.lastClaimAt
                ? new Date(nismaraplus.lastClaimAt).toISOString()
                : null
            }
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                <Sparkles className="text-amber-400" size={24} /> Benefit Aktif
                Anda
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PREMIUM_FEATURES.map((feature) => {
                  const IconComponent = feature.icon;
                  return (
                    <div
                      key={feature.id}
                      className="bg-card border border-amber-400/20 p-5 rounded-2xl shadow-sm space-y-2 hover:border-amber-400/50 transition-colors"
                    >
                      <div
                        className={`p-2.5 ${feature.bgColor} ${feature.iconColor} w-fit rounded-xl`}
                      >
                        <IconComponent size={20} />
                      </div>
                      <h3 className="font-bold text-foreground text-sm">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground text-xs leading-normal">
                        {feature.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-xl font-bold text-foreground tracking-tight">
                Status Keanggotaan
              </h2>
              <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
                <p className="text-muted-foreground text-sm leading-relaxed relative z-10">
                  Terima kasih atas kontribusi Anda! Status VIP Premium akun
                  Anda sedang aktif menikmati semua benefit eksklusif.
                </p>

                <div className="space-y-4 relative z-10">
                  <div className="bg-muted/40 p-4 rounded-xl border border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Tanggal Diaktifkan
                    </p>
                    <p className="text-base font-bold text-foreground mt-1">
                      {nismaraplus.startedAt
                        ? new Date(nismaraplus.startedAt).toLocaleDateString(
                            "id-ID",
                            { day: "numeric", month: "long", year: "numeric" },
                          )
                        : "-"}
                    </p>
                  </div>

                  <div className="bg-muted/40 p-4 rounded-xl border border-amber-400/30 bg-amber-400/5">
                    <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider">
                      Sisa Waktu
                    </p>
                    <h3 className="text-3xl font-black text-foreground mt-1 tracking-tight">
                      {Math.ceil(
                        (new Date(nismaraplus.expiredAt).getTime() -
                          now.getTime()) /
                          (1000 * 60 * 60 * 24),
                      )}
                      <span className="text-sm font-bold text-muted-foreground ml-1">
                        Hari Lagi
                      </span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2">
                      Berlaku hingga{" "}
                      {new Date(nismaraplus.expiredAt).toLocaleDateString(
                        "id-ID",
                        { day: "numeric", month: "short", year: "numeric" },
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* KONDISI 2: JIKA USER ADALAH USER BIASA (TAMPILKAN DAFTAR BENEFIT DINAMIS & TERMASUK SYARAT KETENTUAN) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* SISI KIRI: DAFTAR BENEFIT PREMIUM (EASY TO EXTEND) */}
          <div className="lg:col-span-7 space-y-6">
            <h2 className="text-xl font-bold text-foreground tracking-tight">
              Mengapa Harus Upgrade ke Nismara+?
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PREMIUM_FEATURES.map((feature) => {
                const IconComponent = feature.icon;
                return (
                  <div
                    key={feature.id}
                    className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-2 hover:border-border/80 transition-colors"
                  >
                    <div
                      className={`p-2.5 ${feature.bgColor} ${feature.iconColor} w-fit rounded-xl`}
                    >
                      <IconComponent size={20} />
                    </div>
                    <h3 className="font-bold text-foreground text-sm">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-xs leading-normal">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SISI KANAN: SYARAT KETENTUAN DAN KOTAK PEMBELIAN */}
          <div className="lg:col-span-5 space-y-6">
            {/* PANEL SYARAT & KETENTUAN */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-md">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <ScrollText className="text-primary h-5 w-5" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Syarat & Ketentuan
                </h3>
              </div>

              <div className="text-xs text-muted-foreground space-y-3 leading-relaxed">
                <p>
                  1. Seluruh kontribusi dari pembelian layanan{" "}
                  <strong>Nismara+</strong> murni akan dialokasikan penuh untuk
                  membiayai operasional pemeliharaan server serta infrastruktur
                  data <strong>Nismara Transport</strong>.
                </p>
                <p>
                  2. Sisa dana dari pemeliharaan server akan dikembalikan
                  seutuhnya kepada komunitas dalam bentuk penyediaan hadiah
                  (*giveaway*, piala, koin) saat pelaksanaan event resmi
                  berkendara bersama.
                </p>
                <p>
                  3. Pembayaran layanan ini bersifat final dan{" "}
                  <strong>TIDAK DAPAT DI-REFUND</strong> (dikembalikan) dalam
                  bentuk ataupun alasan apapun setelah text channel invoice
                  dibuat di server Discord.
                </p>
                <p>
                  4. Manajemen Nismara Group{" "}
                  <strong>tidak pernah memaksa</strong> seluruh supir untuk
                  membeli paket ini. Pendaftaran keanggotaan ini merupakan
                  bentuk kesadaran sukarela pengemudi yang ingin membantu
                  menyokong keberlangsungan perjalanan ekosistem komunitas
                  logistik simulasi virtual kami ke depannya.
                </p>
              </div>

              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-[11px] text-destructive flex items-start gap-2 leading-snug">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Dengan menekan tombol di bawah, Anda menyatakan mengerti dan
                  menyetujui seluruh ketentuan operasional komunitas di atas.
                </span>
              </div>
            </div>

            {/* BOX HARGA DAN TOMBOL TICKET FLOW */}
            <div className="lg:col-span-5 bg-card border border-border rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-32 bg-primary/10 rounded-full blur-3xl -z-10" />

              {nismaraplus.startedAt && isExpired && (
                <div className="bg-destructive/10 border border-red-500/15 text-destructive text-xs font-semibold py-2 px-3 rounded-lg mb-6">
                  ⚠️ Paket langganan Nismara+ Anda sebelumnya telah kedaluwarsa.
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  Akses Langganan Premium
                </h3>
                <p className="text-muted-foreground text-xs mt-1">
                  Dukungan keberlangsungan server simulasi.
                </p>
              </div>

              <ul className="text-left bg-muted/40 border border-border p-4 rounded-xl space-y-3 mb-6 text-xs text-muted-foreground font-medium">
                <li className="flex items-center gap-2 text-foreground">
                  <CheckCircle2
                    size={14}
                    className="text-emerald-500 shrink-0"
                  />{" "}
                  Kompatibel Seluruh Divisi (ETS2/ATS/MSFS)
                </li>
              </ul>

              {/* Komponen interaktif yang menampilkan paket dan tombol */}
              <NismaraPlusClient initialPendingOrder={pendingOrder ? JSON.parse(JSON.stringify(pendingOrder)) : null} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
