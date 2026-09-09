"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Gift,
  Calendar,
  Ticket,
  Users,
  Trophy,
  ArrowRight,
  Clock,
  Sparkles,
  Flame,
  CheckCircle2,
  Crown,
} from "lucide-react";

interface GiveawaysIndexClientProps {
  giveaways: any[];
}

export default function GiveawaysIndexClient({ giveaways }: GiveawaysIndexClientProps) {
  const [activeTab, setActiveTab] = useState<string>("ongoing");

  const filtered = giveaways.filter((g) => {
    if (activeTab === "all") return true;
    if (activeTab === "ongoing") return g.status === "ongoing" || g.status === "drawing";
    if (activeTab === "scheduled") return g.status === "scheduled";
    if (activeTab === "completed") return g.status === "completed";
    return true;
  });

  return (
    <main className="min-h-screen pt-28 pb-20 relative bg-background overflow-x-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-96 bg-primary/10 blur-3xl rounded-b-full pointer-events-none" />
      <div className="absolute top-40 right-10 w-72 h-72 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 space-y-12">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-wider shadow-sm">
            <Sparkles size={14} /> Event Undian Resmi VTC
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-foreground tracking-tight uppercase">
            Nismara <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-amber-400 to-primary">Giveaways</span>
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            Apresiasi nyata untuk seluruh driver! Selesaikan misi pekerjaan di game untuk klaim tiket undian gratis atau gunakan Nismara Coin Anda untuk memperbesar peluang menang.
          </p>
        </div>

        {/* Tab Filter */}
        <div className="flex items-center justify-center gap-2 border-b border-border/60 pb-3 overflow-x-auto no-scrollbar">
          {[
            { id: "ongoing", label: "Sedang Berjalan" },
            { id: "scheduled", label: "Akan Datang" },
            { id: "completed", label: "Selesai" },
            { id: "all", label: "Semua Event" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grid Event */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 px-4 bg-card/40 border border-dashed border-border rounded-3xl max-w-lg mx-auto">
            <Gift size={56} className="mx-auto text-muted-foreground/30 mb-3" />
            <h3 className="text-lg font-bold text-foreground">Tidak Ada Event pada Kategori Ini</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Pantau terus pengumuman Discord atau kembali lagi saat event giveaway musim baru dibuka!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((g) => {
              const startStr = g.startDate
                ? new Date(g.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
                : "-";
              const endStr = g.endDate
                ? new Date(g.endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                : "-";

              return (
                <Link
                  key={g._id}
                  href={`/giveaways/${g.slug}`}
                  className="group bg-card/60 hover:bg-card border border-border/70 hover:border-primary/50 rounded-3xl overflow-hidden shadow-xl hover:shadow-primary/10 transition-all duration-300 flex flex-col hover:-translate-y-1"
                >
                  {/* Banner Poster */}
                  <div className="h-44 w-full bg-black/60 relative overflow-hidden">
                    {g.bannerUrl ? (
                      <img
                        src={g.bannerUrl}
                        alt={g.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 via-card to-background text-primary">
                        <Gift size={56} className="opacity-30" />
                      </div>
                    )}

                    {/* Status Pill */}
                    <div className="absolute top-3 right-3">
                      {g.status === "ongoing" && (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/90 text-white shadow-md flex items-center gap-1.5 animate-pulse">
                          Sedang Aktif
                        </span>
                      )}
                      {g.status === "scheduled" && (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/90 text-white shadow-md flex items-center gap-1.5">
                          <Clock size={10} /> Segera Dibuka
                        </span>
                      )}
                      {g.status === "drawing" && (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/90 text-white shadow-md flex items-center gap-1.5">
                          <Trophy size={10} /> Pengundian
                        </span>
                      )}
                      {g.status === "completed" && (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/90 text-black font-black shadow-md flex items-center gap-1.5">
                          <Crown size={10} /> Selesai
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1 rounded-xl text-[11px] font-bold text-white flex items-center gap-1.5 border border-white/10">
                      <Calendar size={12} className="text-primary" />
                      {startStr} – {endStr}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-lg font-black text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {g.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {g.description || "Ikuti event giveaway dan menangkan hadiah menarik!"}
                      </p>
                    </div>

                    {/* Quick Highlights */}
                    <div className="p-3 rounded-2xl bg-black/30 border border-border/50 flex items-center justify-between text-center">
                      <div>
                        <span className="text-[9px] font-black uppercase text-muted-foreground block">Hadiah</span>
                        <span className="text-xs font-black text-amber-400">
                          {g.prizes?.length || 0} Tingkatan
                        </span>
                      </div>
                      <div className="h-6 w-px bg-border/50" />
                      <div>
                        <span className="text-[9px] font-black uppercase text-muted-foreground block">Tiket Terbit</span>
                        <span className="text-xs font-black text-sky-400 tabular-nums">
                          {g.stats?.totalTickets?.toLocaleString("id-ID") || 0}
                        </span>
                      </div>
                      <div className="h-6 w-px bg-border/50" />
                      <div>
                        <span className="text-[9px] font-black uppercase text-muted-foreground block">Driver Ikut</span>
                        <span className="text-xs font-black text-emerald-400 tabular-nums">
                          {g.stats?.totalParticipants?.toLocaleString("id-ID") || 0}
                        </span>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <div className="pt-2 flex items-center justify-between text-xs font-black text-primary group-hover:translate-x-1 transition-transform">
                      <span>{g.status === "completed" ? "Lihat Hasil Undian" : "Masuk & Cek Tiket"}</span>
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
