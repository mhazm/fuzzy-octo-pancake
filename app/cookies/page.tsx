

import React from "react";
import {
  Cookie,
  Info,
  Settings,
  ShieldCheck,
  MousePointer2,
  RefreshCcw,
  ToggleRight,
  EyeOff,
} from "lucide-react";

export const metadata = {
  title: "Cookie Policy",
  description: "Kebijakan penggunaan cookies di Nismara Transport.",
};

export const revalidate = 86400;

export default function CookiePolicy() {
  const lastUpdated = "07 Mei 2026";

  const cookieTypes = [
    {
      icon: <ShieldCheck size={24} />,
      title: "Essential Cookies",
      description:
        "Cookie ini mutlak diperlukan agar website berfungsi. Digunakan untuk sistem login (session) dan keamanan perlindungan CSRF.",
      status: "Always Active",
      color: "text-emerald-500",
      bg: "bg-emerald-500/5",
    },
    {
      icon: <Settings size={24} />,
      title: "Functional Cookies",
      description:
        "Digunakan untuk mengingat preferensi Anda, seperti pilihan tema (Dark/Light mode) dan pengaturan bahasa di dashboard.",
      status: "Active",
      color: "text-accent-lilac",
      bg: "bg-accent-lilac/5",
    },
    {
      icon: <MousePointer2 size={24} />,
      title: "Analytics Cookies",
      description:
        "Membantu kami memahami bagaimana driver berinteraksi dengan dashboard agar kami bisa meningkatkan performa UI/UX.",
      status: "Optional",
      color: "text-accent-sky",
      bg: "bg-accent-sky/5",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-12 pb-24 animate-in fade-in duration-700">
      {/* HEADER SECTION */}
      <div className="flex flex-col items-center text-center space-y-4 pt-16">
        <div className="p-4 bg-accent-lilac/10 rounded-[2rem] text-accent-lilac mb-4 animate-bounce">
          <Cookie size={40} />
        </div>
        <h1 className="text-6xl font-black text-(-primary-foreground) tracking-tighter uppercase italic leading-none">
          Cookie <span className="text-accent-lilac">Policy</span>
        </h1>
        <p className="text-foreground/40 font-bold uppercase text-xs tracking-[0.3em]">
          Operational Transparency • Last Updated: {lastUpdated}
        </p>
      </div>

      {/* INTRODUCTION BLOCK */}
      <div className="bg-card border border-border rounded-[3rem] p-10 flex flex-col md:flex-row items-center gap-10 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-lilac/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="flex-1 space-y-4 relative z-10 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/5 text-[10px] font-black uppercase text-foreground/30">
            <Info size={12} /> What are cookies?
          </div>
          <h2 className="text-3xl font-black text-(-primary-foreground) uppercase italic leading-tight">
            Meningkatkan Pengalaman <br /> Navigasi Digital Anda.
          </h2>
          <p className="text-foreground/50 font-medium leading-relaxed">
            Nismara Transport menggunakan cookie untuk memastikan dashboard
            logistik kami berjalan dengan lancar. Cookie adalah file teks kecil
            yang disimpan di perangkat Anda untuk membantu kami memberikan
            layanan yang lebih personal dan aman.
          </p>
        </div>
        <div className="hidden md:grid grid-cols-2 gap-4 w-full max-w-[300px]">
          <div className="h-20 bg-white/5 rounded-2xl border border-white/5 animate-pulse" />
          <div className="h-20 bg-accent-lilac/10 rounded-2xl border border-accent-lilac/20" />
          <div className="h-20 bg-white/5 rounded-2xl border border-white/5" />
          <div className="h-20 bg-white/5 rounded-2xl border border-white/5 animate-pulse" />
        </div>
      </div>

      {/* COOKIE TYPES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cookieTypes.map((item, index) => (
          <div
            key={index}
            className="glass-panel p-8 rounded-[2.5rem] border border-border flex flex-col justify-between group hover:border-accent-lilac/30 transition-all duration-500"
          >
            <div className="space-y-6">
              <div
                className={`w-14 h-14 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform`}
              >
                {item.icon}
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-(-primary-foreground) uppercase italic">
                  {item.title}
                </h3>
                <p className="text-sm font-medium text-foreground/40 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-border/50 flex justify-between items-center">
              <span
                className={`text-[10px] font-black uppercase tracking-widest ${item.color}`}
              >
                {item.status}
              </span>
              <ToggleRight className={item.color} size={20} />
            </div>
          </div>
        ))}
      </div>

      {/* HOW TO MANAGE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-8 rounded-[2.5rem] bg-card border border-border space-y-4">
          <div className="flex items-center gap-3 text-accent-sky">
            <RefreshCcw size={20} />
            <h4 className="font-black uppercase italic tracking-tight">
              Mengontrol Cookie
            </h4>
          </div>
          <p className="text-sm font-medium text-foreground/50 leading-relaxed">
            Anda dapat mengatur browser Anda untuk menolak semua atau beberapa
            cookie, atau untuk memperingatkan Anda ketika website mengatur atau
            mengakses cookie. Jika Anda menonaktifkan cookie, beberapa bagian
            dari website ini mungkin tidak dapat diakses atau tidak berfungsi
            dengan baik.
          </p>
        </div>
        <div className="p-8 rounded-[2.5rem] bg-card border border-border space-y-4">
          <div className="flex items-center gap-3 text-red-500">
            <EyeOff size={20} />
            <h4 className="font-black uppercase italic tracking-tight">
              Privasi Anda
            </h4>
          </div>
          <p className="text-sm font-medium text-foreground/50 leading-relaxed">
            Data yang dikumpulkan melalui cookie kami tetap bersifat anonim dan
            tidak akan digunakan untuk mengidentifikasi Anda secara pribadi di
            luar ekosistem logistik virtual Nismara Transport.
          </p>
        </div>
      </div>

      {/* FINAL CALL */}
      <div className="text-center pt-10 border-t border-border/30">
        <p className="text-xs font-black text-foreground/20 uppercase tracking-[0.4em]">
          Nismara Group • Operational Standards • 2026
        </p>
      </div>
    </div>
  );
}
