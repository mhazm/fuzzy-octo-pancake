"use client";

import React, { useState, useEffect } from "react";
import {
  Trophy,
  Crown,
  Sparkles,
  Flame,
  Plus,
  Edit,
  CheckCircle2,
  Users,
  Search,
  Calendar,
  Layers,
  Clock,
  ArrowRight,
  Gift,
  Coins,
  ShieldAlert,
  CreditCard,
  Check,
  XCircle,
  MessageSquare,
  Package,
  Download,
  ExternalLink,
  Copy,
  Trash2,
  Zap,
  Fuel,
  Shield,
  Star,
  Power,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { showAlert, showConfirm } from "@/lib/dialog";
import { useRouter } from "next/navigation";
import SeasonFormModal from "./SeasonFormModal";
import TemplateEditorModal from "./TemplateEditorModal";

export default function ManageSeasonPassClient({
  initialSeasons,
  initialActiveSeason,
  initialStats,
  initialDriverProgress,
  initialOrders = [],
  initialFeatureStatus,
  isOwner = false,
}: {
  initialSeasons: any[];
  initialActiveSeason: any;
  initialStats: any;
  initialDriverProgress: any[];
  initialOrders?: any[];
  initialFeatureStatus?: any;
  isOwner?: boolean;
}) {
  const router = useRouter();
  const [seasons, setSeasons] = useState<any[]>(initialSeasons || []);
  const [selectedSeason, setSelectedSeason] = useState<any>(initialActiveSeason || initialSeasons?.[0]);
  const [stats, setStats] = useState<any>(initialStats || {});
  const [driverProgress, setDriverProgress] = useState<any[]>(initialDriverProgress || []);
  const [orders, setOrders] = useState<any[]>(initialOrders || []);

  const [featureStatus, setFeatureStatus] = useState<any>(
    initialFeatureStatus || {
      isEnabled: true,
      disabledReason: "",
    }
  );

  const [activeTab, setActiveTab] = useState<"SEASONS" | "TEMPLATES" | "DRIVERS" | "ORDERS">("SEASONS");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalMode, setModalMode] = useState<"CREATE" | "EDIT" | null>(null);
  const [editingSeason, setEditingSeason] = useState<any>(null);
  const [isActivating, setIsActivating] = useState<number | null>(null);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  // Template Management State
  const [templates, setTemplates] = useState<any[]>([]);
  const [isTemplatesLoading, setIsTemplatesLoading] = useState(false);
  const [selectedTemplateForEdit, setSelectedTemplateForEdit] = useState<string | null>(null);

  const pendingOrders = orders.filter((o) => o.status === "pending");

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsTemplatesLoading(true);
    try {
      const res = await fetch("/api/manage/season-pass/templates");
      const data = await res.json();
      if (res.ok && data.templates) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTemplatesLoading(false);
    }
  };

  const filteredDrivers = driverProgress.filter((p) => {
    const name = p.user?.name || "";
    const discordId = p.discordId || "";
    const query = searchQuery.toLowerCase();
    return name.toLowerCase().includes(query) || discordId.includes(query);
  });

  const handleSelectSeason = async (seasonNum: number) => {
    try {
      const res = await fetch(`/api/manage/season-pass?seasonNumber=${seasonNum}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedSeason(data.activeSeason);
        setStats(data.stats);
        setDriverProgress(data.driverProgress);
        if (data.featureStatus) {
          setFeatureStatus(data.featureStatus);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleActivateSeason = async (seasonNumber: number) => {
    const confirmed = await showConfirm(
      `Aktifkan Season ${seasonNumber} sebagai Musim Aktif Utama? Musim aktif lainnya akan otomatis diubah statusnya menjadi COMPLETED.`
    );
    if (!confirmed) return;

    setIsActivating(seasonNumber);
    try {
      const res = await fetch("/api/manage/season-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ACTIVATE", seasonNumber }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengaktifkan musim");

      await showAlert(data.message || "Musim berhasil diaktifkan!");
      router.refresh();
      window.location.reload();
    } catch (err: any) {
      await showAlert(`Gagal: ${err.message}`);
    } finally {
      setIsActivating(null);
    }
  };

  const handleOrderAction = async (orderId: string, action: "APPROVE" | "REJECT", driverName: string) => {
    const actionText = action === "APPROVE" ? "menyetujui pembayaran dan mengaktifkan Pass" : "menolak pesanan";
    const confirmed = await showConfirm(`Apakah Anda yakin ingin ${actionText} untuk ${driverName}?`);
    if (!confirmed) return;

    setProcessingOrderId(orderId);
    try {
      const res = await fetch("/api/manage/season-pass/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses pesanan");

      await showAlert(data.message || "Berhasil!");
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: action === "APPROVE" ? "success" : "rejected" } : o))
      );
      router.refresh();
    } catch (err: any) {
      await showAlert(`Gagal: ${err.message}`);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleDuplicateTemplate = async (sourceTemplate: any) => {
    const newName = window.prompt("Masukkan nama untuk template baru:", `${sourceTemplate.name} (Copy)`);
    if (!newName || !newName.trim()) return;

    try {
      const res = await fetch("/api/manage/season-pass/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DUPLICATE",
          sourceTemplateId: sourceTemplate._id,
          name: newName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menduplikasi template");

      await showAlert(data.message || "Template berhasil diduplikasi!");
      loadTemplates();
    } catch (err: any) {
      await showAlert(`Gagal: ${err.message}`);
    }
  };

  const handleDeleteTemplate = async (template: any) => {
    if (template.isDefault) {
      await showAlert("Template default sistem tidak dapat dihapus.");
      return;
    }

    const confirmed = await showConfirm(`Yakin ingin menghapus template "${template.name}"?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/manage/season-pass/templates/${template._id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus template");

      await showAlert("Template berhasil dihapus!");
      loadTemplates();
    } catch (err: any) {
      await showAlert(`Gagal: ${err.message}`);
    }
  };

  const handleCreateNewTemplate = async () => {
    const templateName = window.prompt("Masukkan nama template baru:", "Template Musim Baru");
    if (!templateName || !templateName.trim()) return;

    try {
      const res = await fetch("/api/manage/season-pass/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName.trim(),
          description: "Template konfigurasi hadiah 30 level kustom",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat template");

      await showAlert("Template berhasil dibuat! Anda sekarang dapat mengedit level hadiah.");
      loadTemplates();
      if (data.template?._id) {
        setSelectedTemplateForEdit(data.template._id);
      }
    } catch (err: any) {
      await showAlert(`Gagal: ${err.message}`);
    }
  };

  const refreshData = async () => {
    try {
      const res = await fetch(`/api/manage/season-pass?seasonNumber=${selectedSeason?.seasonNumber || 1}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok) {
        setSeasons(data.seasons);
        setSelectedSeason(data.activeSeason);
        setStats(data.stats);
        setDriverProgress(data.driverProgress);
        if (data.featureStatus) {
          setFeatureStatus(data.featureStatus);
        }
      }
      loadTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  const latestSeasonNum = seasons.reduce((max, s) => Math.max(max, s.seasonNumber || 1), 1);

  return (
    <div className="space-y-8">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-950/40 via-card/90 to-purple-950/30 border border-amber-500/30 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Trophy size={14} /> Manajemen Musim & Seasonal Pass
              </span>
              <span className="px-3 py-1 rounded-full bg-card border border-border text-muted-foreground text-xs font-semibold">
                Total {seasons.length} Musim • {templates.length} Template Hadiah
              </span>
              <Link
                href="/dashboard/manage/season-pass/setting"
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border transition-all hover:scale-105 ${
                  featureStatus.isEnabled
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                    : "bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25 animate-pulse"
                }`}
              >
                <Power size={12} />
                <span>{featureStatus.isEnabled ? "Fitur Publik Aktif" : "Fitur Nonaktif (Disembunyikan)"}</span>
              </Link>
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-foreground tracking-tight">
              Pusat Kendali Season Pass
            </h1>
            <p className="text-muted-foreground text-sm max-w-2xl">
              Kelola musim yang sedang berjalan, template hadiah level 1–30, pantau progres seluruh driver, dan konfirmasi pesanan pembelian Nismara Pass.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/dashboard/manage/season-pass/setting"
              className="px-4 py-3 bg-card border border-border hover:border-amber-500/40 text-foreground font-bold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center gap-2 group"
            >
              <Settings size={16} className="text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
              <span>Pengaturan Fitur</span>
            </Link>
            <button
              onClick={handleCreateNewTemplate}
              className="px-4 py-3 bg-card border border-border hover:border-amber-500/40 text-foreground font-bold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center gap-2"
            >
              <Layers size={16} className="text-amber-400" />
              <span>+ Template Baru</span>
            </button>
            <button
              onClick={() => {
                setEditingSeason(null);
                setModalMode("CREATE");
              }}
              className="px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <Plus size={16} />
              <span>Buat Musim Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Analytics Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Driver Partisipasi</span>
            <Users size={18} className="text-blue-400" />
          </div>
          <p className="text-2xl font-black text-foreground tabular-nums">
            {stats.totalDrivers || 0} <span className="text-xs text-muted-foreground font-normal">Driver</span>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Nismara Pass Premium</span>
            <Crown size={18} className="text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 tabular-nums">
            {stats.totalPremium || 0} <span className="text-xs text-muted-foreground font-normal">Akun</span>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Driver Tamat (Lvl 30)</span>
            <CheckCircle2 size={18} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 tabular-nums">
            {stats.completedCount || 0} <span className="text-xs text-muted-foreground font-normal">Driver</span>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total XP Terdistribusi</span>
            <Sparkles size={18} className="text-purple-400" />
          </div>
          <p className="text-2xl font-black text-foreground tabular-nums">
            {(stats.totalXpEarned || 0).toLocaleString("id-ID")} <span className="text-xs text-muted-foreground font-normal">XP</span>
          </p>
        </div>
      </div>

      {/* 3. Navigation Tabs & Season Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center p-1 bg-card border border-border/80 rounded-xl w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab("SEASONS")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
              activeTab === "SEASONS"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Daftar Musim ({seasons.length})
          </button>
          <button
            onClick={() => setActiveTab("TEMPLATES")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${
              activeTab === "TEMPLATES"
                ? "bg-amber-500 text-black font-black shadow-md shadow-amber-500/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers size={13} />
            <span>Template Hadiah ({templates.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("DRIVERS")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
              activeTab === "DRIVERS"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Roster Driver ({driverProgress.length})
          </button>
          <button
            onClick={() => setActiveTab("ORDERS")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${
              activeTab === "ORDERS"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Pesanan Masuk</span>
            {pendingOrders.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black">
                {pendingOrders.length}
              </span>
            )}
          </button>
        </div>

        {/* Season Selector Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">
            Pilih Musim:
          </span>
          <select
            value={selectedSeason?.seasonNumber || 1}
            onChange={(e) => handleSelectSeason(Number(e.target.value))}
            className="px-3 py-2 rounded-xl bg-card border border-border text-xs font-bold text-foreground focus:outline-none focus:border-amber-500 w-full sm:w-auto"
          >
            {seasons.map((s) => (
              <option key={s.seasonNumber} value={s.seasonNumber}>
                Season {s.seasonNumber}: {s.title} ({s.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Tab 1: Daftar Musim */}
      {activeTab === "SEASONS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {seasons.map((s) => {
            const isActive = s.status === "ACTIVE";
            const isDraft = s.status === "DRAFT";

            return (
              <div
                key={s.seasonNumber}
                className={`relative overflow-hidden rounded-2xl border p-6 flex flex-col justify-between transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-b from-card via-card to-amber-950/20 border-amber-500/50 shadow-xl shadow-amber-500/10 ring-2 ring-amber-500/30"
                    : "bg-card border-border/80 shadow-md"
                }`}
              >
                <div className="space-y-4">
                  {/* Status & Number */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-muted text-foreground">
                      Season {s.seasonNumber}
                    </span>

                    <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                      isActive
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 animate-pulse"
                        : isDraft
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        : "bg-muted/60 border-border text-muted-foreground"
                    }`}>
                      {s.status}
                    </span>
                  </div>

                  {/* Title & Dates */}
                  <div>
                    <h3 className="text-lg font-black text-foreground">{s.title}</h3>
                    {s.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{s.subtitle}</p>}
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/40">
                    <div className="p-2 rounded-lg bg-muted/30">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">Durasi</span>
                      <span className="font-semibold text-foreground">
                        {new Date(s.startAt).toLocaleDateString("id-ID")} - {new Date(s.endAt).toLocaleDateString("id-ID")}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-muted/30">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">Target XP</span>
                      <span className="font-semibold text-foreground">{s.totalXp?.toLocaleString("id-ID")} XP</span>
                    </div>

                    <div className="p-2 rounded-lg bg-muted/30">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">Harga Pass</span>
                      <span className="font-semibold text-amber-400">Rp {s.premiumPriceIdr?.toLocaleString("id-ID")}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-muted/30">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">Harga Level</span>
                      <span className="font-semibold text-emerald-400">Rp {(s.levelPriceIdr || 2000).toLocaleString("id-ID")} / lvl</span>
                    </div>

                    <div className="p-2 rounded-lg bg-muted/30 col-span-2">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">Hadiah Puncak</span>
                      <span className="font-semibold text-foreground truncate block">{s.grandPrize?.title || "-"}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between gap-2 pt-6 mt-4 border-t border-border/40">
                  <button
                    onClick={() => {
                      setEditingSeason(s);
                      setModalMode("EDIT");
                    }}
                    className="px-3.5 py-2 rounded-xl bg-muted/60 hover:bg-muted text-foreground font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5"
                  >
                    <Edit size={13} /> Edit Musim
                  </button>

                  {!isActive && (
                    <button
                      onClick={() => handleActivateSeason(s.seasonNumber)}
                      disabled={isActivating === s.seasonNumber}
                      className="px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Sparkles size={13} />
                      {isActivating === s.seasonNumber ? "Mengaktifkan..." : "Aktifkan"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Tab 2: Template Hadiah Level (1–30) */}
      {activeTab === "TEMPLATES" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-black/20 border border-border">
            <div>
              <h3 className="text-base font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                <Layers size={18} className="text-amber-400" /> Koleksi Template Hadiah Season Pass
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pilih atau buat template hadiah 30 level. Saat membuat Season baru, Anda tinggal memilih template yang ingin digunakan tanpa perlu menyentuh kode program.
              </p>
            </div>
            <button
              onClick={handleCreateNewTemplate}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider transition shadow-lg shadow-amber-500/20 flex items-center gap-2 shrink-0"
            >
              <Plus size={15} /> Buat Template Baru
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((tpl) => {
              // Calculate template summary totals
              let freeNC = 0;
              let premNC = 0;
              let freeFuel = 0;
              let premFuel = 0;
              let totalVouchers = 0;
              let totalBadges = 0;

              tpl.levels?.forEach((lvl: any) => {
                lvl.freeRewards?.forEach((r: any) => {
                  if (r.type === "NC") freeNC += Number(r.amount || 0);
                  if (r.type === "FUEL") freeFuel += Number(r.amount || 0);
                  if (r.type === "VOUCHER") totalVouchers++;
                  if (r.type === "BADGE") totalBadges++;
                });
                lvl.premiumRewards?.forEach((r: any) => {
                  if (r.type === "NC") premNC += Number(r.amount || 0);
                  if (r.type === "FUEL") premFuel += Number(r.amount || 0);
                  if (r.type === "VOUCHER") totalVouchers++;
                  if (r.type === "BADGE") totalBadges++;
                });
              });

              return (
                <div
                  key={tpl._id}
                  className="rounded-2xl border border-border/80 bg-card p-6 flex flex-col justify-between space-y-4 shadow-md hover:border-amber-500/40 transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-black/40 border border-border text-[10px] font-black uppercase text-foreground">
                        {tpl.levels?.length || 30} Level
                      </span>
                      {tpl.isDefault ? (
                        <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <Star size={12} className="fill-amber-400" /> Default Sistem
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[10px] font-black uppercase tracking-wider">
                          Custom Template
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-base font-black text-foreground">{tpl.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {tpl.description || "Tidak ada deskripsi"}
                      </p>
                    </div>

                    {/* Breakdown Matrix */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/40">
                      <div className="p-2 rounded-lg bg-black/30">
                        <span className="text-[9px] text-muted-foreground uppercase font-bold block flex items-center gap-1">
                          <Coins size={11} className="text-amber-400" /> Total NC
                        </span>
                        <span className="font-bold text-foreground tabular-nums text-[11px]">
                          {(freeNC + premNC).toLocaleString("id-ID")} NC
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-black/30">
                        <span className="text-[9px] text-muted-foreground uppercase font-bold block flex items-center gap-1">
                          <Fuel size={11} className="text-cyan-400" /> Total Fuel
                        </span>
                        <span className="font-bold text-cyan-400 tabular-nums text-[11px]">
                          {(freeFuel + premFuel).toLocaleString("id-ID")} L
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-black/30">
                        <span className="text-[9px] text-muted-foreground uppercase font-bold block flex items-center gap-1">
                          <Zap size={11} className="text-amber-400" /> Kupon / Voucher
                        </span>
                        <span className="font-bold text-foreground text-[11px]">
                          {totalVouchers} Kupon
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-black/30">
                        <span className="text-[9px] text-muted-foreground uppercase font-bold block flex items-center gap-1">
                          <Trophy size={11} className="text-purple-400" /> Lencana Profil
                        </span>
                        <span className="font-bold text-foreground text-[11px]">
                          {totalBadges} Badge
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/40">
                    <button
                      onClick={() => setSelectedTemplateForEdit(tpl._id)}
                      className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 flex-1 justify-center"
                    >
                      <Edit size={13} /> Kustomisasi Level
                    </button>

                    <button
                      onClick={() => handleDuplicateTemplate(tpl)}
                      title="Duplikasi Template"
                      className="p-2 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition"
                    >
                      <Copy size={15} />
                    </button>

                    {!tpl.isDefault && (
                      <button
                        onClick={() => handleDeleteTemplate(tpl)}
                        title="Hapus Template"
                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Tab 3: Roster Driver */}
      {activeTab === "DRIVERS" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari nama driver atau Discord ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
              Menampilkan {filteredDrivers.length} dari {driverProgress.length} Driver
            </span>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground uppercase font-black tracking-wider">
                  <tr>
                    <th className="p-3.5">Driver</th>
                    <th className="p-3.5">Status Pass</th>
                    <th className="p-3.5">Level Saat Ini</th>
                    <th className="p-3.5">Total Seasonal XP</th>
                    <th className="p-3.5">Hadiah Diklaim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredDrivers.length > 0 ? (
                    filteredDrivers.map((p) => {
                      const isComplete = p.currentLevel >= 30;
                      return (
                        <tr key={p._id} className="hover:bg-muted/20 transition">
                          <td className="p-3.5 font-bold text-foreground">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center font-black text-xs text-muted-foreground">
                                {p.user?.name ? p.user.name[0].toUpperCase() : "D"}
                              </div>
                              <div>
                                <p className="font-bold text-foreground">{p.user?.name || "Driver Nismara"}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">{p.discordId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            {p.isPremium ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[10px] uppercase">
                                <Crown size={11} className="fill-amber-400" /> Premium
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground font-bold text-[10px] uppercase">
                                Free Track
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className={`font-black text-xs ${isComplete ? "text-emerald-400" : "text-foreground"}`}>
                              Level {p.currentLevel} / 30
                            </span>
                          </td>
                          <td className="p-3.5 font-mono font-bold text-foreground">
                            {(p.currentXp || 0).toLocaleString("id-ID")} XP
                          </td>
                          <td className="p-3.5 text-muted-foreground">
                            Free: {p.claimedFreeLevels?.length || 0} | Prem: {p.claimedPremiumLevels?.length || 0}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        Tidak ada driver yang cocok dengan pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. Tab 4: Pesanan Masuk (Pass Orders) */}
      {activeTab === "ORDERS" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
            <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-foreground space-y-1">
              <p className="font-bold">Otorisasi Khusus Owner & Developer</p>
              <p className="text-muted-foreground">
                Sesuai kebijakan resmi, pesanan Nismara Pass Premium hanya dapat disetujui atau ditolak secara langsung oleh <strong>Owner / Developer</strong> setelah bukti transfer diverifikasi.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground uppercase font-black tracking-wider">
                  <tr>
                    <th className="p-3.5">Driver / Pemesan</th>
                    <th className="p-3.5">Paket / Tipe</th>
                    <th className="p-3.5">Musim</th>
                    <th className="p-3.5">Total Tagihan</th>
                    <th className="p-3.5">Tanggal Order</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Aksi Konfirmasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {orders.length > 0 ? (
                    orders.map((o) => {
                      const isPending = o.status === "pending";
                      const isSuccess = o.status === "success";
                      const isRejected = o.status === "rejected";
                      const isLevelSkip = o.orderType === "LEVEL_SKIP";

                      return (
                        <tr key={o._id} className="hover:bg-muted/20 transition">
                          <td className="p-3.5 font-bold text-foreground">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center font-black text-xs text-muted-foreground">
                                {o.userId?.name ? o.userId.name[0].toUpperCase() : "D"}
                              </div>
                              <div>
                                <p className="font-bold text-foreground">{o.userId?.name || "Driver"}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">{o.discordId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            {isLevelSkip ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold text-[10px] uppercase">
                                  <Zap size={11} className="fill-orange-400" /> Level Skip (+{o.levelCount || 1} Lvl)
                                </span>
                                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                  Lvl {o.startLevel || "?"} ➔ Lvl {o.targetLevel || "?"}
                                </p>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[10px] uppercase">
                                <Crown size={11} className="fill-amber-400" /> Pass Premium
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 font-black text-foreground">
                            Season {o.seasonNumber}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-amber-400">
                            Rp {(o.amountIDR || 35000).toLocaleString("id-ID")}
                          </td>
                          <td className="p-3.5 text-muted-foreground">
                            {new Date(o.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase border ${
                                isPending
                                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse"
                                  : isSuccess
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : "bg-red-500/10 border-red-500/30 text-red-400"
                              }`}
                            >
                              {o.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            {isPending && isOwner ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOrderAction(o._id, "APPROVE", o.userId?.name || o.discordId)}
                                  disabled={processingOrderId === o._id}
                                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs uppercase tracking-wider rounded-lg transition shadow-sm flex items-center gap-1 disabled:opacity-50"
                                >
                                  <Check size={13} />
                                  <span>{processingOrderId === o._id ? "Memproses..." : "Setujui"}</span>
                                </button>
                                <button
                                  onClick={() => handleOrderAction(o._id, "REJECT", o.userId?.name || o.discordId)}
                                  disabled={processingOrderId === o._id}
                                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs uppercase tracking-wider rounded-lg transition flex items-center gap-1 disabled:opacity-50"
                                >
                                  <XCircle size={13} />
                                  <span>Tolak</span>
                                </button>
                              </div>
                            ) : isPending && !isOwner ? (
                              <span className="text-[11px] text-muted-foreground italic">Menunggu Owner</span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">Selesai</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        Belum ada pesanan Nismara Pass yang masuk.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 8. Season Form Modal (Create / Edit) */}
      <SeasonFormModal
        isOpen={modalMode !== null}
        onClose={() => setModalMode(null)}
        onSuccess={refreshData}
        mode={modalMode || "CREATE"}
        initialData={editingSeason}
        latestSeasonNumber={latestSeasonNum}
      />

      {/* 9. Template Level Editor Modal (1–30) */}
      <TemplateEditorModal
        isOpen={selectedTemplateForEdit !== null}
        onClose={() => setSelectedTemplateForEdit(null)}
        onSuccess={refreshData}
        templateId={selectedTemplateForEdit}
      />
    </div>
  );
}
