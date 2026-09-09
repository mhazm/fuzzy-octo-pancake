"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Timer,
  History,
  Users,
  Edit3,
  ExternalLink,
  Search,
  Truck,
  Calendar,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  ShieldAlert,
  ArrowRight,
  MapPin,
  Package,
  Radio,
  Trash2,
  PowerOff,
  Sparkles,
  Server,
  UserCheck,
} from "lucide-react";
import { showAlert, showConfirm } from "@/lib/dialog";
import { closeConvoyAction, deleteConvoyAction } from "@/app/actions/convoyActions";

export default function ConvoyManageUI({
  initialConvoys = [],
}: {
  initialConvoys: any[];
}) {
  const [convoys, setConvoys] = useState<any[]>(initialConvoys);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "upcoming" | "past">("all");
  const [gameFilter, setGameFilter] = useState<"all" | "1" | "2">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatDate = (dateString: string | Date) => {
    if (!mounted || !dateString) return "-";
    return (
      new Date(dateString).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      }) + " WIB"
    );
  };

  const getGameInfo = (id: string) => {
    return id === "2"
      ? {
          name: "ATS",
          fullName: "American Truck Simulator",
          color: "text-amber-400",
          bg: "bg-amber-500/10",
          border: "border-amber-500/30",
          badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        }
      : {
          name: "ETS2",
          fullName: "Euro Truck Simulator 2",
          color: "text-accent-lilac",
          bg: "bg-accent-lilac/10",
          border: "border-accent-lilac/30",
          badge: "bg-accent-lilac/15 text-accent-lilac border-accent-lilac/30",
        };
  };

  const getTypeBadge = (type: string) => {
    const t = type?.toLowerCase();
    if (t === "bulanan") {
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    }
    if (t === "special" || t === "event") {
      return "bg-purple-500/15 text-purple-300 border-purple-500/30";
    }
    return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  };

  // Metric Stats
  const stats = useMemo(() => {
    const upcoming = convoys.filter((c) => c.active !== false && !c.isEnded);
    const past = convoys.filter((c) => c.active === false || c.isEnded);
    const totalRsvp = upcoming.reduce((acc, c) => acc + (c.partisipan?.length || 0), 0);
    const totalKm = convoys.reduce((acc, c) => acc + (c.plannedDistanceKm || 0), 0);

    return {
      upcomingCount: upcoming.length,
      pastCount: past.length,
      totalRsvp,
      totalKm,
    };
  }, [convoys]);

  // Filtered Convoys
  const filteredUpcoming = useMemo(() => {
    return convoys.filter((c) => {
      const isUp = c.active !== false && !c.isEnded;
      const matchGame = gameFilter === "all" || String(c.gameId) === gameFilter;
      const matchType = typeFilter === "all" || c.typeConvoy === typeFilter;
      const matchSearch =
        !search ||
        c.convoyName?.toLowerCase().includes(search.toLowerCase()) ||
        c.sourceCity?.toLowerCase().includes(search.toLowerCase()) ||
        c.destinationCity?.toLowerCase().includes(search.toLowerCase()) ||
        c.serverName?.toLowerCase().includes(search.toLowerCase());

      return isUp && matchGame && matchType && matchSearch;
    });
  }, [convoys, gameFilter, typeFilter, search]);

  const filteredPast = useMemo(() => {
    return convoys.filter((c) => {
      const isPast = c.active === false || c.isEnded;
      const matchGame = gameFilter === "all" || String(c.gameId) === gameFilter;
      const matchType = typeFilter === "all" || c.typeConvoy === typeFilter;
      const matchSearch =
        !search ||
        c.convoyName?.toLowerCase().includes(search.toLowerCase()) ||
        c.sourceCity?.toLowerCase().includes(search.toLowerCase()) ||
        c.destinationCity?.toLowerCase().includes(search.toLowerCase()) ||
        c.serverName?.toLowerCase().includes(search.toLowerCase());

      return isPast && matchGame && matchType && matchSearch;
    });
  }, [convoys, gameFilter, typeFilter, search]);

  const handleCloseConvoy = async (id: string, name: string) => {
    const confirm = await showConfirm(
      `Tutup dan selesaikan konvoi "${name}" sekarang? Konvoi akan dipindahkan ke Riwayat Selesai.`
    );
    if (!confirm) return;

    try {
      const res = await closeConvoyAction(id);
      if (res.success) {
        await showAlert(`Konvoi "${name}" berhasil ditutup.`);
        setConvoys((prev) =>
          prev.map((c) => (c._id.toString() === id ? { ...c, active: false, isEnded: true } : c))
        );
      } else {
        await showAlert("Gagal menutup konvoi.");
      }
    } catch (err: any) {
      await showAlert(err.message || "Terjadi kesalahan saat menutup konvoi.");
    }
  };

  const handleDeleteConvoy = async (id: string, name: string) => {
    const confirm = await showConfirm(
      `Hapus permanen jadwal konvoi "${name}"? Gambar di Cloudflare R2 juga akan dihapus. Tindakan ini tidak dapat dibatalkan.`
    );
    if (!confirm) return;

    try {
      const res = await deleteConvoyAction(id);
      if (res.success) {
        await showAlert(`Jadwal konvoi "${name}" berhasil dihapus.`);
        setConvoys((prev) => prev.filter((c) => c._id.toString() !== id));
      } else {
        await showAlert("Gagal menghapus konvoi.");
      }
    } catch (err: any) {
      await showAlert(err.message || "Terjadi kesalahan saat menghapus konvoi.");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* 1. EXECUTIVE HERO COMMAND BANNER */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-card via-card/95 to-accent-lilac/10 border border-border p-6 md:p-10 shadow-2xl backdrop-blur-xl">
        {/* Glow Spheres */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-accent-lilac/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
              <Sparkles size={13} /> Logistics Dispatch & Fleet Mobilization
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground uppercase">
              Convoy <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-lilac via-primary to-accent-sky">Management</span>
            </h1>
            <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">
              Pusat koordinasi jadwal konvoi armada, plotting rute pengiriman komunitas, penugasan Road Captain & Sweeper, serta audit lobi publik.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              href="/convoy"
              target="_blank"
              className="px-5 py-4 rounded-2xl bg-card border border-border hover:border-primary/40 text-foreground font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg hover:scale-105"
            >
              <ExternalLink size={16} /> Public Lobby
            </Link>
            <Link
              href="/dashboard/manage/events/convoy/create"
              className="bg-primary text-primary-foreground px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-3 shadow-xl hover:brightness-110 hover:scale-105 active:scale-95 shadow-primary/25"
            >
              <Plus size={18} /> Create New Convoy
            </Link>
          </div>
        </div>
      </div>

      {/* 2. STATISTICAL METRICS OVERVIEW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Upcoming Convoys */}
        <div className="p-5 rounded-3xl border border-border/80 bg-card flex flex-col justify-between space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Upcoming Convoys
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Timer size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-foreground tabular-nums">
              {stats.upcomingCount}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {stats.upcomingCount > 0 ? "Jadwal Aktif Mendatang" : "Belum Ada Jadwal"}
            </div>
          </div>
        </div>

        {/* Metric 2: Active RSVP */}
        <div className="p-5 rounded-3xl border border-border/80 bg-card flex flex-col justify-between space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-sky-400">
              Total RSVP / Drivers
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-sky-400 tabular-nums">
              {stats.totalRsvp} Drivers
            </div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1">
              Partisipan Konvoi Mendatang
            </p>
          </div>
        </div>

        {/* Metric 3: Total Completed Convoys */}
        <div className="p-5 rounded-3xl border border-border/80 bg-card flex flex-col justify-between space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-accent-lilac">
              Completed Convoys
            </span>
            <div className="w-8 h-8 rounded-xl bg-accent-lilac/10 text-accent-lilac flex items-center justify-center">
              <History size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-accent-lilac tabular-nums">
              {stats.pastCount} Selesai
            </div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1">
              Arsip Riwayat Operasi
            </p>
          </div>
        </div>

        {/* Metric 4: Total Route Planned KM */}
        <div className="p-5 rounded-3xl border border-border/80 bg-card flex flex-col justify-between space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
              Total Route Distance
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Truck size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-400 tabular-nums">
              {stats.totalKm.toLocaleString("id-ID")} KM
            </div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1">
              Akumulasi Jarak Rute
            </p>
          </div>
        </div>
      </div>

      {/* 3. FILTER TABS, GAME SELECTOR & SEARCH */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-3xl border border-border bg-card shadow-lg">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "all"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            <Layers size={14} /> Semua ({convoys.length})
          </button>
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "upcoming"
                ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            <Timer size={14} /> Mendatang ({stats.upcomingCount})
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "past"
                ? "bg-foreground/20 text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            <History size={14} /> Riwayat ({stats.pastCount})
          </button>
        </div>

        {/* Game & Type Filters + Search */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Game Pills */}
          <div className="flex items-center bg-black/20 border border-border rounded-2xl p-1">
            <button
              onClick={() => setGameFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                gameFilter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setGameFilter("1")}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                gameFilter === "1" ? "bg-accent-lilac text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ETS2
            </button>
            <button
              onClick={() => setGameFilter("2")}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                gameFilter === "2" ? "bg-amber-500 text-black" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ATS
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Cari konvoi, rute, server..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/20 border border-border rounded-2xl text-xs font-medium text-foreground outline-none focus:border-primary transition-all"
            />
          </div>

          {/* View Mode */}
          <div className="flex items-center bg-black/20 border border-border rounded-2xl p-1">
            <button
              onClick={() => setViewMode("grid")}
              title="Tampilan Grid"
              className={`p-2 rounded-xl text-xs transition-all ${
                viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode("table")}
              title="Tampilan Tabel"
              className={`p-2 rounded-xl text-xs transition-all ${
                viewMode === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TableIcon size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. UPCOMING CONVOYS SECTION */}
      {(activeTab === "all" || activeTab === "upcoming") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-foreground uppercase flex items-center gap-2">
              <Timer className="text-emerald-400" size={20} />
              Jadwal Mendatang ({filteredUpcoming.length})
            </h2>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Upcoming Operations
            </span>
          </div>

          {filteredUpcoming.length > 0 ? (
            viewMode === "grid" ? (
              /* GRID VIEW */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredUpcoming.map((convoy) => {
                  const game = getGameInfo(convoy.gameId);
                  const type = convoy.typeConvoy || "Mingguan";

                  return (
                    <div
                      key={convoy._id.toString()}
                      className="group bg-card border border-border hover:border-emerald-500/40 rounded-[2.5rem] overflow-hidden flex flex-col justify-between shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
                    >
                      {/* Top Cover Banner */}
                      <div className="relative h-56 w-full overflow-hidden bg-muted">
                        <img
                          src={convoy.imageUrl || "https://i.imgur.com/iMTOi8Z.png"}
                          alt={convoy.convoyName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-card via-black/50 to-transparent" />

                        {/* Floating Badges */}
                        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border backdrop-blur-md shadow-lg ${game.badge}`}
                          >
                            {game.name}
                          </span>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border backdrop-blur-md shadow-lg ${getTypeBadge(
                                type
                              )}`}
                            >
                              {type}
                            </span>
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-black font-bold flex items-center gap-1.5 shadow-lg">
                              <span className="w-1.5 h-1.5 rounded-full bg-black" /> Active
                            </span>
                          </div>
                        </div>

                        {/* Title Overlay */}
                        <div className="absolute bottom-4 left-6 right-6">
                          <p className="text-emerald-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 mb-1">
                            <Radio size={12} /> {convoy.gameplayType || "Convoy Lobby"}
                          </p>
                          <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-tight line-clamp-1">
                            {convoy.convoyName}
                          </h3>
                        </div>
                      </div>

                      {/* Content & Details */}
                      <div className="p-6 md:p-8 space-y-6 flex-1 flex flex-col justify-between">
                        {/* Route Matrix */}
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <div className="flex items-center gap-2 text-foreground font-black">
                              <MapPin size={16} className="text-primary flex-shrink-0" />
                              <span className="line-clamp-1">{convoy.sourceCity || "Unknown"}</span>
                            </div>
                            <ArrowRight size={16} className="text-muted-foreground flex-shrink-0" />
                            <div className="flex items-center gap-2 text-foreground font-black text-right">
                              <span className="line-clamp-1">{convoy.destinationCity || "Unknown"}</span>
                              <MapPin size={16} className="text-accent-sky flex-shrink-0" />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[10px]">
                            <div>
                              <span className="text-muted-foreground uppercase font-black tracking-wider block">Jarak Rute</span>
                              <p className="font-bold text-foreground">{convoy.plannedDistanceKm ? `${convoy.plannedDistanceKm} KM` : "-"}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground uppercase font-black tracking-wider block">Kargo</span>
                              <p className="font-bold text-foreground line-clamp-1">{convoy.cargoName || "Bebas / Standar"}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-muted-foreground uppercase font-black tracking-wider block">Server</span>
                              <p className="font-bold text-accent-sky line-clamp-1">{convoy.serverName || "Convoy Lobby"}</p>
                            </div>
                          </div>
                        </div>

                        {/* Meetup Schedule & Officers */}
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="space-y-1">
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                              Jadwal Kumpul (Meetup)
                            </span>
                            <p className="font-bold text-emerald-400">
                              {formatDate(convoy.meetupDate)}
                            </p>
                          </div>
                          <div className="space-y-1 text-right">
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                              Partisipan
                            </span>
                            <p className="font-black text-foreground">
                              {convoy.partisipan?.length || 0} Drivers Bergabung
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2 pt-2 border-t border-border/60">
                          <div className="grid grid-cols-2 gap-2">
                            <Link
                              href={`/convoy/${convoy.convoyUri}`}
                              className="py-3 px-4 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-primary/20"
                            >
                              Lobi Publik <ExternalLink size={14} />
                            </Link>
                            <Link
                              href={`/dashboard/manage/events/convoy/edit/${convoy.convoyUri}`}
                              className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-foreground font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-border"
                            >
                              <Edit3 size={14} /> Edit Jadwal
                            </Link>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleCloseConvoy(convoy._id.toString(), convoy.convoyName)}
                              className="py-2.5 px-3 rounded-xl bg-orange-500/10 hover:bg-orange-500 hover:text-black text-orange-400 font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 border border-orange-500/20"
                            >
                              <PowerOff size={12} /> Selesaikan Konvoi
                            </button>
                            <button
                              onClick={() => handleDeleteConvoy(convoy._id.toString(), convoy.convoyName)}
                              className="py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 border border-red-500/20"
                            >
                              <Trash2 size={12} /> Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* TABLE VIEW UPCOMING */
              <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-foreground/5 text-foreground/40 text-[10px] font-black uppercase tracking-widest border-b border-border">
                      <tr>
                        <th className="px-8 py-5">Game</th>
                        <th className="px-8 py-5">Konvoi & Rute</th>
                        <th className="px-8 py-5">Jadwal Meetup</th>
                        <th className="px-8 py-5">Drivers</th>
                        <th className="px-8 py-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredUpcoming.map((convoy) => {
                        const game = getGameInfo(convoy.gameId);
                        const type = convoy.typeConvoy || "Mingguan";

                        return (
                          <tr key={convoy._id.toString()} className="hover:bg-foreground/[0.02] transition-colors group">
                            <td className="px-8 py-5">
                              <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${game.badge}`}>
                                {game.name}
                              </span>
                            </td>
                            <td className="px-8 py-5">
                              <p className="font-black text-foreground uppercase group-hover:text-primary transition-colors">
                                {convoy.convoyName}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-bold mt-0.5">
                                {convoy.sourceCity || "Unknown"} ➔ {convoy.destinationCity || "Unknown"} • <span className="text-primary">{type}</span>
                              </p>
                            </td>
                            <td className="px-8 py-5 text-xs font-bold text-emerald-400">
                              {formatDate(convoy.meetupDate)}
                            </td>
                            <td className="px-8 py-5 tabular-nums">
                              <span className="font-bold text-foreground">
                                {convoy.partisipan?.length || 0} Joined
                              </span>
                            </td>
                            <td className="px-8 py-5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  href={`/convoy/${convoy.convoyUri}`}
                                  title="Lihat Lobi"
                                  className="p-2 rounded-xl bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors border border-border/60"
                                >
                                  <ExternalLink size={14} />
                                </Link>
                                <Link
                                  href={`/dashboard/manage/events/convoy/edit/${convoy.convoyUri}`}
                                  title="Edit Konvoi"
                                  className="p-2 rounded-xl bg-white/5 hover:bg-accent-sky/20 text-muted-foreground hover:text-accent-sky transition-colors border border-border/60"
                                >
                                  <Edit3 size={14} />
                                </Link>
                                <button
                                  onClick={() => handleCloseConvoy(convoy._id.toString(), convoy.convoyName)}
                                  title="Selesaikan Konvoi"
                                  className="p-2 rounded-xl bg-white/5 hover:bg-orange-500/20 text-muted-foreground hover:text-orange-500 transition-colors border border-border/60"
                                >
                                  <PowerOff size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteConvoy(convoy._id.toString(), convoy.convoyName)}
                                  title="Hapus Konvoi"
                                  className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-colors border border-border/60"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
            <div className="p-12 rounded-[2.5rem] border border-border bg-card text-center space-y-3 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-white/5 text-muted-foreground flex items-center justify-center mx-auto">
                <Timer size={24} />
              </div>
              <p className="text-foreground font-bold text-sm">Tidak ada jadwal konvoi mendatang.</p>
              <p className="text-muted-foreground text-xs max-w-md mx-auto">
                Klik tombol "Create New Convoy" di atas untuk menjadwalkan dan memobilisasi armada konvoi baru.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 5. PAST CONVOYS (ARCHIVE) SECTION */}
      {(activeTab === "all" || activeTab === "past") && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-foreground uppercase flex items-center gap-2">
              <History className="text-muted-foreground" size={20} />
              Riwayat Selesai ({filteredPast.length})
            </h2>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Completed Log Archive
            </span>
          </div>

          <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-foreground/5 text-foreground/40 text-[10px] font-black uppercase tracking-widest border-b border-border">
                  <tr>
                    <th className="px-8 py-5">Game</th>
                    <th className="px-8 py-5">Informasi Konvoi</th>
                    <th className="px-8 py-5">Rute & Kargo</th>
                    <th className="px-8 py-5">Drivers</th>
                    <th className="px-8 py-5 text-right">Selesai Pada</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPast.length > 0 ? (
                    filteredPast.map((convoy) => {
                      const game = getGameInfo(convoy.gameId);
                      const type = convoy.typeConvoy || "Mingguan";

                      return (
                        <tr key={convoy._id.toString()} className="hover:bg-foreground/[0.02] transition-colors group">
                          {/* Game */}
                          <td className="px-8 py-5">
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${game.badge}`}>
                              {game.name}
                            </span>
                          </td>

                          {/* Convoy Info */}
                          <td className="px-8 py-5">
                            <p className="font-black text-foreground uppercase group-hover:text-primary transition-colors">
                              {convoy.convoyName}
                            </p>
                            <span className={`text-[9px] font-bold uppercase tracking-wider rounded px-2 py-0.5 border inline-block mt-1 ${getTypeBadge(type)}`}>
                              {type}
                            </span>
                          </td>

                          {/* Route */}
                          <td className="px-8 py-5">
                            <p className="font-bold text-foreground text-xs">
                              {convoy.sourceCity || "Unknown"} ➔ {convoy.destinationCity || "Unknown"}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {convoy.plannedDistanceKm ? `${convoy.plannedDistanceKm} KM` : ""} {convoy.cargoName ? `• ${convoy.cargoName}` : ""}
                            </p>
                          </td>

                          {/* Drivers */}
                          <td className="px-8 py-5 tabular-nums">
                            <span className="font-bold text-foreground">
                              {convoy.partisipan?.length || 0} Drivers
                            </span>
                          </td>

                          {/* Finished Date */}
                          <td className="px-8 py-5 text-right text-muted-foreground font-mono text-[10px] font-bold">
                            {formatDate(convoy.updatedAt || convoy.meetupDate)}
                          </td>

                          {/* Actions */}
                          <td className="px-8 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/convoy/${convoy.convoyUri}`}
                                title="Lihat Log Lobi"
                                className="p-2.5 rounded-xl bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors border border-border/60"
                              >
                                <ExternalLink size={14} />
                              </Link>
                              <Link
                                href={`/dashboard/manage/events/convoy/edit/${convoy.convoyUri}`}
                                title="Edit Parameter"
                                className="p-2.5 rounded-xl bg-white/5 hover:bg-accent-sky/20 text-muted-foreground hover:text-accent-sky transition-colors border border-border/60"
                              >
                                <Edit3 size={14} />
                              </Link>
                              <button
                                onClick={() => handleDeleteConvoy(convoy._id.toString(), convoy.convoyName)}
                                title="Hapus Arsip"
                                className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-colors border border-border/60"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-8 py-16 text-center text-muted-foreground font-bold uppercase tracking-widest text-xs">
                        Tidak ada riwayat konvoi yang sesuai filter.
                      </td>
                    </tr>
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
