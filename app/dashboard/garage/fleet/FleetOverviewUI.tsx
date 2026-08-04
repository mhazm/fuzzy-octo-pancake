"use client";

import React from "react";
import {
  Truck,
  Cpu,
  Zap,
  Timer,
  ShieldCheck,
  ChevronDown,
  Bell,
  Wallet,
} from "lucide-react";

// Simulasi Link untuk Sidebar agar terlihat seperti dashboard asli
const SidebarLink = ({ icon, label, active = false }: any) => (
  <div
    className={`flex items-center gap-3 px-6 py-3.5 rounded-xl cursor-pointer transition-all ${active ? "bg-accent-lilac text-white font-bold shadow-lg" : "text-foreground/60 hover:bg-white/5 hover:text-(-primary-foreground)"}`}
  >
    {icon}
    <span className="text-sm uppercase font-black tracking-tight">{label}</span>
    {!active && label === "Fleet" && (
      <Zap size={14} className="ml-auto text-accent-sky animate-pulse" />
    )}
  </div>
);

export default function FleetOverviewUI({ session }: any) {
  // Mapping data user dari session (atau fallback jika belum login)
  const userName = session?.user?.name || "Adityaaaa";
  const userImage =
    session?.user?.image ||
    `https://ui-avatars.com/api/?name=${userName}&background=6D28D9&color=fff`;

  return (
    <div className="min-h-screen bg-(-background) flex text-(-primary-foreground) font-['Urbanist']">
      {/* 1. SIMULASI SIDEBAR (Sesuai Referensi Gambar) */}
      <aside className="w-72 bg-card border-r border-border p-6 space-y-10 flex flex-col">
        <div className="flex items-center gap-3 px-3">
          <div className="w-10 h-10 rounded-full bg-accent-lilac flex items-center justify-center font-black text-white text-xl shadow-lg">
            N
          </div>
          <h1 className="text-2xl font-black text-(-primary-foreground) uppercase italic tracking-tighter">
            Nismara
          </h1>
        </div>

        <nav className="space-y-2 flex-1">
          <SidebarLink icon={<Database size={18} />} label="Dashboard" />
          <SidebarLink icon={<Users size={18} />} label="Member" />
          <SidebarLink icon={<Briefcase size={18} />} label="Contract" />
          <SidebarLink icon={<CalendarDays size={18} />} label="Event" />
          <SidebarLink icon={<Truck size={18} />} label="Fleet" active />
          <SidebarLink icon={<AlertTriangle size={18} />} label="Point Data" />
        </nav>

        <div className="border-t border-border pt-6 space-y-2">
          <SidebarLink icon={<Settings size={18} />} label="Settings" />
          <SidebarLink icon={<LogOut size={18} />} label="Logout" />
        </div>
      </aside>

      {/* 2. MAIN AREA */}
      <div className="flex-1 flex flex-col">
        {/* SIMULASI HEADER (Sesuai Referensi Gambar) */}
        <header className="h-24 bg-card border-b border-border p-6 flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <p className="text-sm text-foreground/40 font-medium">
              operational oversight
            </p>
            <h1 className="text-2xl font-extrabold text-(-primary-foreground) uppercase italic leading-none">
              Good Morning{" "}
              <span className="font-black not-italic">{userName}</span>
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                <Wallet size={16} />
              </div>
              <div>
                <p className="text-[10px] font-black text-foreground/40 uppercase">
                  NC Balance
                </p>
                <p className="text-lg font-black text-emerald-400 italic leading-none">
                  N¢ 477.562
                </p>
              </div>
            </div>
            <button className="p-3 bg-white/5 border border-border rounded-xl text-foreground/40 hover:text-white">
              <Bell size={20} />
            </button>
            <div className="flex items-center gap-3">
              <img
                src={userImage}
                className="w-12 h-12 rounded-full border-2 border-border object-cover"
              />
              <ChevronDown size={18} className="text-foreground/30" />
            </div>
          </div>
        </header>

        {/* 3. CONTENT AREA: PREMIUM COMING SOON MODULE */}
        <main className="flex-1 p-10 flex items-center justify-center animate-in fade-in duration-1000">
          <div className="relative w-full max-w-5xl h-[60vh] rounded-[3rem] border border-accent-sky/20 bg-card/40 backdrop-blur-xl shadow-2xl flex items-center justify-center overflow-hidden group">
            {/* NEON BORDER GLOW EFFECTS (PENTING BUAT VISUAL) */}
            <div className="absolute inset-0 rounded-[3rem] ring-2 ring-accent-sky/20 transition-all duration-700 group-hover:ring-accent-sky/50" />
            <div className="absolute inset-0 rounded-[3rem] shadow-[0_0_30px_rgba(124,184,249,0.1)] group-hover:shadow-[0_0_60px_rgba(124,184,249,0.2)] transition-all" />

            {/* BACKGROUND ABSTRACT VISUALS */}
            <div className="absolute top-0 -left-10 w-96 h-96 bg-accent-lilac/5 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-0 -right-10 w-96 h-96 bg-accent-sky/5 blur-[120px] rounded-full animate-pulse delay-700" />

            <div className="relative z-10 flex flex-col items-center text-center p-12 space-y-8">
              {/* NEON ICON */}
              <div className="relative">
                <div className="absolute inset-0 bg-accent-lilac/20 blur-2xl rounded-full animate-ping" />
                <div className="relative p-6 bg-card border border-border rounded-3xl shadow-2xl">
                  <Truck
                    size={64}
                    className="text-accent-lilac animate-bounce"
                  />
                </div>
              </div>

              {/* TEXT CONTENT (FONT BOLD ITALIC UNTUK IDENTITAS) */}
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-black uppercase tracking-[0.3em] text-primary">
                  <Cpu size={14} className="animate-spin-slow" /> Hardware
                  Integration Phase
                </div>
                <h2 className="text-5xl md:text-6xl font-black text-(-primary-foreground) italic uppercase tracking-tighter leading-none pt-2">
                  Maju Bersama:{" "}
                  <span className="text-accent-sky italic">Fleet overhaul</span>
                </h2>
                <p className="max-w-xl mx-auto text-base font-medium text-foreground/50 leading-relaxed pt-2">
                  Nismara Transport sedang merombak total sistem pemantauan
                  armada. Segera hadir: Pemantauan GPS real-time, audit
                  kesehatan truk, dan manajemen sopir yang terintegrasi.
                </p>
              </div>

              {/* PROGRESS BAR */}
              <div className="w-full max-w-md space-y-4 pt-4">
                <div className="flex justify-between items-end px-1">
                  <span className="text-[11px] font-black text-foreground/30 uppercase tracking-widest">
                    Calibration & Sync
                  </span>
                  <span className="text-sm font-black text-accent-lilac italic tabular-nums">
                    75%
                  </span>
                </div>
                <div className="h-2 w-full bg-foreground/5 rounded-full overflow-hidden border border-border">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent-sky transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(109,40,217,0.4)]"
                    style={{ width: "75%" }}
                  />
                </div>
              </div>

              {/* METADATA FOOTER */}
              <div className="flex items-center gap-8 pt-8 text-foreground/30">
                <div className="flex items-center gap-2.5">
                  <Timer size={16} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                    Target: Q1 2026
                  </span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={16} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                    OPERATIONAL READINESS INITIATIVE
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* CUSTOM STYLE FOR ANIMATIONS (PENTING BUAT VISUAL) */}
      <style jsx global>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
      `}</style>
    </div>
  );
}

// Tambahan Ikon Lucide yang belum ada di import awal (Sesuaikan jika Anda sudah punya)
import {
  Database,
  Users,
  Briefcase,
  CalendarDays,
  AlertTriangle,
  Settings,
  LogOut,
} from "lucide-react";
