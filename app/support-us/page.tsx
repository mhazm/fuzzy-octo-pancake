import React from "react";
import { 
  Heart, 
  Coins, 
  Wrench, 
  CalendarDays, 
  Percent, 
  Truck, 
  ShieldCheck, 
  Award, 
  Zap, 
  ExternalLink,
  Crown,
  ArrowRight,
  TrendingUp,
  User as UserIcon
} from "lucide-react";
import Link from "next/link";

export const revalidate = 86400;

async function getLeaderboardData() {
  const streamKey = process.env.BAGIBAGI_STREAM_KEY;
  if (!streamKey) {
    // Return dummy data for showcase if stream key is not set
    return [
      { userName: "Hamba Allah", amount: 1500000, isVerified: true, isAnonymous: true },
      { userName: "Supir Lintas Jawa", amount: 750000, isVerified: true, isAnonymous: false },
      { userName: "Seseorang", amount: 300000, isVerified: false, isAnonymous: true },
      { userName: "Budi Santoso", amount: 150000, isVerified: true, isAnonymous: false },
      { userName: "Anonim", amount: 50000, isVerified: false, isAnonymous: true },
    ];
  }

  try {
    const res = await fetch(`https://bagibagi.co/api/partnerintegration/top-donator/streamkey?streamkey=${streamKey}`, {
      next: { revalidate: 60 } // Revalidate every minute
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.success ? json.data : [];
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error);
    return [];
  }
}

export default async function SupportUsPage() {
  const BAGIBAGI_LINK = "https://bagibagi.co/NismaraGroup";
  const leaderboardData = await getLeaderboardData();

  const nismaraPlusFeatures = [
    {
      title: "Bonus Pendapatan NC",
      description: "Mendapatkan bonus tambahan Nismara Coin (NC) dari setiap lembar pekerjaan logistik yang Anda selesaikan.",
      icon: <Coins size={24} />,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20"
    },
    {
      title: "Potongan Biaya Kerusakan 50%",
      description: "Diskon setengah harga denda perbaikan jika armada atau kargo Anda mengalami crash/kerusakan selama trip.",
      icon: <Wrench size={24} />,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20"
    },
    {
      title: "Klaim Koin Bulanan",
      description: "Hak akses klaim gaji NC pasif berkala gratis setiap bulan langsung masuk ke dompet digital Anda.",
      icon: <CalendarDays size={24} />,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20"
    },
    {
      title: "Diskon Poin Penalti 30%",
      description: "Mendapatkan pemotongan harga tebusan koin sebesar 30% saat melakukan pembersihan rekam jejak poin penalti buruk.",
      icon: <Percent size={24} />,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20"
    },
    {
      title: "Diskon Fleet Pembelian 20%",
      description: "Potongan harga khusus bagi pengemudi premium saat mengajukan penambahan atau pembelian armada.",
      icon: <Truck size={24} />,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
      borderColor: "border-indigo-500/20"
    },
    {
      title: "Potongan Premi Asuransi 30%",
      description: "Biaya dasar pembelian baru maupun perpanjangan durasi jaminan asuransi armada dipotong sebesar 30% flat.",
      icon: <ShieldCheck size={24} />,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20"
    },
    {
      title: "Badge Eksklusif Profil",
      description: "Penyematan lencana emas VIP spesial pada profil website utama dan perolehan role kustom di Discord.",
      icon: <Award size={24} />,
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
      borderColor: "border-pink-500/20"
    },
    {
      title: "Multiplier Bonus XP +20%",
      description: "Peningkatan rasio pemerolehan Experience Points (XP) sebesar 20% lebih melimpah untuk mempercepat kenaikan level.",
      icon: <Zap size={24} />,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/20"
    }
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-20">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-sky/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 pt-20 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        
        {/* Header Section */}
        <div className="text-center max-w-4xl mx-auto mb-16 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold uppercase tracking-widest text-xs mb-4">
            <Heart size={14} className="fill-current animate-pulse" />
            Dukung Nismara Logistics
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic text-foreground leading-tight">
            Support Our <br className="hidden md:block" /> <span className="text-gradient">Journey</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            Bantu kami menjaga server tetap hidup secara sukarela. Setiap dukungan yang Anda berikan 100% dialokasikan untuk biaya operasional bulanan server dan website agar komunitas kita terus berkembang.
          </p>

          <div className="pt-6">
            <a 
              href={BAGIBAGI_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-sm transition-all shadow-xl hover:shadow-primary/30 hover:-translate-y-1"
            >
              <Heart size={18} className="fill-current animate-pulse" /> Berikan Dukungan via Bagibagi.co <ExternalLink size={18} />
            </a>
          </div>
        </div>

        {/* Leaderboard Section */}
        <div className="max-w-3xl mx-auto mb-32">
          <div className="glass-panel p-8 rounded-[2rem] border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="flex items-center gap-3 mb-8 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                <TrendingUp size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-widest text-foreground">Top Donatur</h2>
                <p className="text-sm text-muted-foreground font-medium">Terima kasih atas kontribusi luar biasa Anda!</p>
              </div>
            </div>

            <div className="space-y-4 relative z-10">
              {leaderboardData.length > 0 ? leaderboardData.map((user: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${
                      index === 0 ? 'bg-amber-500 text-amber-950 shadow-lg shadow-amber-500/20' : 
                      index === 1 ? 'bg-slate-300 text-slate-800' : 
                      index === 2 ? 'bg-orange-700 text-orange-100' : 
                      'bg-muted-foreground/20 text-muted-foreground'
                    }`}>
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        {user.userName}
                        {user.isVerified && <ShieldCheck size={14} className="text-emerald-500" />}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user.isAnonymous ? "Anonim" : "Pemain"}
                      </div>
                    </div>
                  </div>
                  <div className="font-black text-primary">
                    Rp {user.amount.toLocaleString("id-ID")}
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground font-medium">
                  Belum ada data donatur saat ini. Jadilah yang pertama!
                </div>
              )}
            </div>
            
            {!process.env.BAGIBAGI_STREAM_KEY && (
              <p className="text-[10px] text-muted-foreground/50 text-center mt-6">
                *Data ini adalah ilustrasi karena Stream Key Bagibagi belum diatur.
              </p>
            )}
          </div>
        </div>

        {/* Nismara+ Upsell Section */}
        <div className="max-w-6xl mx-auto mb-32">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black uppercase tracking-widest mb-4">Ingin Benefit Ekstra?</h2>
            <p className="text-muted-foreground text-base max-w-2xl mx-auto">
              Bagi Anda yang ingin mendapatkan keuntungan di dalam game, kami juga menyediakan layanan berlangganan <strong>Nismara+</strong> dan <strong>Discord Server Booster</strong>!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {nismaraPlusFeatures.slice(0, 4).map((feature, index) => (
              <div 
                key={index}
                className="glass-panel p-6 rounded-[2rem] hover:-translate-y-1 transition-all duration-300 group hover:border-primary/50 flex flex-col h-full"
              >
                <div className={`w-12 h-12 rounded-2xl ${feature.bgColor} ${feature.color} flex items-center justify-center mb-5 border ${feature.borderColor} group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="font-black uppercase tracking-wider text-sm mb-3 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed flex-1">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <Link 
              href="/dashboard/nismaraplus"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-card border border-primary/30 hover:bg-primary/10 text-primary font-bold uppercase tracking-widest text-xs transition-colors"
            >
              Lihat Seluruh Fitur Nismara+ <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Other Support Methods */}
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-2xl font-black uppercase tracking-widest mb-6">Cara Lain Mendukung Kami</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Link href="/dashboard" className="glass-panel p-6 rounded-2xl group hover:border-primary/50 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-4 text-left">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UserIcon size={20} />
                </div>
                <div>
                  <h4 className="font-bold uppercase tracking-wider text-sm mb-1 group-hover:text-primary transition-colors">Aktif Bermain</h4>
                  <p className="text-xs text-muted-foreground">Selesaikan rute dan ramaikan server</p>
                </div>
              </div>
              <ArrowRight className="text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1" />
            </Link>
            <a href="https://discord.gg/nismara" target="_blank" rel="noopener noreferrer" className="glass-panel p-6 rounded-2xl group hover:border-accent-sky/50 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-4 text-left">
                <div className="w-10 h-10 rounded-xl bg-accent-sky/10 text-accent-sky flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Crown size={20} />
                </div>
                <div>
                  <h4 className="font-bold uppercase tracking-wider text-sm mb-1 group-hover:text-accent-sky transition-colors">Ajak Teman</h4>
                  <p className="text-xs text-muted-foreground">Undang teman ke Discord Nismara</p>
                </div>
              </div>
              <ArrowRight className="text-muted-foreground group-hover:text-accent-sky transition-colors group-hover:translate-x-1" />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
