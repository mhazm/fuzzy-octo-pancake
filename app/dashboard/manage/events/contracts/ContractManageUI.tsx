"use client";

import { useState, useEffect, useMemo } from "react";
import {
  createContractAction,
  closeContractAction,
  deleteContractAction,
} from "@/app/actions/contractActions";
import Link from "next/link";
import {
  Plus,
  Calendar,
  History,
  Timer,
  Clock,
  Truck,
  ChevronRight,
  Briefcase,
  Edit3,
  Upload,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  Sparkles,
  Coins,
  PowerOff,
  X,
  ExternalLink,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Flame,
} from "lucide-react";
import { compressImageToWebP } from "@/lib/imageUtils";
import { useSession } from "next-auth/react";
import { showAlert, showConfirm } from "@/lib/dialog";

export default function ContractManageUI({
  ongoing = [],
  scheduled = [],
  history = [],
  manager,
}: any) {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "ongoing" | "scheduled" | "history">("all");
  const [gameFilter, setGameFilter] = useState<"all" | "1" | "2">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const [formData, setFormData] = useState({
    contractName: "",
    companyName: "",
    imageUrl: "",
    gameId: "1",
    endAt: "",
    isScheduled: false,
    startDate: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatDate = (dateString: string) => {
    if (!mounted || !dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });
  };

  const formatDateTime = (dateString: string) => {
    if (!mounted || !dateString) return "-";
    return (
      new Date(dateString).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " WIB"
    );
  };

  const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, "-");

  const getGameInfo = (id: string) => {
    return id === "2"
      ? {
          name: "ATS",
          fullName: "American Truck Simulator",
          color: "text-amber-400",
          bg: "bg-amber-500/10",
          border: "border-amber-500/30",
          badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        }
      : {
          name: "ETS2",
          fullName: "Euro Truck Simulator 2",
          color: "text-accent-lilac",
          bg: "bg-accent-lilac/10",
          border: "border-accent-lilac/30",
          badge: "bg-accent-lilac/20 text-accent-lilac border-accent-lilac/40",
        };
  };

  // Metrics Calculations
  const stats = useMemo(() => {
    const allContracts = [...ongoing, ...scheduled, ...history];
    const totalNCEarned = allContracts.reduce((acc, c) => acc + (c.totalNCEarned || 0), 0);
    const totalDistance = allContracts.reduce((acc, c) => acc + (c.totalDistance || 0), 0);
    const totalCompleted = allContracts.reduce((acc, c) => acc + (c.completedContracts || 0), 0);

    return {
      ongoingCount: ongoing.length,
      scheduledCount: scheduled.length,
      historyCount: history.length,
      totalNCEarned,
      totalDistance,
      totalCompleted,
    };
  }, [ongoing, scheduled, history]);

  // Filter Logic
  const filteredOngoing = useMemo(() => {
    return ongoing.filter((c: any) => {
      const matchGame = gameFilter === "all" || String(c.gameId) === gameFilter;
      const matchSearch =
        !searchQuery ||
        c.contractName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.companyName?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchGame && matchSearch;
    });
  }, [ongoing, gameFilter, searchQuery]);

  const filteredScheduled = useMemo(() => {
    return scheduled.filter((c: any) => {
      const matchGame = gameFilter === "all" || String(c.gameId) === gameFilter;
      const matchSearch =
        !searchQuery ||
        c.contractName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.companyName?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchGame && matchSearch;
    });
  }, [scheduled, gameFilter, searchQuery]);

  const filteredHistory = useMemo(() => {
    return history.filter((c: any) => {
      const matchGame = gameFilter === "all" || String(c.gameId) === gameFilter;
      const matchSearch =
        !searchQuery ||
        c.contractName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.companyName?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchGame && matchSearch;
    });
  }, [history, gameFilter, searchQuery]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showAlert("Format tidak didukung! Harap unggah file gambar (PNG, JPG, WebP, GIF).");
      return;
    }

    const isNismaraPlus = (session?.user as any)?.nismaraplus?.status === true;
    if (!isNismaraPlus && file.type === "image/gif") {
      showAlert("Hanya member Nismara+ yang diizinkan mengunggah cover GIF.");
      return;
    }

    const maxSizeMB = isNismaraPlus ? 5 : 3;
    if (file.size > maxSizeMB * 1024 * 1024) {
      showAlert(`Maksimal ukuran file adalah ${maxSizeMB}MB.`);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setImageFile(file);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contractName || !formData.companyName || !formData.endAt) {
      showAlert("Harap lengkapi nama kontrak, nama perusahaan, dan deadline!");
      return;
    }

    if (formData.isScheduled && !formData.startDate) {
      showAlert("Harap tentukan tanggal mulai untuk kontrak yang dijadwalkan!");
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = formData.imageUrl;
      const isNismaraPlus = (session?.user as any)?.nismaraplus?.status === true;

      if (imageFile) {
        setIsUploading(true);
        const compressed = await compressImageToWebP(imageFile, isNismaraPlus ? 5 : 3, 1920);

        const resUpload = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: compressed.name,
            fileType: compressed.type,
            fileSize: compressed.size,
            folder: "events/contracts",
          }),
        });

        const uploadData = await resUpload.json();
        if (!resUpload.ok) throw new Error(uploadData.error || "Gagal mendapatkan URL upload");

        const s3Res = await fetch(uploadData.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": compressed.type },
          body: compressed,
        });

        if (!s3Res.ok) throw new Error("Gagal mengunggah gambar cover ke cloud storage");
        finalImageUrl = uploadData.publicUrl;
        setIsUploading(false);
      }

      await createContractAction({
        ...formData,
        imageUrl: finalImageUrl,
        setBy: manager?.discordId || (session?.user as any)?.discordId,
        guildId: process.env.DISCORD_GUILD_ID || "863959415702028318",
      });

      setIsModalOpen(false);
      setImageFile(null);
      setPreviewUrl("");
      setFormData({
        contractName: "",
        companyName: "",
        imageUrl: "",
        gameId: "1",
        endAt: "",
        isScheduled: false,
        startDate: "",
      });
      await showAlert("Kontrak berhasil dideploy ke sistem!");
    } catch (err: any) {
      await showAlert(err.message || "Gagal membuat kontrak.");
    } finally {
      setLoading(false);
      setIsUploading(false);
    }
  };

  const handleCloseContract = async (contractId: string, name: string) => {
    const confirm = await showConfirm(
      `Tutup kontrak "${name}" sekarang? Kontrak akan dihentikan dan dipindahkan ke Riwayat Operasi.`
    );
    if (!confirm) return;

    const res = await closeContractAction(contractId);
    if (res.success) {
      await showAlert(`Kontrak "${name}" berhasil ditutup.`);
    } else {
      await showAlert(res.error || "Gagal menutup kontrak.");
    }
  };

  const handleDeleteContract = async (contractId: string, name: string) => {
    const confirm = await showConfirm(
      `Hapus permanen kontrak "${name}"? Tindakan ini tidak dapat dibatalkan.`
    );
    if (!confirm) return;

    const res = await deleteContractAction(contractId);
    if (res.success) {
      await showAlert(`Kontrak "${name}" berhasil dihapus.`);
    } else {
      await showAlert(res.error || "Gagal menghapus kontrak.");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* 1. EXECUTIVE HERO COMMAND BANNER */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-card via-card/90 to-accent-lilac/10 border border-border p-6 md:p-10 shadow-2xl backdrop-blur-xl">
        {/* Glow Spheres */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-accent-lilac/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
              <Sparkles size={13} /> Operational Dispatch & Logistics Command
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground uppercase">
              Contract <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-lilac via-primary to-accent-sky">Management</span>
            </h1>
            <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">
              Otorisasi operasi logistik spesial, pantau progres pengiriman komunitas pengemudi secara real-time, dan atur penjadwalan kontrak armada.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              href="/special-contracts"
              target="_blank"
              className="px-5 py-4 rounded-2xl bg-card border border-border hover:border-primary/40 text-foreground font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg hover:scale-105"
            >
              <ExternalLink size={16} /> Public Portal
            </Link>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-primary text-primary-foreground px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-3 shadow-xl hover:brightness-110 hover:scale-105 active:scale-95 shadow-primary/25"
            >
              <Plus size={18} /> New Contract
            </button>
          </div>
        </div>
      </div>

      {/* 2. STATISTICAL METRICS OVERVIEW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Ongoing */}
        <div className="glass-panel p-5 rounded-3xl border border-border/60 bg-gradient-to-br from-emerald-500/5 to-transparent flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Active Contracts
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Timer size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-foreground tabular-nums">
              {stats.ongoingCount}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {stats.ongoingCount > 0 ? "Sedang Berjalan" : "Tidak Ada Kontrak Aktif"}
            </div>
          </div>
        </div>

        {/* Metric 2: Scheduled */}
        <div className="glass-panel p-5 rounded-3xl border border-border/60 bg-gradient-to-br from-amber-500/5 to-transparent flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Scheduled Queues
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-foreground tabular-nums">
              {stats.scheduledCount}
            </div>
            <p className="text-[10px] text-amber-400 font-bold mt-1">
              {stats.scheduledCount > 0 ? `${stats.scheduledCount} Terjadwal` : "Belum Ada Jadwal"}
            </p>
          </div>
        </div>

        {/* Metric 3: Total NC Distributed */}
        <div className="glass-panel p-5 rounded-3xl border border-border/60 bg-gradient-to-br from-primary/5 to-transparent flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Community NC Payout
            </span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Coins size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-primary tabular-nums">
              N¢ {stats.totalNCEarned.toLocaleString("id-ID")}
            </div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1">
              Total Bonus Terdistribusi
            </p>
          </div>
        </div>

        {/* Metric 4: Total Haul Distance */}
        <div className="glass-panel p-5 rounded-3xl border border-border/60 bg-gradient-to-br from-accent-sky/5 to-transparent flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Total Haulage
            </span>
            <div className="w-8 h-8 rounded-xl bg-accent-sky/10 text-accent-sky flex items-center justify-center">
              <Truck size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-accent-sky tabular-nums">
              {stats.totalDistance.toLocaleString("id-ID")} KM
            </div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1">
              {stats.totalCompleted.toLocaleString("id-ID")} Pekerjaan Selesai
            </p>
          </div>
        </div>
      </div>

      {/* 3. FILTER TABS & SEARCH CONTROLS */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 glass-panel p-4 rounded-3xl border border-border">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "all"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            <Layers size={14} /> Semua ({ongoing.length + scheduled.length + history.length})
          </button>
          <button
            onClick={() => setActiveTab("ongoing")}
            className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "ongoing"
                ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            <Timer size={14} /> Berjalan ({ongoing.length})
          </button>
          <button
            onClick={() => setActiveTab("scheduled")}
            className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "scheduled"
                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            <Clock size={14} /> Terjadwal ({scheduled.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "history"
                ? "bg-foreground/20 text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            <History size={14} /> Riwayat ({history.length})
          </button>
        </div>

        {/* Game Filter & Search */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-card border border-border rounded-2xl p-1">
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

          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Cari kontrak atau klien..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-2xl text-xs font-medium text-foreground outline-none focus:border-primary transition-all"
            />
          </div>
        </div>
      </div>

      {/* 4. ONGOING CONTRACTS SECTION */}
      {(activeTab === "all" || activeTab === "ongoing") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-foreground uppercase flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Ongoing Contracts ({filteredOngoing.length})
            </h2>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Live Operations
            </span>
          </div>

          {filteredOngoing.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredOngoing.map((c: any) => {
                const game = getGameInfo(c.gameId);
                const contributorCount = c.contributors ? Object.keys(c.contributors).length : 0;

                return (
                  <div
                    key={c._id}
                    className="group bg-card/60 border border-border/80 hover:border-emerald-500/40 rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl backdrop-blur-md transition-all duration-300 hover:shadow-emerald-500/5 hover:-translate-y-1"
                  >
                    {/* Card Cover Banner */}
                    <div className="relative h-56 w-full overflow-hidden bg-muted">
                      <img
                        src={c.imageUrl || "https://i.imgur.com/iMTOi8Z.png"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        alt={c.contractName}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-black/40 to-transparent" />

                      {/* Floating Badges */}
                      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border backdrop-blur-md shadow-lg ${game.badge}`}
                        >
                          {game.name}
                        </span>
                        <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/90 text-black border border-emerald-400 backdrop-blur-md shadow-lg flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-black" /> Live Active
                        </span>
                      </div>

                      {/* Header overlay info */}
                      <div className="absolute bottom-4 left-6 right-6">
                        <p className="text-emerald-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 mb-1">
                          <Briefcase size={12} /> {c.companyName}
                        </p>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-tight line-clamp-1">
                          {c.contractName}
                        </h3>
                      </div>
                    </div>

                    {/* Card Content & Stats */}
                    <div className="p-6 md:p-8 space-y-6 flex-1 flex flex-col justify-between">
                      {/* Metric Grid */}
                      <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                            Total Bonus
                          </span>
                          <p className="text-sm font-black text-primary tabular-nums">
                            N¢ {(c.totalNCEarned || 0).toLocaleString("id-ID")}
                          </p>
                        </div>
                        <div className="space-y-1 border-x border-white/5 px-3">
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                            Distance
                          </span>
                          <p className="text-sm font-black text-foreground tabular-nums">
                            {(c.totalDistance || 0).toLocaleString("id-ID")} KM
                          </p>
                        </div>
                        <div className="space-y-1 text-right">
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                            Drivers
                          </span>
                          <p className="text-sm font-black text-accent-sky tabular-nums">
                            {contributorCount} Drivers
                          </p>
                        </div>
                      </div>

                      {/* Deployment & Deadline Time */}
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                            Deployment Time
                          </span>
                          <p className="font-bold text-foreground">
                            {formatDateTime(c.setAt || c.startDate)}
                          </p>
                        </div>
                        <div className="space-y-1 text-right">
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                            Deadline Operasi
                          </span>
                          <p className="font-bold text-red-400">
                            {formatDateTime(c.endAt)}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2 pt-2 border-t border-border/50">
                        <div className="grid grid-cols-2 gap-2">
                          <Link
                            href={`/special-contracts/${slugify(c.contractName)}`}
                            className="py-3 px-4 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-primary/20"
                          >
                            Leaderboard <ArrowUpRight size={14} />
                          </Link>
                          <Link
                            href={`/dashboard/manage/events/contracts/edit/${c._id}`}
                            className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-foreground font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-border"
                          >
                            <Edit3 size={14} /> Edit Data
                          </Link>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleCloseContract(c._id, c.contractName)}
                            className="py-2.5 px-3 rounded-xl bg-orange-500/10 hover:bg-orange-500 hover:text-black text-orange-400 font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 border border-orange-500/20"
                          >
                            <PowerOff size={12} /> Tutup Kontrak
                          </button>
                          <button
                            onClick={() => handleDeleteContract(c._id, c.contractName)}
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
            <div className="glass-panel p-12 rounded-[2.5rem] border border-border text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/5 text-muted-foreground flex items-center justify-center mx-auto">
                <Timer size={24} />
              </div>
              <p className="text-foreground font-bold text-sm">Tidak ada kontrak aktif yang sedang berlangsung.</p>
              <p className="text-muted-foreground text-xs max-w-md mx-auto">
                Klik tombol "New Contract" di atas untuk membuat dan mendeploy operasi logistik baru.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 5. SCHEDULED CONTRACTS SECTION */}
      {(activeTab === "all" || activeTab === "scheduled") && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-foreground uppercase flex items-center gap-2">
              <Clock className="text-amber-400" size={20} />
              Scheduled Contracts ({filteredScheduled.length})
            </h2>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
              Upcoming Queue
            </span>
          </div>

          {filteredScheduled.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredScheduled.map((c: any) => {
                const game = getGameInfo(c.gameId);

                return (
                  <div
                    key={c._id}
                    className="group bg-card/60 border border-amber-500/30 hover:border-amber-400/60 rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl backdrop-blur-md transition-all duration-300 hover:shadow-amber-500/5 hover:-translate-y-1 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent"
                  >
                    {/* Card Cover Banner */}
                    <div className="relative h-52 w-full overflow-hidden bg-muted">
                      <img
                        src={c.imageUrl || "https://i.imgur.com/iMTOi8Z.png"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        alt={c.contractName}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-black/50 to-transparent" />

                      {/* Floating Badges */}
                      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border backdrop-blur-md shadow-lg ${game.badge}`}
                        >
                          {game.name}
                        </span>
                        <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/90 text-black border border-amber-400 backdrop-blur-md shadow-lg flex items-center gap-1.5 font-mono">
                          <Clock size={12} /> Scheduled
                        </span>
                      </div>

                      {/* Header overlay info */}
                      <div className="absolute bottom-4 left-6 right-6">
                        <p className="text-amber-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 mb-1">
                          <Briefcase size={12} /> {c.companyName}
                        </p>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-tight line-clamp-1 group-hover:text-amber-300 transition-colors">
                          {c.contractName}
                        </h3>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-6 md:p-8 space-y-6 flex-1 flex flex-col justify-between">
                      <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-amber-400/70 uppercase tracking-widest">
                            Waktu Mulai
                          </span>
                          <p className="font-bold text-amber-300">
                            {formatDateTime(c.startDate)}
                          </p>
                        </div>
                        <div className="space-y-1 text-right">
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                            Deadline
                          </span>
                          <p className="font-bold text-red-400">
                            {formatDateTime(c.endAt)}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2 pt-2 border-t border-border/50">
                        <div className="grid grid-cols-2 gap-2">
                          <Link
                            href={`/special-contracts/${slugify(c.contractName)}`}
                            className="py-3 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500 hover:text-black text-amber-400 font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-amber-500/30"
                          >
                            Preview Portal <ExternalLink size={14} />
                          </Link>
                          <Link
                            href={`/dashboard/manage/events/contracts/edit/${c._id}`}
                            className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-foreground font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-border"
                          >
                            <Edit3 size={14} /> Edit Jadwal
                          </Link>
                        </div>

                        <button
                          onClick={() => handleDeleteContract(c._id, c.contractName)}
                          className="w-full py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 border border-red-500/20"
                        >
                          <Trash2 size={12} /> Batalkan & Hapus Jadwal
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-panel p-10 rounded-[2.5rem] border border-border text-center space-y-2">
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
                Tidak ada antrean kontrak yang dijadwalkan saat ini.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 6. PAST OPERATIONS (HISTORY) TABLE */}
      {(activeTab === "all" || activeTab === "history") && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-foreground uppercase flex items-center gap-2">
              <History className="text-muted-foreground" size={20} />
              Past Operations ({filteredHistory.length})
            </h2>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Completed Records
            </span>
          </div>

          <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-foreground/5 text-foreground/40 text-[10px] font-black uppercase tracking-widest border-b border-border">
                  <tr>
                    <th className="px-8 py-5">Game</th>
                    <th className="px-8 py-5">Contract & Client</th>
                    <th className="px-8 py-5">Performance Bonus</th>
                    <th className="px-8 py-5">Distance & Jobs</th>
                    <th className="px-8 py-5 text-right">Closed At</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredHistory.length > 0 ? (
                    filteredHistory.map((h: any) => {
                      const game = getGameInfo(h.gameId);
                      return (
                        <tr key={h._id} className="hover:bg-foreground/[0.02] transition-colors group">
                          {/* Game Badge */}
                          <td className="px-8 py-5">
                            <span
                              className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${game.badge}`}
                            >
                              {game.name}
                            </span>
                          </td>

                          {/* Contract & Client */}
                          <td className="px-8 py-5">
                            <p className="font-black text-foreground uppercase group-hover:text-primary transition-colors">
                              {h.contractName}
                            </p>
                            <p className="text-[10px] font-bold text-accent-lilac uppercase tracking-wider">
                              {h.companyName}
                            </p>
                          </td>

                          {/* Bonus NC */}
                          <td className="px-8 py-5 tabular-nums">
                            <span className="font-black text-primary text-sm">
                              N¢ {(h.totalNCEarned || 0).toLocaleString("id-ID")}
                            </span>
                          </td>

                          {/* Distance & Jobs */}
                          <td className="px-8 py-5 tabular-nums">
                            <div className="flex flex-col">
                              <span className="font-bold text-foreground text-xs">
                                {(h.totalDistance || 0).toLocaleString("id-ID")} KM
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {(h.completedContracts || 0).toLocaleString("id-ID")} Jobs Selesai
                              </span>
                            </div>
                          </td>

                          {/* Closed Date */}
                          <td className="px-8 py-5 text-right text-muted-foreground font-mono text-[10px] font-bold">
                            {formatDate(h.updatedAt || h.endAt)}
                          </td>

                          {/* Actions */}
                          <td className="px-8 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/special-contracts/${slugify(h.contractName)}`}
                                title="Lihat Halaman Arsip"
                                className="p-2 rounded-xl bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                              >
                                <ExternalLink size={14} />
                              </Link>
                              <Link
                                href={`/dashboard/manage/events/contracts/edit/${h._id}`}
                                title="Edit Parameter"
                                className="p-2 rounded-xl bg-white/5 hover:bg-accent-sky/20 text-muted-foreground hover:text-accent-sky transition-colors"
                              >
                                <Edit3 size={14} />
                              </Link>
                              <button
                                onClick={() => handleDeleteContract(h._id, h.contractName)}
                                title="Hapus Arsip"
                                className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-colors"
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
                      <td
                        colSpan={6}
                        className="px-8 py-16 text-center text-muted-foreground font-bold uppercase tracking-widest text-xs"
                      >
                        Tidak ada data riwayat kontrak yang sesuai filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: CREATE NEW SPECIAL CONTRACT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <form
            onSubmit={handleCreate}
            className="bg-card border border-border p-6 md:p-10 rounded-[3rem] w-full max-w-xl shadow-2xl space-y-6 relative overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 pointer-events-none">
              <Briefcase size={160} />
            </div>

            {/* Modal Header */}
            <div className="flex items-center justify-between relative z-10 border-b border-border/50 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-primary tracking-widest">
                  Deployment Form
                </span>
                <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">
                  New Special Contract
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
              {/* Target Game Selector Cards */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-accent-lilac uppercase tracking-widest ml-1">
                  Pilih Target Game
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, gameId: "1" })}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                      formData.gameId === "1"
                        ? "bg-accent-lilac/10 border-accent-lilac text-accent-lilac shadow-md shadow-accent-lilac/10"
                        : "bg-black/20 border-white/5 text-muted-foreground hover:border-white/20"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-accent-lilac/20 text-accent-lilac">
                      <Truck size={20} />
                    </div>
                    <div>
                      <p className="font-black text-sm uppercase">ETS2</p>
                      <p className="text-[9px] font-medium opacity-70">Euro Truck 2</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, gameId: "2" })}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                      formData.gameId === "2"
                        ? "bg-amber-500/10 border-amber-500 text-amber-400 shadow-md shadow-amber-500/10"
                        : "bg-black/20 border-white/5 text-muted-foreground hover:border-white/20"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                      <Truck size={20} />
                    </div>
                    <div>
                      <p className="font-black text-sm uppercase">ATS</p>
                      <p className="text-[9px] font-medium opacity-70">American Truck</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Contract & Company Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-accent-lilac uppercase tracking-widest ml-1">
                    Nama Kontrak *
                  </label>
                  <input
                    placeholder="Contoh: Mudik Lebaran 2026"
                    required
                    value={formData.contractName}
                    onChange={(e) => setFormData({ ...formData, contractName: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-2xl p-3.5 text-foreground text-sm outline-none focus:border-accent-lilac transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-accent-lilac uppercase tracking-widest ml-1">
                    Perusahaan Klien *
                  </label>
                  <input
                    placeholder="Contoh: Sunshine Crops / Tree-ET"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-2xl p-3.5 text-foreground text-sm outline-none focus:border-accent-lilac transition-all"
                  />
                </div>
              </div>

              {/* Deadline Operasi */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-accent-lilac uppercase tracking-widest ml-1">
                  Deadline Kontrak *
                </label>
                <input
                  type="date"
                  required
                  value={formData.endAt}
                  onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-2xl p-3.5 text-foreground text-sm outline-none focus:border-accent-lilac transition-all [color-scheme:dark]"
                />
              </div>

              {/* Scheduled Contract Toggle */}
              <div className="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-accent-lilac rounded-md"
                    checked={formData.isScheduled}
                    onChange={(e) => setFormData({ ...formData, isScheduled: e.target.checked })}
                  />
                  <span className="text-xs font-bold text-foreground">
                    Jadwalkan Kontrak (Scheduled Launch)
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

              {/* Cover Image Upload with Local Preview */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-accent-lilac uppercase tracking-widest ml-1">
                  Banner Cover Image (Opsional)
                </label>

                {previewUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-emerald-500/40 h-36 group">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewUrl("");
                          setImageFile(null);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                      >
                        <Trash2 size={14} /> Ganti Gambar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-20"
                    />
                    <div className="w-full bg-black/20 border-2 border-dashed border-white/10 hover:border-accent-lilac/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 transition-colors">
                      <Upload size={24} className="text-muted-foreground" />
                      <p className="text-xs font-bold text-foreground">Klik atau Tarik Gambar Cover ke Sini</p>
                      <p className="text-[10px] text-muted-foreground">PNG, JPG, WebP (Maks 3MB / Nismara+ 5MB)</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col gap-3 pt-4 border-t border-border/50 relative z-10">
              <button
                disabled={loading || isUploading}
                type="submit"
                className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-primary/25 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                    Memproses Deployment...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} /> Authorize & Deploy Contract
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
