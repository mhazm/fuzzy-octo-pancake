"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Briefcase,
  Coins,
  Trophy,
  Car,
  ShoppingBag,
  Ticket,
  Dices,
  Target,
  Clock,
  ChevronDown,
  ChevronUp,
  MapPin,
  Zap,
  TrendingUp,
  User,
  AlertTriangle,
  Star,
  ShieldCheck,
  Flag,
  CheckCircle2,
  Flame,
  ArrowRight,
  ClipboardCheck,
  ExternalLink,
  X,
  FileText,
  CheckCircle,
  MessageSquare,
  History,
  Calendar,
  AlertCircle,
  Timer,
  Activity,
  RefreshCw,
} from "lucide-react";
import Swal from "sweetalert2";
import { showAlert, showConfirm } from "@/lib/dialog";

export default function InternMonitorClient() {
  const [interns, setInterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<
    "all" | "active" | "warning" | "inactive" | "overdue"
  >("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [guildId, setGuildId] = useState("863959415702028318");

  // State untuk modal evaluasi
  const [closeModalIntern, setCloseModalIntern] = useState<any | null>(null);
  const [closeReason, setCloseReason] = useState("");
  const [evaluationNotes, setEvaluationNotes] = useState("");
  const [isSubmittingClose, setIsSubmittingClose] = useState(false);

  // State untuk modal riwayat evaluasi
  const [historyModalIntern, setHistoryModalIntern] = useState<any | null>(
    null,
  );

  useEffect(() => {
    fetchInterns();
  }, []);

  const fetchInterns = async (forceRefresh: boolean = false) => {
    setLoading(true);
    try {
      const url = forceRefresh ? "/api/manage/interns?refresh=true" : "/api/manage/interns";
      const res = await fetch(url, {
        cache: "no-store",
        headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      if (data.success) {
        setInterns(data.interns);
        if (data.guildId) setGuildId(data.guildId);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const activeCount = interns.filter(
    (i) => i.activityStatus === "active",
  ).length;
  const warningCount = interns.filter(
    (i) => i.activityStatus === "warning",
  ).length;
  const inactiveCount = interns.filter(
    (i) => i.activityStatus === "inactive" || i.activityStatus === "never",
  ).length;
  const overdueCount = interns.filter((i) => i.probation?.isOverdue).length;

  const filtered = interns.filter((i) => {
    const matchesSearch =
      search === "" ||
      i.name?.toLowerCase().includes(search.toLowerCase()) ||
      i.discordId?.includes(search);
    if (!matchesSearch) return false;

    if (filterTab === "active") return i.activityStatus === "active";
    if (filterTab === "warning") return i.activityStatus === "warning";
    if (filterTab === "inactive")
      return i.activityStatus === "inactive" || i.activityStatus === "never";
    if (filterTab === "overdue") return i.probation?.isOverdue;

    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleInterview = async (intern: any) => {
    const confirm = await Swal.fire({
      title: "Mulai Interview?",
      text: `Sistem akan membuat channel Discord dan mengundang ${intern.name} untuk ujian.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Mulai!",
      cancelButtonText: "Batal",
      background: "#1e1e2d",
      color: "#ffffff",
    });

    if (!confirm.isConfirmed) return;

    setActionLoading(intern._id);
    try {
      const res = await fetch(
        `/api/manage/interns/${intern.discordId}/interview`,
        { method: "POST" },
      );
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: data.message,
          background: "#1e1e2d",
          color: "#ffffff",
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: data.error,
          background: "#1e1e2d",
          color: "#ffffff",
        });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Terjadi kesalahan sistem",
        background: "#1e1e2d",
        color: "#ffffff",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePromote = async (intern: any) => {
    const confirm = await Swal.fire({
      title: "Promosikan ke Sopir?",
      text: `Role ${intern.name} di Discord akan diubah dari Intern menjadi Driver dan seluruh poin penalti miliknya akan dihapus (Amnesti Poin menjadi 0).`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      confirmButtonText: "Ya, Promosikan!",
      cancelButtonText: "Batal",
      background: "#1e1e2d",
      color: "#ffffff",
    });

    if (!confirm.isConfirmed) return;

    setActionLoading(intern._id);
    try {
      const res = await fetch(
        `/api/manage/interns/${intern.discordId}/promote`,
        { method: "POST" },
      );
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "LULUS!",
          text: data.message,
          background: "#1e1e2d",
          color: "#ffffff",
        });
        fetchInterns(true);
      } else {
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: data.error,
          background: "#1e1e2d",
          color: "#ffffff",
        });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Terjadi kesalahan sistem",
        background: "#1e1e2d",
        color: "#ffffff",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetQuiz = async (intern: any) => {
    const confirm = await Swal.fire({
      title: "Reset Kesempatan Ujian?",
      text: `Intern ${intern.name} sudah gagal 2 kali. Anda akan menghapus riwayat ujiannya agar dia bisa mengulang ujian lagi.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f59e0b",
      confirmButtonText: "Ya, Reset!",
      cancelButtonText: "Batal",
      background: "#1e1e2d",
      color: "#ffffff",
    });

    if (!confirm.isConfirmed) return;

    setActionLoading(intern._id);
    try {
      const res = await fetch(
        `/api/manage/interns/${intern.discordId}/reset-quiz`,
        { method: "POST" },
      );
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: data.message,
          background: "#1e1e2d",
          color: "#ffffff",
        });
        fetchInterns();
      } else {
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: data.error,
          background: "#1e1e2d",
          color: "#ffffff",
        });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Terjadi kesalahan sistem",
        background: "#1e1e2d",
        color: "#ffffff",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartEvaluation = async (intern: any) => {
    const confirmed = await showConfirm(
      `Panggil ${intern.name} untuk sesi evaluasi? Sistem akan membuat channel Discord khusus evaluasi di kategori interview.`,
    );
    if (!confirmed) return;

    setActionLoading(intern._id);
    try {
      const res = await fetch(
        `/api/manage/interns/${intern.discordId}/evaluation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      const data = await res.json();
      if (data.success) {
        await showAlert(
          data.message || "Channel evaluasi berhasil dibuat!",
          "Berhasil",
        );
        fetchInterns();
      } else {
        await showAlert(data.error || "Gagal memulai evaluasi", "Gagal");
      }
    } catch (error) {
      console.error(error);
      await showAlert(
        "Terjadi kesalahan sistem saat membuat channel evaluasi.",
        "Error",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const openCloseModal = (intern: any) => {
    setCloseModalIntern(intern);
    setCloseReason("");
    setEvaluationNotes("");
  };

  const handleSubmitCloseEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeModalIntern) return;
    if (!closeReason.trim()) {
      return await showAlert(
        "Alasan penutupan evaluasi wajib diisi.",
        "Peringatan",
      );
    }
    if (!evaluationNotes.trim()) {
      return await showAlert(
        "Hasil/catatan evaluasi wajib diisi agar staf manager lain dapat melihat hasil evaluasi.",
        "Peringatan",
      );
    }

    setIsSubmittingClose(true);
    try {
      const res = await fetch(
        `/api/manage/interns/${closeModalIntern.discordId}/evaluation/close`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ closeReason, evaluationNotes }),
        },
      );
      const data = await res.json();
      if (data.success) {
        setCloseModalIntern(null);
        await showAlert(
          `Evaluasi driver ${closeModalIntern.name} berhasil diselesaikan!\n\nChannel Discord telah dihapus dan Anda mendapatkan +2 Poin KPI Payroll Manager (Audit Intern).`,
          "Evaluasi Selesai 🎉",
        );
        fetchInterns(true);
      } else {
        await showAlert(data.error || "Gagal menutup evaluasi.", "Gagal");
      }
    } catch (error) {
      console.error(error);
      await showAlert(
        "Terjadi kesalahan koneksi saat menutup evaluasi.",
        "Error",
      );
    } finally {
      setIsSubmittingClose(false);
    }
  };

  const openHistoryModal = (intern: any) => {
    setHistoryModalIntern(intern);
  };

  const StatCard = ({
    icon: Icon,
    label,
    value,
    sub,
    color = "text-white",
  }: any) => (
    <div className="bg-black/30 border border-border/30 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
          {label}
        </span>
      </div>
      <div className={`text-lg font-black ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <main className="p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white mb-2">
            Pemantauan Intern
          </h1>
          <p className="text-gray-400 text-sm">
            Monitor progres dan aktivitas sopir magang untuk evaluasi kelayakan
            promosi.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchInterns(true)}
            disabled={loading}
            className="flex items-center gap-2 bg-card/60 hover:bg-muted text-gray-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold border border-border/50 transition disabled:opacity-50"
            title="Segarkan data langsung dari Trucky & Database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </button>
          <div className="bg-accent-lilac/20 border border-accent-lilac/30 text-accent-lilac text-sm font-bold px-4 py-2 rounded-xl">
            {interns.length} Intern Aktif
          </div>
        </div>
      </div>

      {/* KPI Filter Tabs & Search */}
      <div className="space-y-4 mb-6">
        {/* KPI Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              filterTab === "all"
                ? "bg-accent-lilac text-black shadow-md shadow-accent-lilac/20"
                : "bg-card/60 hover:bg-muted text-gray-400 hover:text-white border border-border/50"
            }`}
          >
            <span>Semua Intern</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${filterTab === "all" ? "bg-black/20 text-black" : "bg-muted text-gray-300"}`}
            >
              {interns.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab("active")}
            className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              filterTab === "active"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                : "bg-card/60 hover:bg-muted text-gray-400 hover:text-white border border-border/50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Aktif (≤7 Hari)</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${filterTab === "active" ? "bg-black/20 text-white" : "bg-muted text-emerald-400"}`}
            >
              {activeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab("warning")}
            className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              filterTab === "warning"
                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                : "bg-card/60 hover:bg-muted text-gray-400 hover:text-white border border-border/50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Mulai Pasif (8-20 Hari)</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${filterTab === "warning" ? "bg-black/20 text-black" : "bg-muted text-amber-400"}`}
            >
              {warningCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab("inactive")}
            className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              filterTab === "inactive"
                ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                : "bg-card/60 hover:bg-muted text-gray-400 hover:text-white border border-border/50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Inaktif / Ghosting (&gt;20 Hari)</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${filterTab === "inactive" ? "bg-black/20 text-white" : "bg-muted text-rose-400"}`}
            >
              {inactiveCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab("overdue")}
            className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              filterTab === "overdue"
                ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                : "bg-card/60 hover:bg-muted text-rose-400 hover:text-white border border-rose-500/30"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>⚠️ Lewat 90 Hari (Overdue)</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${filterTab === "overdue" ? "bg-black/20 text-white" : "bg-rose-950 text-rose-300"}`}
            >
              {overdueCount}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau Discord ID..."
            className="pl-10 pr-4 py-3 bg-black/50 border border-border/50 rounded-xl text-white text-sm focus:outline-none focus:border-accent-lilac w-full"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-accent-lilac/20 border-t-accent-lilac rounded-full"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card/30 border border-border/50 rounded-2xl">
          <Users className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-300">
            {search ? "Tidak ditemukan" : "Tidak Ada Intern"}
          </h3>
          <p className="text-gray-500">
            {search
              ? "Coba kata kunci lain."
              : "Saat ini tidak ada sopir dengan status Intern."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((intern) => (
            <div
              key={intern._id}
              className="bg-card/50 border border-border/50 rounded-2xl overflow-hidden transition-all"
            >
              {/* Summary Row */}
              <button
                onClick={() => toggleExpand(intern._id)}
                className="w-full p-5 flex items-center gap-4 hover:bg-white/[0.02] transition-colors text-left"
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full overflow-hidden bg-black/50 border border-border/50 flex-shrink-0">
                  {intern.image ? (
                    <img
                      src={intern.image}
                      alt={intern.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-full h-full p-2 text-gray-500" />
                  )}
                </div>

                {/* Name & Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-white truncate">
                      {intern.name}
                    </h3>

                    {/* Status Cuti */}
                    {intern.isOnLeave && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full">
                        CUTI
                      </span>
                    )}

                    {/* Timeline 90 Hari Badge */}
                    {intern.probation?.isOverdue ? (
                      <span className="px-2.5 py-0.5 text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded-full flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        OVERDUE ({intern.daysSinceJoin} Hari)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-muted text-gray-300 border border-border/50 rounded-full flex items-center gap-1">
                        <Timer className="w-3 h-3 text-accent-lilac" />
                        Bulan ke-
                        {intern.probation?.phase === "month_3"
                          ? "3"
                          : intern.probation?.phase === "month_2"
                            ? "2"
                            : "1"}{" "}
                        ({intern.daysSinceJoin}/90 hari)
                      </span>
                    )}

                    {/* Keaktifan Job Terakhir Badge */}
                    {intern.activityStatus === "active" && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Aktif (
                        {intern.daysSinceLastJob === 0
                          ? "Hari ini"
                          : `${intern.daysSinceLastJob} hari lalu`}
                        )
                      </span>
                    )}
                    {intern.activityStatus === "warning" && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Pasif {intern.daysSinceLastJob} hari
                      </span>
                    )}
                    {intern.activityStatus === "inactive" && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        Inaktif {intern.daysSinceLastJob} hari
                      </span>
                    )}
                    {intern.activityStatus === "never" && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-full">
                        Belum Ada Job
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {intern.daysSinceJoin} hari magang
                    </span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {intern.jobs.total} pekerjaan
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Pekerjaan Terakhir:{" "}
                      {intern.daysSinceLastJob === null
                        ? "Belum pernah"
                        : intern.daysSinceLastJob === 0
                          ? "Hari Ini"
                          : `${intern.daysSinceLastJob} hari lalu`}
                    </span>
                    <span className="flex items-center gap-1">
                      <Coins className="w-3 h-3" />
                      {intern.jobs.netIncome.toLocaleString()} NC
                    </span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="hidden md:flex items-center gap-6 text-xs">
                  <div className="text-center">
                    <div className="text-gray-500 mb-0.5">Job Terakhir</div>
                    <div
                      className={`font-bold ${intern.activityStatus === "active" ? "text-emerald-400" : intern.activityStatus === "warning" ? "text-amber-400" : intern.activityStatus === "inactive" ? "text-rose-400" : "text-gray-500"}`}
                    >
                      {intern.daysSinceLastJob === null
                        ? "Belum"
                        : intern.daysSinceLastJob === 0
                          ? "Hari Ini"
                          : `${intern.daysSinceLastJob}h lalu`}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-500 mb-0.5">Level</div>
                    <div className="font-black text-accent-lilac text-base">
                      {intern.level}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-500 mb-0.5">XP</div>
                    <div className="font-bold text-white">
                      {intern.xp.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-500 mb-0.5">Fleet</div>
                    <div
                      className={`font-bold ${intern.fleet.hasFleet ? "text-green-400" : "text-red-400"}`}
                    >
                      {intern.fleet.hasFleet
                        ? `${intern.fleet.count} unit`
                        : "Belum"}
                    </div>
                  </div>
                </div>

                {/* Expand Toggle */}
                {expandedId === intern._id ? (
                  <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                )}
              </button>

              {/* Expanded Detail */}
              {expandedId === intern._id && (
                <div className="px-5 pb-5 border-t border-border/30 pt-5 space-y-6">
                  {/* Info Dasar */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                      Informasi Dasar & Batas Waktu Magang
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <StatCard
                        icon={Clock}
                        label="Mulai Magang"
                        value={
                          intern.joinedAt
                            ? new Date(intern.joinedAt).toLocaleDateString(
                                "id-ID",
                              )
                            : "-"
                        }
                        sub={`${intern.daysSinceJoin} hari yang lalu`}
                        color="text-blue-400"
                      />
                      <StatCard
                        icon={Timer}
                        label="Batas Magang (90 Hari)"
                        value={
                          intern.probation?.isOverdue
                            ? `Lewat ${intern.probation.overdueDays} Hari`
                            : `Sisa ${intern.probation?.daysRemaining} Hari`
                        }
                        sub={
                          intern.probation?.isOverdue
                            ? "⚠️ Melebihi batas 3 bulan"
                            : `Hari ke-${intern.daysSinceJoin} / 90 hari (${intern.probation?.progressPercent}%)`
                        }
                        color={
                          intern.probation?.isOverdue
                            ? "text-rose-400"
                            : intern.probation?.phase === "month_3"
                              ? "text-amber-400"
                              : "text-cyan-400"
                        }
                      />
                      <StatCard
                        icon={Activity}
                        label="Status Keaktifan"
                        value={
                          intern.activityStatus === "active"
                            ? "Aktif Narik"
                            : intern.activityStatus === "warning"
                              ? "Mulai Pasif"
                              : intern.activityStatus === "inactive"
                                ? "Inaktif / Ghosting"
                                : "Belum Pernah"
                        }
                        sub={
                          intern.daysSinceLastJob === null
                            ? "Belum ada delivery"
                            : intern.daysSinceLastJob === 0
                              ? "Delivery hari ini"
                              : `Delivery ${intern.daysSinceLastJob} hari lalu`
                        }
                        color={
                          intern.activityStatus === "active"
                            ? "text-emerald-400"
                            : intern.activityStatus === "warning"
                              ? "text-amber-400"
                              : intern.activityStatus === "inactive"
                                ? "text-rose-400"
                                : "text-gray-500"
                        }
                      />
                      <StatCard
                        icon={Zap}
                        label="Level / XP"
                        value={`Lv.${intern.level}`}
                        sub={`${intern.xp.toLocaleString()} XP`}
                        color="text-accent-lilac"
                      />
                      <StatCard
                        icon={Car}
                        label="Fleet"
                        value={
                          intern.fleet.hasFleet
                            ? `${intern.fleet.count} Unit`
                            : "Belum Punya"
                        }
                        color={
                          intern.fleet.hasFleet
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      />
                      <StatCard
                        icon={Ticket}
                        label="Tiket Support"
                        value={intern.tickets.total}
                        color="text-gray-300"
                      />
                    </div>
                  </div>

                  {/* Pekerjaan */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                      📦 Pekerjaan & Keuangan
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <StatCard
                        icon={Briefcase}
                        label="Total Pekerjaan"
                        value={intern.jobs.total}
                        color="text-blue-400"
                      />
                      <StatCard
                        icon={MapPin}
                        label="Jarak Tempuh"
                        value={`${intern.jobs.distanceKm.toLocaleString()} km`}
                        color="text-cyan-400"
                      />
                      <StatCard
                        icon={Calendar}
                        label="Pekerjaan Terakhir"
                        value={
                          intern.daysSinceLastJob === null
                            ? "Belum Pernah"
                            : intern.daysSinceLastJob === 0
                              ? "Hari Ini"
                              : `${intern.daysSinceLastJob} Hari Lalu`
                        }
                        sub={
                          intern.lastJobAt
                            ? new Date(intern.lastJobAt).toLocaleString(
                                "id-ID",
                                {
                                  timeZone: "Asia/Jakarta",
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              ) + " WIB"
                            : "Belum ada catatan"
                        }
                        color={
                          intern.activityStatus === "active"
                            ? "text-emerald-400"
                            : intern.activityStatus === "warning"
                              ? "text-amber-400"
                              : "text-gray-400"
                        }
                      />
                      <StatCard
                        icon={TrendingUp}
                        label="NC Diperoleh"
                        value={`${intern.jobs.ncEarned.toLocaleString()} NC`}
                        color="text-green-400"
                      />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                      <StatCard
                        icon={Coins}
                        label="NC Pengeluaran"
                        value={`${intern.jobs.ncCost.toLocaleString()} NC`}
                        color="text-red-400"
                      />
                      <StatCard
                        icon={Coins}
                        label="Pendapatan Bersih"
                        value={`${intern.jobs.netIncome.toLocaleString()} NC`}
                        color={
                          intern.jobs.netIncome >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      />
                      <StatCard
                        icon={Zap}
                        label="XP dari Kerja"
                        value={intern.jobs.xpEarned.toLocaleString()}
                        color="text-purple-400"
                      />
                      <StatCard
                        icon={AlertTriangle}
                        label="Total Poin Penalti"
                        value={intern.jobs.totalPenalty}
                        color="text-yellow-400"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      {/* Special Contract */}
                      <div className="bg-black/30 border border-border/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-bold text-white">
                            Special Contract
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">
                              Diselesaikan
                            </div>
                            <div className="text-lg font-bold text-white">
                              {intern.jobs.specialContractJobs}{" "}
                              <span className="text-xs text-gray-500 font-normal">
                                job
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">
                              Total Pendapatan
                            </div>
                            <div className="text-lg font-bold text-green-400">
                              {intern.jobs.specialContractIncome.toLocaleString()}{" "}
                              <span className="text-xs text-gray-500 font-normal">
                                NC
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Hardcore Mode */}
                      <div className="bg-black/30 border border-border/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Flame className="w-4 h-4 text-orange-500" />
                          <span className="text-sm font-bold text-white">
                            Hardcore Mode
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">
                              Diselesaikan
                            </div>
                            <div className="text-lg font-bold text-white">
                              {intern.jobs.hardcoreJobs}{" "}
                              <span className="text-xs text-gray-500 font-normal">
                                job
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">
                              Rata-rata Rating
                            </div>
                            <div className="text-lg font-bold text-orange-400 flex items-center gap-1">
                              {intern.jobs.hardcoreRatingAvg}{" "}
                              <Star className="w-4 h-4 fill-orange-400" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Komunitas & Event */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                      👥 Komunitas & Pencapaian
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Convoy */}
                      <div className="bg-black/30 border border-border/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Flag className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-bold text-white">
                            Partisipasi Convoy
                          </span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500">
                              Tertarik (Interested)
                            </span>
                            <span className="text-white font-bold">
                              {intern.convoy.interested}x
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">
                              Hadir & Selesai
                            </span>
                            <span className="text-green-400 font-bold">
                              {intern.convoy.joined}x
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Achievements */}
                      <div className="bg-black/30 border border-border/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Star className="w-4 h-4 text-yellow-400" />
                          <span className="text-sm font-bold text-white">
                            Achievement
                          </span>
                        </div>
                        <div className="flex flex-col justify-center h-[46px]">
                          <div className="text-2xl font-black text-yellow-400">
                            {intern.achievements.total}{" "}
                            <span className="text-xs text-gray-500 font-normal uppercase tracking-wider">
                              Badge Diperoleh
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Aktivitas Hiburan */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                      🎰 Aktivitas Hiburan
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Lotto */}
                      <div className="bg-black/30 border border-border/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Dices className="w-4 h-4 text-purple-400" />
                          <span className="text-sm font-bold text-white">
                            Lotto
                          </span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Tiket Dibeli</span>
                            <span className="text-white font-bold">
                              {intern.lotto.tickets}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Menang</span>
                            <span className="text-green-400 font-bold">
                              {intern.lotto.wins}x
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Total Hadiah</span>
                            <span className="text-yellow-400 font-bold">
                              {intern.lotto.won.toLocaleString()} NC
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Scratch */}
                      <div className="bg-black/30 border border-border/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Target className="w-4 h-4 text-amber-400" />
                          <span className="text-sm font-bold text-white">
                            Scratch Card
                          </span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Tiket Dibeli</span>
                            <span className="text-white font-bold">
                              {intern.scratch.tickets}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">
                              Uang Dihabiskan
                            </span>
                            <span className="text-red-400 font-bold">
                              {intern.scratch.spent.toLocaleString()} NC
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Menang</span>
                            <span className="text-green-400 font-bold">
                              {intern.scratch.wins}x (
                              {intern.scratch.won.toLocaleString()} NC)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Racing */}
                      <div className="bg-black/30 border border-border/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Trophy className="w-4 h-4 text-rose-400" />
                          <span className="text-sm font-bold text-white">
                            Pacuan Truk
                          </span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Total Taruhan</span>
                            <span className="text-white font-bold">
                              {intern.racing.bets}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">NC Ditaruhkan</span>
                            <span className="text-red-400 font-bold">
                              {intern.racing.betAmount.toLocaleString()} NC
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Menang</span>
                            <span className="text-green-400 font-bold">
                              {intern.racing.wins}x (
                              {intern.racing.won.toLocaleString()} NC)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Market */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                      🛒 Aktivitas Market
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <StatCard
                        icon={ShoppingBag}
                        label="Mod Dibeli"
                        value={intern.market.purchases}
                        color="text-cyan-400"
                      />
                      <StatCard
                        icon={Coins}
                        label="NC Dibelanjakan"
                        value={`${intern.market.spent.toLocaleString()} NC`}
                        color="text-amber-400"
                      />
                    </div>
                  </div>

                  {/* Evaluasi & Promosi */}
                  <div className="border-t border-border/30 pt-6 mt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1">
                        Evaluasi & Promosi
                      </h4>
                      <div className="text-xs text-gray-400 space-y-1.5">
                        {intern.probation?.isOverdue && (
                          <div className="flex items-center gap-2 text-rose-300 font-bold bg-rose-950/50 border border-rose-500/40 px-3 py-1.5 rounded-xl mb-2">
                            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 animate-pulse" />
                            <span>
                              Perhatian: Driver magang telah melewati batas 3
                              bulan ({intern.daysSinceJoin} hari). Segera tindak
                              lanjuti evaluasi akhir.
                            </span>
                          </div>
                        )}

                        {intern.quiz ? (
                          <div className="flex items-center gap-2">
                            Status Ujian:
                            <span
                              className={`font-bold px-2 py-0.5 rounded-full ${intern.quiz.passed ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
                            >
                              {intern.quiz.passed ? "LULUS" : "GAGAL"}
                            </span>
                            | Skor:{" "}
                            <span className="font-bold text-white">
                              {intern.quiz.latestScore}
                            </span>
                            | Percobaan:{" "}
                            <span className="font-bold text-white">
                              {intern.quiz.attemptCount}x
                            </span>
                          </div>
                        ) : (
                          <div className="text-gray-400">
                            Belum ada data ujian kelayakan. Ujian dilaksanakan
                            di akhir setelah performa magang dipantau.
                          </div>
                        )}

                        {intern.evaluation?.active && (
                          <div className="flex items-center gap-2 text-indigo-400 font-semibold mt-1">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                            <span>
                              Sesi Evaluasi Aktif:{" "}
                              <code className="bg-indigo-950/60 px-2 py-0.5 rounded text-indigo-300 border border-indigo-500/30 text-[11px]">
                                {intern.evaluation.active.channelName}
                              </code>
                            </span>
                          </div>
                        )}

                        <p className="text-[11px] text-gray-500 italic">
                          💡 SOP: Driver magang mempelajari guidebook selama
                          masa pemantauan (maks. 90 hari). Panggil evaluasi dan
                          berikan Ujian SOP di akhir sebelum promosi resmi.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Tombol Lihat Riwayat Hasil Evaluasi */}
                      {intern.evaluation?.history?.length > 0 && (
                        <button
                          type="button"
                          onClick={() => openHistoryModal(intern)}
                          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-card hover:bg-muted text-gray-300 hover:text-white border border-border text-xs font-bold transition shadow-sm"
                          title="Lihat Riwayat Hasil Evaluasi"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-400" />
                          <span>
                            Hasil Evaluasi ({intern.evaluation.history.length})
                          </span>
                        </button>
                      )}

                      {/* Tombol Aksi Evaluasi: Aktif vs Panggil */}
                      {intern.evaluation?.active ? (
                        <>
                          <a
                            href={`https://discord.com/channels/${guildId}/${intern.evaluation.active.channelId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
                            title="Buka Channel Evaluasi di Discord"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> Buka
                            Channel <ExternalLink className="w-3 h-3" />
                          </a>
                          <button
                            type="button"
                            onClick={() => openCloseModal(intern)}
                            disabled={actionLoading === intern._id}
                            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
                            title="Tutup Channel & Simpan Hasil Evaluasi (+2 Poin KPI)"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Tutup
                            Evaluasi (+2 KPI)
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartEvaluation(intern)}
                          disabled={actionLoading === intern._id}
                          className="flex items-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5 text-indigo-400" />
                          {actionLoading === intern._id
                            ? "Memproses..."
                            : "Panggil untuk Evaluasi"}
                        </button>
                      )}

                      {/* Tombol Ujian / Promosi */}
                      {intern.quiz?.passed ? (
                        <button
                          onClick={() => handlePromote(intern)}
                          disabled={actionLoading === intern._id}
                          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          {actionLoading === intern._id
                            ? "Memproses..."
                            : "Luluskan (Promosi)"}{" "}
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      ) : intern.quiz?.attemptCount >= 2 ? (
                        <button
                          onClick={() => handleResetQuiz(intern)}
                          disabled={actionLoading === intern._id}
                          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          {actionLoading === intern._id
                            ? "Memproses..."
                            : "Reset Ujian"}{" "}
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleInterview(intern)}
                          disabled={actionLoading === intern._id}
                          className="flex items-center gap-2 bg-accent-lilac hover:bg-accent-lilac/80 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          {actionLoading === intern._id
                            ? "Memproses..."
                            : "Mulai Interview"}{" "}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Tutup & Selesaikan Evaluasi Driver */}
      {closeModalIntern && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border p-6 md:p-8 rounded-3xl w-full max-w-lg shadow-2xl space-y-5 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-foreground">
                    Selesaikan Evaluasi Driver
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Driver:{" "}
                    <span className="font-bold text-white">
                      {closeModalIntern.name}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCloseModalIntern(null)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitCloseEvaluation} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-indigo-400">
                  <ShieldCheck className="w-4 h-4" /> Insentif KPI Payroll
                  Manager
                </div>
                <p className="text-indigo-200/80 leading-relaxed">
                  Menutup evaluasi ini akan menghapus channel Discord evaluasi
                  secara otomatis dan memberikan{" "}
                  <strong className="text-amber-400">
                    +2 Poin KPI Payroll
                  </strong>{" "}
                  kepada Anda.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Alasan Penutupan (Close Reason){" "}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                  placeholder="Contoh: Sesi review berkala selesai, siap ikut konvoi"
                  className="w-full bg-black/30 border border-border rounded-xl px-3.5 py-2.5 text-foreground text-xs outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Catatan / Hasil Evaluasi{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={evaluationNotes}
                  onChange={(e) => setEvaluationNotes(e.target.value)}
                  placeholder="Tuliskan hasil evaluasi driver magang secara rinci (etika berkendara, komitmen, pemahaman aturan VTC, poin perbaikan, dll) agar dapat dilihat seluruh manajer..."
                  className="w-full bg-black/30 border border-border rounded-xl p-3 text-foreground text-xs outline-none focus:border-indigo-500 transition-colors resize-none leading-relaxed"
                />
                <span className="text-[11px] text-muted-foreground block">
                  Catatan ini akan tersimpan permanen dan dapat ditinjau oleh
                  seluruh jajaran manajemen.
                </span>
              </div>

              <div className="flex gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCloseModalIntern(null)}
                  className="flex-1 py-2.5 bg-card hover:bg-muted text-foreground font-bold text-xs rounded-xl border border-border transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClose}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-bold text-xs transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSubmittingClose ? "Menyimpan..." : "Tutup & Klaim 2 Poin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Riwayat Hasil Evaluasi Driver */}
      {historyModalIntern && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border p-6 md:p-8 rounded-3xl w-full max-w-2xl shadow-2xl space-y-5 relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-foreground">
                    Riwayat Hasil Evaluasi
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Driver:{" "}
                    <span className="font-bold text-white">
                      {historyModalIntern.name}
                    </span>{" "}
                    ({historyModalIntern.evaluation?.history?.length || 0} Sesi
                    Evaluasi)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalIntern(null)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {historyModalIntern.evaluation?.history?.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-xs">
                  Belum ada catatan evaluasi sebelumnya.
                </div>
              ) : (
                historyModalIntern.evaluation?.history?.map(
                  (evalItem: any, idx: number) => (
                    <div
                      key={evalItem._id || idx}
                      className="p-4 rounded-2xl bg-black/20 border border-border/80 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                            Selesai
                          </span>
                          <span className="text-xs font-bold text-white">
                            Dievaluasi oleh:{" "}
                            {evalItem.closedByManagerName || "Manager"}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {evalItem.closedAt
                            ? `${new Date(evalItem.closedAt).toLocaleString(
                                "id-ID",
                                {
                                  timeZone: "Asia/Jakarta",
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )} WIB`
                            : "-"}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="text-muted-foreground">
                          <span className="font-semibold text-gray-400">
                            Alasan Penutupan:{" "}
                          </span>
                          <span className="text-white">
                            {evalItem.closeReason}
                          </span>
                        </div>
                        <div className="pt-2">
                          <span className="font-semibold text-indigo-400 block mb-1">
                            Catatan & Hasil Evaluasi:
                          </span>
                          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-gray-200 text-xs leading-relaxed whitespace-pre-wrap">
                            {evalItem.evaluationNotes ||
                              "Tidak ada catatan evaluasi tambahan."}
                          </div>
                        </div>
                      </div>
                    </div>
                  ),
                )
              )}
            </div>

            <div className="pt-3 border-t border-border shrink-0">
              <button
                type="button"
                onClick={() => setHistoryModalIntern(null)}
                className="w-full py-2.5 bg-card hover:bg-muted text-foreground font-bold text-xs rounded-xl border border-border transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
