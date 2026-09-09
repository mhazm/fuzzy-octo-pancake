"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Ticket,
  Coins,
  ShieldAlert,
  Calendar,
  Clock,
  ExternalLink,
  Edit2,
  Trash2,
  PowerOff,
  Search,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  Sparkles,
  Upload,
  X,
  CheckCircle2,
  Copy,
  Check,
  Timer,
  History,
  Users,
  Award,
} from "lucide-react";
import { compressImageToWebP } from "@/lib/imageUtils";
import { useSession } from "next-auth/react";
import { showAlert, showConfirm } from "@/lib/dialog";
import {
  createCouponAction,
  updateCouponAction,
  closeCouponAction,
  deleteCouponAction,
} from "@/app/actions/couponActions";

export default function CouponManageUI({
  initialCoupons = [],
}: {
  initialCoupons: any[];
}) {
  const { data: session } = useSession();
  const [coupons, setConvoys] = useState<any[]>(initialCoupons);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "scheduled" | "history">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "NC" | "PENALTY_TICKET">("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // Helper for WIB default datetime-local value
  const getWIBDateTimeLocal = (date: Date) => {
    const wibDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    const year = wibDate.getFullYear();
    const month = String(wibDate.getMonth() + 1).padStart(2, "0");
    const day = String(wibDate.getDate()).padStart(2, "0");
    const hours = String(wibDate.getHours()).padStart(2, "0");
    const minutes = String(wibDate.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getInitialFormState = () => {
    const defaultStartDate = new Date();
    defaultStartDate.setHours(defaultStartDate.getHours() + 1);

    const defaultEndDate = new Date();
    defaultEndDate.setDate(defaultEndDate.getDate() + 7);

    return {
      nameCoupon: "",
      codeCoupon: "",
      type: "NC" as "NC" | "PENALTY_TICKET",
      minAmount: 1000,
      maxAmount: 5000,
      isScheduled: false,
      startDate: getWIBDateTimeLocal(defaultStartDate),
      endDate: getWIBDateTimeLocal(defaultEndDate),
      imageUrl: "",
    };
  };

  const [formData, setFormData] = useState(getInitialFormState());

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

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Metrics Calculation
  const stats = useMemo(() => {
    const now = new Date();
    const active = coupons.filter(
      (c) => c.isActive !== false && (!c.startDate || new Date(c.startDate) <= now) && (!c.endDate || new Date(c.endDate) > now)
    );
    const scheduled = coupons.filter(
      (c) => c.isScheduled === true && c.startDate && new Date(c.startDate) > now
    );
    const history = coupons.filter(
      (c) => c.isActive === false || (c.endDate && new Date(c.endDate) <= now)
    );

    const totalClaims = coupons.reduce((acc, c) => acc + (c.driverClaims?.length || 0), 0);
    const totalNcDistributed = coupons
      .filter((c) => c.type === "NC")
      .reduce((acc, c) => {
        const claimsSum = c.driverClaims?.reduce((s: number, d: any) => s + (d.ncAmount || d.amount || 0), 0) || 0;
        return acc + (c.totalNcClaimed || claimsSum);
      }, 0);

    return {
      activeCount: active.length,
      scheduledCount: scheduled.length,
      historyCount: history.length,
      totalClaims,
      totalNcDistributed,
    };
  }, [coupons]);

  // Filtered Groups
  const { filteredActive, filteredScheduled, filteredHistory } = useMemo(() => {
    const now = new Date();

    const matchesFilter = (c: any) => {
      const matchType = typeFilter === "all" || c.type === typeFilter;
      const matchSearch =
        !search ||
        c.nameCoupon?.toLowerCase().includes(search.toLowerCase()) ||
        c.codeCoupon?.toLowerCase().includes(search.toLowerCase()) ||
        c.setBy?.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    };

    const active = coupons.filter(
      (c) =>
        matchesFilter(c) &&
        c.isActive !== false &&
        (!c.startDate || new Date(c.startDate) <= now) &&
        (!c.endDate || new Date(c.endDate) > now)
    );

    const scheduled = coupons.filter(
      (c) =>
        matchesFilter(c) &&
        c.isScheduled === true &&
        c.startDate &&
        new Date(c.startDate) > now
    );

    const history = coupons.filter(
      (c) =>
        matchesFilter(c) &&
        (c.isActive === false || (c.endDate && new Date(c.endDate) <= now))
    );

    return {
      filteredActive: active,
      filteredScheduled: scheduled,
      filteredHistory: history,
    };
  }, [coupons, typeFilter, search]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showAlert("Format tidak didukung! Harap unggah file gambar (PNG, JPG, WebP, GIF).");
      return;
    }

    const isNismaraPlus = (session?.user as any)?.nismaraplus?.status === true;
    if (!isNismaraPlus && file.type === "image/gif") {
      showAlert("Hanya member Nismara+ yang diizinkan mengunggah GIF.");
      return;
    }

    const maxSizeMB = isNismaraPlus ? 5 : 3;
    if (file.size > maxSizeMB * 1024 * 1024) {
      showAlert(`Maksimal ukuran file adalah ${maxSizeMB}MB.`);
      return;
    }

    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setEditingId(null);
    setBannerFile(null);
    setBannerPreview(null);
    setFormData(getInitialFormState());
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setIsEditMode(true);
    setEditingId(item._id.toString());
    setBannerFile(null);
    setBannerPreview(item.imageUrl || null);

    setFormData({
      nameCoupon: item.nameCoupon || "",
      codeCoupon: item.codeCoupon || "",
      type: item.type || "NC",
      minAmount: item.minAmount || 1000,
      maxAmount: item.maxAmount || 5000,
      isScheduled: !!item.isScheduled,
      startDate: item.startDate ? getWIBDateTimeLocal(new Date(item.startDate)) : "",
      endDate: item.endDate ? getWIBDateTimeLocal(new Date(item.endDate)) : "",
      imageUrl: item.imageUrl || "",
    });

    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nameCoupon || !formData.codeCoupon || !formData.endDate) {
      showAlert("Harap lengkapi nama kupon, kode kupon, dan batas waktu kedaluwarsa!");
      return;
    }

    if (formData.minAmount > formData.maxAmount) {
      showAlert("Nominal Min tidak boleh lebih besar dari Nominal Max!");
      return;
    }

    if (formData.isScheduled && !formData.startDate) {
      showAlert("Harap tentukan tanggal mulai untuk kupon yang dijadwalkan!");
      return;
    }

    setIsSubmitting(true);

    try {
      let finalImageUrl = formData.imageUrl;

      if (bannerFile) {
        const isNismaraPlus = (session?.user as any)?.nismaraplus?.status === true;
        const compressed = await compressImageToWebP(bannerFile, isNismaraPlus ? 5 : 3, 1920);

        const presignRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: compressed.name,
            fileType: compressed.type,
            folder: "coupons",
            fileSize: compressed.size,
          }),
        });

        if (!presignRes.ok) {
          const errData = await presignRes.json();
          throw new Error(errData.error || "Gagal mendapatkan presigned upload URL.");
        }

        const { signedUrl, publicUrl } = await presignRes.json();
        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": compressed.type },
          body: compressed,
        });

        if (!uploadRes.ok) {
          throw new Error("Gagal mengunggah banner kupon ke storage.");
        }

        finalImageUrl = publicUrl;
      }

      if (isEditMode && editingId) {
        const res = await updateCouponAction(editingId, {
          ...formData,
          imageUrl: finalImageUrl,
        });
        if (!res.success) throw new Error(res.error || "Gagal memperbarui kupon.");
        await showAlert("Perubahan kupon berhasil disimpan!");
      } else {
        const res = await createCouponAction({
          ...formData,
          imageUrl: finalImageUrl,
        });
        if (!res.success) throw new Error(res.error || "Gagal membuat kupon baru.");
        await showAlert("Kupon berhasil dibuat dan disiarkan!");
      }

      setIsModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      await showAlert(err.message || "Terjadi kesalahan saat menyimpan kupon.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseCoupon = async (id: string, name: string) => {
    const confirm = await showConfirm(
      `Tutup dan nonaktifkan kupon "${name}" sekarang? Driver tidak akan bisa mengklaim kode ini lagi.`
    );
    if (!confirm) return;

    try {
      const res = await closeCouponAction(id);
      if (res.success) {
        await showAlert(`Kupon "${name}" berhasil dinonaktifkan.`);
        window.location.reload();
      } else {
        await showAlert("Gagal menutup kupon.");
      }
    } catch (err: any) {
      await showAlert(err.message || "Terjadi kesalahan saat menutup kupon.");
    }
  };

  const handleDeleteCoupon = async (id: string, name: string) => {
    const confirm = await showConfirm(
      `Hapus permanen kupon "${name}"? Gambar banner di Cloudflare R2 juga akan dibersihkan. Tindakan ini tidak dapat dibatalkan.`
    );
    if (!confirm) return;

    try {
      const res = await deleteCouponAction(id);
      if (res.success) {
        await showAlert(`Kupon "${name}" berhasil dihapus.`);
        window.location.reload();
      } else {
        await showAlert("Gagal menghapus kupon.");
      }
    } catch (err: any) {
      await showAlert(err.message || "Terjadi kesalahan saat menghapus kupon.");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* 1. EXECUTIVE HERO COMMAND BANNER */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-card via-card/95 to-amber-500/10 border border-border p-6 md:p-10 shadow-2xl backdrop-blur-xl">
        {/* Glow Spheres */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
              <Sparkles size={13} /> Special Dispatch & Reward Promotion Engine
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground uppercase">
              Coupon <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-primary to-accent-sky">Management</span>
            </h1>
            <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">
              Otorisasi kode kupon hadiah Nismara Coin (NC) dan Tiket Penghapusan Penalti, kelola antrean kupon terjadwal, serta pantau statistik klaim komunitas pengemudi.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              href="/coupons"
              target="_blank"
              className="px-5 py-4 rounded-2xl bg-card border border-border hover:border-primary/40 text-foreground font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg hover:scale-105"
            >
              <ExternalLink size={16} /> Public Hub
            </Link>
            <button
              onClick={openCreateModal}
              className="bg-primary text-primary-foreground px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-3 shadow-xl hover:brightness-110 hover:scale-105 active:scale-95 shadow-primary/25"
            >
              <Plus size={18} /> New Coupon
            </button>
          </div>
        </div>
      </div>

      {/* 2. STATISTICAL METRICS OVERVIEW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Active Coupons */}
        <div className="p-5 rounded-3xl border border-border/80 bg-card flex flex-col justify-between space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Active Coupons
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Timer size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-foreground tabular-nums">
              {stats.activeCount}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {stats.activeCount > 0 ? "Kupon Aktif Berjalan" : "Tidak Ada Kupon Aktif"}
            </div>
          </div>
        </div>

        {/* Metric 2: Scheduled */}
        <div className="p-5 rounded-3xl border border-border/80 bg-card flex flex-col justify-between space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
              Scheduled Queues
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-amber-400 tabular-nums">
              {stats.scheduledCount}
            </div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1">
              Antrean Peluncuran Kupon
            </p>
          </div>
        </div>

        {/* Metric 3: Total Claims */}
        <div className="p-5 rounded-3xl border border-border/80 bg-card flex flex-col justify-between space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-sky-400">
              Total Redemptions
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-sky-400 tabular-nums">
              {stats.totalClaims} Klaim
            </div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1">
              Partisipasi Driver
            </p>
          </div>
        </div>

        {/* Metric 4: Total NC Distributed */}
        <div className="p-5 rounded-3xl border border-border/80 bg-card flex flex-col justify-between space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">
              NC Distributed
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-300 flex items-center justify-center">
              <Coins size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-300 tabular-nums">
              N¢ {stats.totalNcDistributed.toLocaleString("id-ID")}
            </div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1">
              Akumulasi Reward Terbagi
            </p>
          </div>
        </div>
      </div>

      {/* 3. FILTER TABS, TYPE SELECTOR & SEARCH */}
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
            <Layers size={14} /> Semua ({coupons.length})
          </button>
          <button
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "active"
                ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            <Timer size={14} /> Aktif ({stats.activeCount})
          </button>
          <button
            onClick={() => setActiveTab("scheduled")}
            className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "scheduled"
                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            <Clock size={14} /> Terjadwal ({stats.scheduledCount})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "history"
                ? "bg-foreground/20 text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            <History size={14} /> Riwayat ({stats.historyCount})
          </button>
        </div>

        {/* Type Filter & Search Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Type Pills */}
          <div className="flex items-center bg-black/20 border border-border rounded-2xl p-1">
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                typeFilter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setTypeFilter("NC")}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                typeFilter === "NC" ? "bg-amber-500 text-black" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              NC Reward
            </button>
            <button
              onClick={() => setTypeFilter("PENALTY_TICKET")}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                typeFilter === "PENALTY_TICKET" ? "bg-red-500 text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tiket Penalti
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Cari kupon atau kode..."
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

      {/* 4. ACTIVE COUPONS SECTION */}
      {(activeTab === "all" || activeTab === "active") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-foreground uppercase flex items-center gap-2">
              <Timer className="text-emerald-400" size={20} />
              Kupon Aktif Berjalan ({filteredActive.length})
            </h2>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Live Claimable
            </span>
          </div>

          {filteredActive.length > 0 ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredActive.map((coupon) => {
                  const isNC = coupon.type === "NC";
                  return (
                    <div
                      key={coupon._id.toString()}
                      className="group bg-card border border-border hover:border-emerald-500/40 rounded-[2.5rem] overflow-hidden flex flex-col justify-between shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
                    >
                      {/* Top Banner & Cutout Effect */}
                      <div className="relative h-44 w-full overflow-hidden bg-muted">
                        <img
                          src={coupon.imageUrl || "https://i.imgur.com/iMTOi8Z.png"}
                          alt={coupon.nameCoupon}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-card via-black/50 to-transparent" />

                        {/* Top Badges */}
                        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border backdrop-blur-md shadow-lg ${
                              isNC
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                : "bg-red-500/20 text-red-300 border-red-500/30"
                            }`}
                          >
                            {isNC ? "Nismara Coin" : "Tiket Penalti"}
                          </span>

                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-black font-bold flex items-center gap-1.5 shadow-lg">
                            <span className="w-1.5 h-1.5 rounded-full bg-black" /> Live
                          </span>
                        </div>

                        {/* Code Overlay */}
                        <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                              Kode Klaim
                            </p>
                            <h3 className="text-xl font-black text-white font-mono tracking-wider">
                              {coupon.codeCoupon}
                            </h3>
                          </div>
                          <button
                            onClick={() => handleCopyCode(coupon.codeCoupon)}
                            title="Salin Kode"
                            className="p-2.5 rounded-xl bg-black/60 border border-white/10 text-white hover:bg-primary hover:border-primary transition-all shadow-lg"
                          >
                            {copiedCode === coupon.codeCoupon ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Content Body */}
                      <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-lg font-black text-foreground uppercase tracking-tight line-clamp-1 mb-1">
                            {coupon.nameCoupon}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Diterbitkan oleh: <strong className="text-foreground">{coupon.setBy || "Manager"}</strong></span>
                          </div>
                        </div>

                        {/* Reward & Stat Matrix */}
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                              Nominal Reward
                            </span>
                            <span className={`font-black ${isNC ? "text-amber-400" : "text-red-400"}`}>
                              {isNC
                                ? `N¢ ${coupon.minAmount?.toLocaleString("id-ID")} - ${coupon.maxAmount?.toLocaleString("id-ID")}`
                                : `${coupon.minAmount} - ${coupon.maxAmount} Tiket`}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[10px]">
                            <div>
                              <span className="text-muted-foreground uppercase font-black tracking-wider block">Total Klaim</span>
                              <p className="font-bold text-foreground">{coupon.driverClaims?.length || 0} Drivers</p>
                            </div>
                            <div className="text-right">
                              <span className="text-muted-foreground uppercase font-black tracking-wider block">Kedaluwarsa</span>
                              <p className="font-bold text-red-400 line-clamp-1">{formatDate(coupon.endDate)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2 pt-2 border-t border-border/60">
                          <div className="grid grid-cols-2 gap-2">
                            <Link
                              href={`/coupons/${coupon.codeCoupon}`}
                              className="py-3 px-4 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-primary/20"
                            >
                              Laman Publik <ExternalLink size={14} />
                            </Link>
                            <button
                              onClick={() => openEditModal(coupon)}
                              className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-foreground font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-border"
                            >
                              <Edit2 size={13} /> Edit Kupon
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleCloseCoupon(coupon._id.toString(), coupon.nameCoupon)}
                              className="py-2.5 px-3 rounded-xl bg-orange-500/10 hover:bg-orange-500 hover:text-black text-orange-400 font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 border border-orange-500/20"
                            >
                              <PowerOff size={12} /> Tutup Kupon
                            </button>
                            <button
                              onClick={() => handleDeleteCoupon(coupon._id.toString(), coupon.nameCoupon)}
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
              /* TABLE VIEW ACTIVE */
              <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-foreground/5 text-foreground/40 text-[10px] font-black uppercase tracking-widest border-b border-border">
                      <tr>
                        <th className="px-8 py-5">Tipe</th>
                        <th className="px-8 py-5">Kode & Nama Kupon</th>
                        <th className="px-8 py-5">Nominal Hadiah</th>
                        <th className="px-8 py-5">Klaim Driver</th>
                        <th className="px-8 py-5 text-right">Kedaluwarsa</th>
                        <th className="px-8 py-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredActive.map((coupon) => {
                        const isNC = coupon.type === "NC";
                        return (
                          <tr key={coupon._id.toString()} className="hover:bg-foreground/[0.02] transition-colors group">
                            <td className="px-8 py-5">
                              <span
                                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${
                                  isNC ? "bg-amber-500/15 text-amber-300 border-amber-500/30" : "bg-red-500/15 text-red-300 border-red-500/30"
                                }`}
                              >
                                {isNC ? "NC Reward" : "Tiket Penalti"}
                              </span>
                            </td>
                            <td className="px-8 py-5">
                              <p className="font-black text-foreground uppercase group-hover:text-primary transition-colors">
                                {coupon.nameCoupon}
                              </p>
                              <span className="font-mono text-xs text-primary font-bold">
                                {coupon.codeCoupon}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-xs font-bold text-foreground">
                              {isNC
                                ? `N¢ ${coupon.minAmount?.toLocaleString("id-ID")} - ${coupon.maxAmount?.toLocaleString("id-ID")}`
                                : `${coupon.minAmount} - ${coupon.maxAmount} Tiket`}
                            </td>
                            <td className="px-8 py-5 tabular-nums font-bold text-foreground">
                              {coupon.driverClaims?.length || 0} Klaim
                            </td>
                            <td className="px-8 py-5 text-right text-xs font-bold text-red-400">
                              {formatDate(coupon.endDate)}
                            </td>
                            <td className="px-8 py-5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  href={`/coupons/${coupon.codeCoupon}`}
                                  title="Laman Publik"
                                  className="p-2 rounded-xl bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors border border-border/60"
                                >
                                  <ExternalLink size={14} />
                                </Link>
                                <button
                                  onClick={() => openEditModal(coupon)}
                                  title="Edit Kupon"
                                  className="p-2 rounded-xl bg-white/5 hover:bg-accent-sky/20 text-muted-foreground hover:text-accent-sky transition-colors border border-border/60"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleCloseCoupon(coupon._id.toString(), coupon.nameCoupon)}
                                  title="Tutup Kupon"
                                  className="p-2 rounded-xl bg-white/5 hover:bg-orange-500/20 text-muted-foreground hover:text-orange-500 transition-colors border border-border/60"
                                >
                                  <PowerOff size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteCoupon(coupon._id.toString(), coupon.nameCoupon)}
                                  title="Hapus Kupon"
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
                <Ticket size={24} />
              </div>
              <p className="text-foreground font-bold text-sm">Tidak ada kupon aktif saat ini.</p>
              <p className="text-muted-foreground text-xs max-w-md mx-auto">
                Klik tombol "New Coupon" di atas untuk membuat dan menerbitkan kupon hadiah baru bagi komunitas.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 5. SCHEDULED COUPONS SECTION */}
      {(activeTab === "all" || activeTab === "scheduled") && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-foreground uppercase flex items-center gap-2">
              <Clock className="text-amber-400" size={20} />
              Kupon Terjadwal ({filteredScheduled.length})
            </h2>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
              Upcoming Queue
            </span>
          </div>

          {filteredScheduled.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredScheduled.map((coupon) => {
                const isNC = coupon.type === "NC";
                return (
                  <div
                    key={coupon._id.toString()}
                    className="group bg-card border border-amber-500/30 hover:border-amber-400/60 rounded-[2.5rem] overflow-hidden flex flex-col justify-between shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent"
                  >
                    {/* Banner */}
                    <div className="relative h-40 w-full overflow-hidden bg-muted">
                      <img
                        src={coupon.imageUrl || "https://i.imgur.com/iMTOi8Z.png"}
                        alt={coupon.nameCoupon}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-black/50 to-transparent" />

                      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-black border border-amber-400 font-bold shadow-lg flex items-center gap-1.5">
                          <Clock size={12} /> Scheduled
                        </span>
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-white/20 bg-black/50 text-white backdrop-blur-md">
                          {isNC ? "NC Reward" : "Tiket Penalti"}
                        </span>
                      </div>

                      <div className="absolute bottom-4 left-6 right-6">
                        <h3 className="text-xl font-black text-white font-mono tracking-wider">
                          {coupon.codeCoupon}
                        </h3>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-lg font-black text-foreground uppercase tracking-tight line-clamp-1">
                          {coupon.nameCoupon}
                        </h4>
                        <p className="text-xs text-amber-300 font-bold mt-1">
                          Mulai: {formatDate(coupon.startDate)}
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-border/60">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => openEditModal(coupon)}
                            className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-foreground font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-border"
                          >
                            <Edit2 size={13} /> Edit Jadwal
                          </button>
                          <button
                            onClick={() => handleDeleteCoupon(coupon._id.toString(), coupon.nameCoupon)}
                            className="py-3 px-4 rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-red-500/20"
                          >
                            <Trash2 size={13} /> Batalkan
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 rounded-[2.5rem] border border-border bg-card text-center space-y-2">
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
                Tidak ada antrean kupon yang dijadwalkan saat ini.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 6. PAST / EXPIRED COUPONS SECTION */}
      {(activeTab === "all" || activeTab === "history") && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-foreground uppercase flex items-center gap-2">
              <History className="text-muted-foreground" size={20} />
              Riwayat Kupon Kedaluwarsa ({filteredHistory.length})
            </h2>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Redeemed & Expired Archive
            </span>
          </div>

          <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-foreground/5 text-foreground/40 text-[10px] font-black uppercase tracking-widest border-b border-border">
                  <tr>
                    <th className="px-8 py-5">Tipe</th>
                    <th className="px-8 py-5">Kode & Nama Kupon</th>
                    <th className="px-8 py-5">Nominal Hadiah</th>
                    <th className="px-8 py-5">Klaim Sukses</th>
                    <th className="px-8 py-5 text-right">Berakhir Pada</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredHistory.length > 0 ? (
                    filteredHistory.map((coupon) => {
                      const isNC = coupon.type === "NC";
                      return (
                        <tr key={coupon._id.toString()} className="hover:bg-foreground/[0.02] transition-colors group">
                          <td className="px-8 py-5">
                            <span
                              className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${
                                isNC ? "bg-amber-500/15 text-amber-300 border-amber-500/30" : "bg-red-500/15 text-red-300 border-red-500/30"
                              }`}
                            >
                              {isNC ? "NC Reward" : "Tiket Penalti"}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <p className="font-black text-foreground uppercase group-hover:text-primary transition-colors">
                              {coupon.nameCoupon}
                            </p>
                            <span className="font-mono text-xs text-muted-foreground">
                              {coupon.codeCoupon}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-xs text-muted-foreground font-bold">
                            {isNC
                              ? `N¢ ${coupon.minAmount?.toLocaleString("id-ID")} - ${coupon.maxAmount?.toLocaleString("id-ID")}`
                              : `${coupon.minAmount} - ${coupon.maxAmount} Tiket`}
                          </td>
                          <td className="px-8 py-5 tabular-nums font-bold text-foreground">
                            {coupon.driverClaims?.length || 0} Drivers
                          </td>
                          <td className="px-8 py-5 text-right text-xs text-muted-foreground font-mono font-bold">
                            {formatDate(coupon.endDate)}
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/coupons/${coupon.codeCoupon}`}
                                title="Lihat Laman Publik"
                                className="p-2 rounded-xl bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors border border-border/60"
                              >
                                <ExternalLink size={14} />
                              </Link>
                              <button
                                onClick={() => openEditModal(coupon)}
                                title="Edit Parameter"
                                className="p-2 rounded-xl bg-white/5 hover:bg-accent-sky/20 text-muted-foreground hover:text-accent-sky transition-colors border border-border/60"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteCoupon(coupon._id.toString(), coupon.nameCoupon)}
                                title="Hapus Arsip"
                                className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-colors border border-border/60"
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
                        Tidak ada riwayat kupon yang sesuai filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: CREATE / EDIT COUPON */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <form
            onSubmit={handleSubmit}
            className="bg-card border border-border p-6 md:p-10 rounded-[3rem] w-full max-w-xl shadow-2xl space-y-6 relative overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between relative z-10 border-b border-border/50 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-primary tracking-widest">
                  {isEditMode ? "Adjustment Mode" : "Deployment Form"}
                </span>
                <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">
                  {isEditMode ? "Edit Coupon Parameters" : "New Reward Coupon"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 relative z-10">
              {/* Type Selector Pills */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-accent-lilac uppercase tracking-widest ml-1">
                  Tipe Hadiah Kupon *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: "NC" })}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                      formData.type === "NC"
                        ? "bg-amber-500/10 border-amber-500 text-amber-400 shadow-md shadow-amber-500/10"
                        : "bg-black/20 border-white/5 text-muted-foreground hover:border-white/20"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                      <Coins size={20} />
                    </div>
                    <div>
                      <p className="font-black text-sm uppercase">Nismara Coin</p>
                      <p className="text-[9px] font-medium opacity-70">Hadiah Saldo NC</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: "PENALTY_TICKET" })}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                      formData.type === "PENALTY_TICKET"
                        ? "bg-red-500/10 border-red-500 text-red-400 shadow-md shadow-red-500/10"
                        : "bg-black/20 border-white/5 text-muted-foreground hover:border-white/20"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-red-500/20 text-red-400">
                      <ShieldAlert size={20} />
                    </div>
                    <div>
                      <p className="font-black text-sm uppercase">Tiket Penalti</p>
                      <p className="text-[9px] font-medium opacity-70">Penghapusan Poin</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-accent-lilac uppercase tracking-widest ml-1">
                    Nama Kupon *
                  </label>
                  <input
                    placeholder="Contoh: Kupon Ramadhan 2026"
                    required
                    value={formData.nameCoupon}
                    onChange={(e) => setFormData({ ...formData, nameCoupon: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-2xl p-3.5 text-foreground text-sm outline-none focus:border-accent-lilac transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-accent-lilac uppercase tracking-widest ml-1">
                    Kode Kupon (Unik) *
                  </label>
                  <input
                    placeholder="RAMADHAN2026"
                    required
                    value={formData.codeCoupon}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        codeCoupon: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""),
                      })
                    }
                    className="w-full bg-black/20 border border-white/10 rounded-2xl p-3.5 text-foreground font-mono text-sm outline-none focus:border-accent-lilac transition-all"
                  />
                </div>
              </div>

              {/* Min & Max Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-accent-lilac uppercase tracking-widest ml-1">
                    Min {formData.type === "NC" ? "Nominal (NC)" : "Tiket"} *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.minAmount}
                    onChange={(e) => setFormData({ ...formData, minAmount: Number(e.target.value) })}
                    className="w-full bg-black/20 border border-white/10 rounded-2xl p-3.5 text-foreground text-sm outline-none focus:border-accent-lilac transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-accent-lilac uppercase tracking-widest ml-1">
                    Max {formData.type === "NC" ? "Nominal (NC)" : "Tiket"} *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.maxAmount}
                    onChange={(e) => setFormData({ ...formData, maxAmount: Number(e.target.value) })}
                    className="w-full bg-black/20 border border-white/10 rounded-2xl p-3.5 text-foreground text-sm outline-none focus:border-accent-lilac transition-all"
                  />
                </div>
              </div>

              {/* Scheduled Toggle */}
              <div className="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-accent-lilac rounded-md"
                    checked={formData.isScheduled}
                    onChange={(e) => setFormData({ ...formData, isScheduled: e.target.checked })}
                  />
                  <span className="text-xs font-bold text-foreground">
                    Jadwalkan Kupon (Scheduled Launch)
                  </span>
                </label>

                {formData.isScheduled && (
                  <div className="space-y-1.5 pt-2 animate-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest ml-1">
                      Waktu Mulai (Kickoff Time) *
                    </label>
                    <input
                      type="datetime-local"
                      required={formData.isScheduled}
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full bg-black/30 border border-amber-500/30 rounded-2xl p-3.5 text-foreground text-sm outline-none focus:border-amber-400 transition-all [color-scheme:dark]"
                    />
                  </div>
                )}
              </div>

              {/* End Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-accent-lilac uppercase tracking-widest ml-1">
                  Waktu Kedaluwarsa *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-2xl p-3.5 text-foreground text-sm outline-none focus:border-accent-lilac transition-all [color-scheme:dark]"
                />
              </div>

              {/* Banner Cover Upload */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-accent-lilac uppercase tracking-widest ml-1">
                  Banner Cover Kupon (Opsional)
                </label>

                {bannerPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-emerald-500/40 h-36 group">
                    <img src={bannerPreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => {
                          setBannerPreview(null);
                          setBannerFile(null);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                      >
                        <Trash2 size={14} /> Ganti Banner
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={isSubmitting}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-20"
                    />
                    <div className="w-full bg-black/20 border-2 border-dashed border-white/10 hover:border-accent-lilac/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 transition-colors">
                      <Upload size={24} className="text-muted-foreground" />
                      <p className="text-xs font-bold text-foreground">Klik atau Tarik Gambar Banner ke Sini</p>
                      <p className="text-[10px] text-muted-foreground">PNG, JPG, WebP (Maks 3MB / Nismara+ 5MB)</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col gap-3 pt-4 border-t border-border/50 relative z-10">
              <button
                disabled={isSubmitting}
                type="submit"
                className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-primary/25 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                    Memproses Kupon...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />{" "}
                    {isEditMode ? "Simpan Perubahan Kupon" : "Publikasikan & Siarkan Kupon"}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-full py-2.5 text-muted-foreground hover:text-foreground font-black uppercase text-[10px] tracking-widest transition-colors"
              >
                Batalkan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
