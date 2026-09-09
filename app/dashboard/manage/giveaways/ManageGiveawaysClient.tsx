"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Gift,
  Plus,
  Calendar,
  Ticket,
  Users,
  Flame,
  Trophy,
  Edit,
  Trash2,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
} from "lucide-react";
import { showAlert, showConfirm } from "@/lib/dialog";

interface ManageGiveawaysClientProps {
  initialGiveaways: any[];
}

export default function ManageGiveawaysClient({ initialGiveaways }: ManageGiveawaysClientProps) {
  const router = useRouter();
  const [giveaways, setGiveaways] = useState(initialGiveaways);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Filter berdasarkan status tab
  const filteredGiveaways = giveaways.filter((g) => {
    if (activeTab === "all") return true;
    return g.status === activeTab;
  });

  // Kalkulasi statistik global
  const totalEvents = giveaways.length;
  const totalTickets = giveaways.reduce((acc, g) => acc + (g.stats?.totalTickets || 0), 0);
  const totalParticipants = giveaways.reduce((acc, g) => acc + (g.stats?.totalParticipants || 0), 0);
  const totalNcBurned = giveaways.reduce((acc, g) => acc + (g.stats?.totalNcBurned || 0), 0);

  const handleDelete = async (id: string, title: string) => {
    const confirmed = await showConfirm(`Apakah Anda yakin ingin menghapus giveaway "${title}"? Seluruh tiket peserta yang terkait juga akan dihapus.`);
    if (!confirmed) return;

    setIsDeleting(id);
    try {
      const res = await fetch(`/api/manage/giveaways/${id}`, {
        method: "DELETE",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        await showAlert(data.error || "Gagal menghapus giveaway.");
      } else {
        setGiveaways((prev) => prev.filter((g) => g._id !== id));
        await showAlert("Giveaway berhasil dihapus.");
        router.refresh();
      }
    } catch (err: any) {
      await showAlert("Terjadi kesalahan jaringan.");
    } finally {
      setIsDeleting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ongoing":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm shadow-emerald-500/10 animate-pulse">
            <Play size={12} className="fill-emerald-400" /> Sedang Berjalan
          </span>
        );
      case "scheduled":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center gap-1.5">
            <Clock size={12} /> Terjadwal
          </span>
        );
      case "drawing":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center gap-1.5 animate-bounce">
            <Trophy size={12} /> Sedang Diundi
          </span>
        );
      case "completed":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
            <CheckCircle2 size={12} /> Selesai
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-muted text-muted-foreground border border-border flex items-center gap-1.5">
            <AlertCircle size={12} /> Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-8">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-card/80 via-card/50 to-primary/5 p-6 rounded-3xl border border-border/60 shadow-xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/20 rounded-2xl border border-primary/30 text-primary">
              <Gift size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                Manajemen <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent-sky to-primary">Giveaway Driver</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Kelola event giveaway, pantau tiket peserta, dan eksekusi pengundian hadiah otomatis.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/giveaways"
            target="_blank"
            className="px-4 py-2.5 rounded-2xl bg-card border border-border hover:border-primary/40 text-foreground font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2"
          >
            <ExternalLink size={14} /> Lihat Halaman Publik
          </Link>
          <Link
            href="/dashboard/manage/giveaways/new"
            className="px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={16} /> Buat Giveaway Baru
          </Link>
        </div>
      </div>

      {/* Global Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-card/60 border border-border/60 shadow-md">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
            <Gift size={16} className="text-primary" /> Total Event
          </div>
          <p className="text-2xl md:text-3xl font-black text-foreground mt-2 tabular-nums">{totalEvents}</p>
          <span className="text-[11px] text-muted-foreground">Sepanjang masa</span>
        </div>

        <div className="p-5 rounded-3xl bg-card/60 border border-border/60 shadow-md">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase">
            <Ticket size={16} /> Tiket Terbit
          </div>
          <p className="text-2xl md:text-3xl font-black text-sky-400 mt-2 tabular-nums">
            {totalTickets.toLocaleString("id-ID")}
          </p>
          <span className="text-[11px] text-muted-foreground">Klaim Quest & Beli NC</span>
        </div>

        <div className="p-5 rounded-3xl bg-card/60 border border-border/60 shadow-md">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase">
            <Users size={16} /> Driver Berpartisipasi
          </div>
          <p className="text-2xl md:text-3xl font-black text-emerald-400 mt-2 tabular-nums">
            {totalParticipants.toLocaleString("id-ID")}
          </p>
          <span className="text-[11px] text-muted-foreground">Akun pengemudi unik</span>
        </div>

        <div className="p-5 rounded-3xl bg-card/60 border border-border/60 shadow-md">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase">
            <Flame size={16} /> NC Dibakar (Sink)
          </div>
          <p className="text-2xl md:text-3xl font-black text-amber-400 mt-2 tabular-nums">
            {totalNcBurned.toLocaleString("id-ID")} NC
          </p>
          <span className="text-[11px] text-muted-foreground">Pembelian tiket ekstra</span>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3 overflow-x-auto no-scrollbar">
        {[
          { id: "all", label: "Semua Event" },
          { id: "ongoing", label: "Sedang Berjalan" },
          { id: "scheduled", label: "Terjadwal" },
          { id: "completed", label: "Selesai" },
          { id: "draft", label: "Draft" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid of Giveaways */}
      {filteredGiveaways.length === 0 ? (
        <div className="text-center py-16 px-4 bg-card/30 border border-dashed border-border/80 rounded-3xl">
          <Gift size={48} className="mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-bold text-foreground">Belum ada event giveaway pada kategori ini</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
            Klik tombol "Buat Giveaway Baru" untuk menyusun event giveaway berhadiah spektakuler bagi para driver.
          </p>
          <Link
            href="/dashboard/manage/giveaways/new"
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/25"
          >
            <Plus size={16} /> Buat Giveaway Sekarang
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGiveaways.map((g) => {
            const startStr = g.startDate
              ? new Date(g.startDate).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short" })
              : "-";
            const endStr = g.endDate
              ? new Date(g.endDate).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric" })
              : "-";

            return (
              <div
                key={g._id}
                className="group relative bg-card/60 hover:bg-card/90 border border-border/60 hover:border-primary/50 rounded-3xl overflow-hidden shadow-lg transition-all duration-300 flex flex-col"
              >
                {/* Banner Thumbnail */}
                <div className="h-40 w-full bg-black/40 relative overflow-hidden border-b border-border/40">
                  {g.bannerUrl ? (
                    <img
                      src={g.bannerUrl}
                      alt={g.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 via-card to-background text-primary">
                      <Gift size={48} className="opacity-40" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">{getStatusBadge(g.status)}</div>
                  <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-xl text-[11px] font-bold text-white flex items-center gap-1.5 border border-white/10">
                    <Calendar size={12} className="text-primary" />
                    {startStr} – {endStr}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-lg font-black text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {g.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {g.description || "Tidak ada deskripsi event."}
                    </p>
                  </div>

                  {/* Highlights */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-black/30 border border-border/50 text-center">
                    <div>
                      <span className="text-[9px] font-black uppercase text-muted-foreground block">Tiket</span>
                      <p className="text-sm font-black text-sky-400 tabular-nums">
                        {g.stats?.totalTickets?.toLocaleString("id-ID") || 0}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-muted-foreground block">Peserta</span>
                      <p className="text-sm font-black text-emerald-400 tabular-nums">
                        {g.stats?.totalParticipants?.toLocaleString("id-ID") || 0}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-muted-foreground block">Hadiah</span>
                      <p className="text-sm font-black text-amber-400 tabular-nums">
                        {g.prizes?.length || 0} Tier
                      </p>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                    <Link
                      href={`/dashboard/manage/giveaways/${g._id}`}
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider text-center transition-all shadow-md shadow-primary/20"
                    >
                      Detail & Undian
                    </Link>
                    <Link
                      href={`/dashboard/manage/giveaways/${g._id}/edit`}
                      className="p-2.5 rounded-xl bg-card border border-border hover:border-primary/50 text-foreground hover:text-primary transition-all"
                      title="Edit Giveaway"
                    >
                      <Edit size={16} />
                    </Link>
                    <button
                      onClick={() => handleDelete(g._id, g.title)}
                      disabled={isDeleting === g._id}
                      className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all disabled:opacity-50"
                      title="Hapus Giveaway"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
