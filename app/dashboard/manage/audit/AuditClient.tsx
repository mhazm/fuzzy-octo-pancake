"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Trash2,
  UserX,
  UserCheck,
  AlertTriangle,
  ArrowLeft,
  Search,
  Database,
  Coins,
  Activity,
  UserMinus,
  Sparkles,
  ExternalLink,
  Layers,
  HelpCircle,
  Clock,
  Radio,
  Gauge,
  CheckCircle2,
  XCircle,
  Umbrella,
  Calendar,
  Filter,
  Users,
  Check,
  AlertCircle,
} from "lucide-react";
import { showAlert, showConfirm } from "@/lib/dialog";
import {
  setUserDriverStatus,
  bulkFixInactiveUsers,
  removeDiscordRoleAction,
  deleteOrphanedUserData,
  bulkCleanOrphanedData,
  penalizeDriverMinKm,
  batchPenalizeMinKm,
} from "./actions";

export interface KmDriverRow {
  userId: string;
  truckyId: number | string;
  driverName: string;
  avatarUrl?: string | null;
  totalKm: number;
  totalJobs: number;
  isCompliant: boolean;
  isOnLeave: boolean;
  leaveReason?: string | null;
  leaveDateRange?: string | null;
  isAlreadyPenalized: boolean;
  penaltyRecord?: {
    points: number;
    createdAt: string;
    reason: string;
  } | null;
  joinedAt?: string | null;
  joinedInAuditMonth: boolean;
}

export interface KmAuditData {
  selectedMonth: string;
  selectedMonthLabel: string;
  targetKm: number;
  availableMonths: { monthKey: string; label: string; jobCount: number }[];
  summary: {
    totalDrivers: number;
    compliantDrivers: number;
    violatingDrivers: number;
    onLeaveDrivers: number;
    alreadyPenalizedDrivers: number;
    pendingPenaltyDrivers: number;
    totalAuditJobs: number;
    totalAuditKm: number;
  };
  drivers: KmDriverRow[];
}

interface Stats {
  totalDiscordMembers: number;
  totalDriverLinks: number;
  totalWebUsers: number;
  discordDriverCount: number;
  discordInternCount: number;
  totalCurrencyRecords: number;
  totalPointsRecords: number;
  totalOrphanedAccounts: number;
  totalOrphanedNCLogs: number;
  totalOrphanedPointLogs: number;
  totalOrphanedCurrAccounts: number;
  totalOrphanedPointAccounts: number;
}

interface DiscordRoleAnomaly {
  discordId: string;
  username: string;
  displayName: string;
  roleType: "driver" | "intern" | "both";
  roleLabel: string;
  joinedDiscord: string | null;
  inWebDb: boolean;
  webName: string | null;
  webIsDriver: boolean | null;
  webTruckyId: string | number | null;
}

interface UserIsDriverAnomaly {
  _id: string;
  name: string;
  discordId: string;
  truckyId: string | number | null;
  inDiscord: boolean;
  discordRoles: string[];
  lastSeen: string | null;
}

interface DriverLinkAnomaly {
  truckyName: string;
  truckyId: number | string;
  discordId: string;
  createdAt?: string | null;
  username?: string;
  displayName?: string;
}

interface OrphanedDataRecord {
  discordId: string;
  userName: string | null;
  inDiscord: boolean;
  currencyHistoriesCount: number;
  pointHistoriesCount: number;
  ncBalance: number;
  pointBalance: number;
  lastDate: string | null;
}

export const defaultKmAuditData: KmAuditData = {
  selectedMonth: "2026-08",
  selectedMonthLabel: "Agustus 2026",
  targetKm: 2500,
  availableMonths: [],
  summary: {
    totalDrivers: 0,
    compliantDrivers: 0,
    violatingDrivers: 0,
    onLeaveDrivers: 0,
    alreadyPenalizedDrivers: 0,
    pendingPenaltyDrivers: 0,
    totalAuditJobs: 0,
    totalAuditKm: 0,
  },
  drivers: [],
};

export type AuditTabType = "roles" | "km_tracker" | "orphans" | "guide";

export default function AuditClient({
  stats,
  discordRoleAnomalies = [],
  usersIsDriverAnomalies = [],
  driverLinksMissingDiscord = [],
  driverLinksMissingRole = [],
  orphanedDataList = [],
  kmAuditData = defaultKmAuditData,
}: {
  stats: Stats;
  discordRoleAnomalies?: DiscordRoleAnomaly[];
  usersIsDriverAnomalies?: UserIsDriverAnomaly[];
  driverLinksMissingDiscord?: DriverLinkAnomaly[];
  driverLinksMissingRole?: DriverLinkAnomaly[];
  orphanedDataList?: OrphanedDataRecord[];
  kmAuditData?: KmAuditData;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentKmData = kmAuditData || defaultKmAuditData;
  const kmSummary = currentKmData?.summary || defaultKmAuditData.summary;
  const kmDrivers = currentKmData?.drivers || [];

  const queryTab = searchParams.get("tab") as AuditTabType | null;
  const [activeTab, setActiveTab] = useState<AuditTabType>(
    queryTab && ["roles", "km_tracker", "orphans", "guide"].includes(queryTab)
      ? queryTab
      : "km_tracker"
  );

  const [searchOrphan, setSearchOrphan] = useState("");
  const [searchKm, setSearchKm] = useState("");
  const [filterKm, setFilterKm] = useState<"all" | "pending" | "violating" | "leave" | "penalized" | "compliant">("all");
  const [executingId, setExecutingId] = useState<string | null>(null);

  useEffect(() => {
    const tab = searchParams.get("tab") as AuditTabType | null;
    if (tab && ["roles", "km_tracker", "orphans", "guide"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const totalRoleAnomalies =
    discordRoleAnomalies.length +
    usersIsDriverAnomalies.length +
    driverLinksMissingDiscord.length;

  const filteredOrphans = orphanedDataList.filter((o) => {
    if (!searchOrphan.trim()) return true;
    const q = searchOrphan.toLowerCase();
    return (
      o.discordId.toLowerCase().includes(q) ||
      (o.userName && o.userName.toLowerCase().includes(q))
    );
  });

  const filteredKmDrivers = kmDrivers.filter((d) => {
    // 1. Status Filter
    if (filterKm === "pending" && !(!d.isCompliant && !d.isOnLeave && !d.isAlreadyPenalized)) {
      return false;
    }
    if (filterKm === "violating" && d.isCompliant) {
      return false;
    }
    if (filterKm === "leave" && !d.isOnLeave) {
      return false;
    }
    if (filterKm === "penalized" && !d.isAlreadyPenalized) {
      return false;
    }
    if (filterKm === "compliant" && !d.isCompliant) {
      return false;
    }

    // 2. Search Query
    if (searchKm.trim()) {
      const q = searchKm.toLowerCase();
      const matchName = d.driverName ? d.driverName.toLowerCase().includes(q) : false;
      const matchDiscord = d.userId ? d.userId.toLowerCase().includes(q) : false;
      const matchTrucky = d.truckyId ? String(d.truckyId).toLowerCase().includes(q) : false;
      return matchName || matchDiscord || matchTrucky;
    }

    return true;
  });

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const handleMonthChange = (newMonth: string) => {
    startTransition(() => {
      router.push(`/dashboard/manage/audit?month=${newMonth}&tab=km_tracker`);
    });
  };

  // Penalti Single Driver untuk Minimum KM
  const handleSinglePenalizeKm = async (row: KmDriverRow) => {
    if (row.isOnLeave) {
      await showAlert(`Driver "${row.driverName}" berstatus cuti resmi dan dibebaskan dari penalti minimum KM.`);
      return;
    }
    if (row.isAlreadyPenalized) {
      await showAlert(`Driver "${row.driverName}" sudah pernah dijatuhi penalti untuk bulan ${currentKmData.selectedMonthLabel}.`);
      return;
    }

    const confirmed = await showConfirm(
      `Jatuhkan penalti +5 Poin Penalti (PTS) kepada "${row.driverName}" (${row.userId}) karena tidak memenuhi target 2.500 KM pada bulan ${currentKmData.selectedMonthLabel}?\n\nPencapaian: ${row.totalKm.toLocaleString("id-ID")} KM (${row.totalJobs} pengiriman).`
    );
    if (!confirmed) return;

    setExecutingId(`km-${row.userId}`);
    try {
      const res = await penalizeDriverMinKm(row.userId, currentKmData.selectedMonth);
      if (res.success) {
        await showAlert(res.message);
        router.refresh();
      } else {
        await showAlert(`Gagal: ${res.message}`);
      }
    } catch (err: any) {
      await showAlert(`Error: ${err.message || "Terjadi kesalahan"}`);
    } finally {
      setExecutingId(null);
    }
  };

  // Batch Penalti Seluruh Driver yang Melanggar
  const handleBatchPenalizeKm = async () => {
    const targets = kmDrivers
      .filter((d) => !d.isCompliant && !d.isOnLeave && !d.isAlreadyPenalized)
      .map((d) => d.userId);

    if (targets.length === 0) {
      await showAlert(
        `Tidak ada driver yang perlu dihukum untuk bulan ${currentKmData.selectedMonthLabel}. Seluruh pelanggar sudah pernah dihukum atau berstatus cuti resmi.`
      );
      return;
    }

    const confirmed = await showConfirm(
      `PERINGATAN EKSEKUSI PENALTI MASSAL:\n\nAnda akan memberikan +5 PTS kepada ${targets.length} driver yang belum memenuhi target 2.500 KM untuk periode ${currentKmData.selectedMonthLabel}.\n\nCatatan Penting:\n- ${kmSummary.onLeaveDrivers} driver berstatus izin cuti otomatis DILEWATI (bebas penalti).\n- Driver yang sudah dihukum otomatis dilewati.\n\nLanjutkan eksekusi penalti massal ini?`
    );
    if (!confirmed) return;

    setExecutingId("batch-km");
    try {
      const res = await batchPenalizeMinKm(targets, currentKmData.selectedMonth);
      if (res.success) {
        await showAlert(res.message);
        router.refresh();
      } else {
        await showAlert(`Gagal: ${res.message}`);
      }
    } catch (err: any) {
      await showAlert(`Error: ${err.message || "Terjadi kesalahan"}`);
    } finally {
      setExecutingId(null);
    }
  };

  // 1. Cabut Role Discord
  const handleRemoveDiscordRole = async (
    discordId: string,
    username: string,
    roleType: "driver" | "intern" | "both"
  ) => {
    const confirmed = await showConfirm(
      `Yakin ingin mencabut role ${roleType.toUpperCase()} dari "${username}" di server Discord?`
    );
    if (!confirmed) return;

    setExecutingId(`discord-${discordId}`);
    try {
      const res = await removeDiscordRoleAction(discordId, roleType);
      if (res.success) {
        await showAlert(res.message);
        router.refresh();
      } else {
        await showAlert(`Gagal: ${res.message}`);
      }
    } catch (err: any) {
      await showAlert(`Error: ${err.message || "Terjadi kesalahan"}`);
    } finally {
      setExecutingId(null);
    }
  };

  // 2. Set isDriver = false per user
  const handleSetUserDriverFalse = async (discordId: string, name: string) => {
    const confirmed = await showConfirm(
      `Ubah status "${name}" (${discordId}) menjadi isDriver: false?`
    );
    if (!confirmed) return;

    setExecutingId(`user-${discordId}`);
    try {
      const res = await setUserDriverStatus(discordId, false);
      if (res.success) {
        await showAlert(res.message);
        router.refresh();
      } else {
        await showAlert(`Gagal: ${res.message}`);
      }
    } catch (err: any) {
      await showAlert(`Error: ${err.message}`);
    } finally {
      setExecutingId(null);
    }
  };

  // 3. Batch Fix isDriver
  const handleBulkFixUsers = async () => {
    const confirmed = await showConfirm(
      `Tindakan ini akan menonaktifkan isDriver: false untuk seluruh ${usersIsDriverAnomalies.length} user yang tidak ada di driverlinks. Lanjutkan?`
    );
    if (!confirmed) return;

    setExecutingId("bulk-users");
    try {
      const res = await bulkFixInactiveUsers();
      if (res.success) {
        await showAlert(res.message);
        router.refresh();
      } else {
        await showAlert(`Gagal: ${res.message}`);
      }
    } catch (err: any) {
      await showAlert(`Error: ${err.message}`);
    } finally {
      setExecutingId(null);
    }
  };

  // 4. Hapus Data Orphaned Per-User
  const handleDeleteOrphanSingle = async (discordId: string, name: string | null) => {
    const confirmed = await showConfirm(
      `PERINGATAN: Hapus seluruh log riwayat NC, riwayat Poin, serta saldo yatim piatu untuk ${name || discordId}? Tindakan ini tidak dapat dibatalkan.`
    );
    if (!confirmed) return;

    setExecutingId(`orphan-${discordId}`);
    try {
      const res = await deleteOrphanedUserData(discordId);
      if (res.success) {
        await showAlert(res.message);
        router.refresh();
      } else {
        await showAlert(`Gagal: ${res.message}`);
      }
    } catch (err: any) {
      await showAlert(`Error: ${err.message}`);
    } finally {
      setExecutingId(null);
    }
  };

  // 5. Bulk Clean All Orphaned Data
  const handleBulkCleanOrphans = async () => {
    const confirmed = await showConfirm(
      `PERINGATAN BERSIHKAN MASSAL:\n\nAnda akan menghapus seluruh data riwayat (${stats.totalOrphanedNCLogs} log NC, ${stats.totalOrphanedPointLogs} log Poin) dan membersihkan saldo (${stats.totalOrphanedCurrAccounts} akun NC, ${stats.totalOrphanedPointAccounts} akun Poin) dari ${stats.totalOrphanedAccounts} mantan driver yang tidak lagi berada di DriverLinks.\n\nLanjutkan pembersihan permanen?`
    );
    if (!confirmed) return;

    setExecutingId("bulk-orphans");
    try {
      const res = await bulkCleanOrphanedData();
      if (res.success) {
        await showAlert(res.message);
        router.refresh();
      } else {
        await showAlert(`Gagal: ${res.message}`);
      }
    } catch (err: any) {
      await showAlert(`Error: ${err.message}`);
    } finally {
      setExecutingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
      {/* TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/manage"
              className="p-2 rounded-xl bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
              title="Kembali ke Manager Hub"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
                  Management Audit
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  Guild: 863959415702028318
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2 mt-1">
                Audit Center & Data Integrity
              </h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
            Pusat pemantauan integritas data komunitas. Lacak ketidaksesuaian role Discord, status driver web, serta bersihkan riwayat mutasi yatim piatu (orphaned records) secara terpusat.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/80 hover:border-primary/50 text-foreground text-xs font-bold transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-primary ${isPending ? "animate-spin" : ""}`} />
            {isPending ? "Memindai..." : "Pindai Ulang"}
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: DriverLinks */}
        <div className="p-4 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/60 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              DriverLinks Resmi
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-foreground">{stats.totalDriverLinks}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              dari {stats.totalDiscordMembers} Member Discord
            </p>
          </div>
        </div>

        {/* Card 2: Discord Roles Anomaly */}
        <div className="p-4 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/60 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Anomali Role Discord
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
              discordRoleAnomalies.length > 0
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className={`text-2xl font-black ${
              discordRoleAnomalies.length > 0 ? "text-amber-400" : "text-emerald-400"
            }`}>
              {discordRoleAnomalies.length}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Punya role tanpa DriverLink
            </p>
          </div>
        </div>

        {/* Card 3: Web DB isDriver Mismatch */}
        <div className="p-4 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/60 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              isDriver Web Anomali
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
              usersIsDriverAnomalies.length > 0
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            }`}>
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className={`text-2xl font-black ${
              usersIsDriverAnomalies.length > 0 ? "text-red-400" : "text-emerald-400"
            }`}>
              {usersIsDriverAnomalies.length}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              isDriver true tanpa DriverLink
            </p>
          </div>
        </div>

        {/* Card 4: Orphaned Records */}
        <div className="p-4 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/60 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Data Orphaned (Yatim)
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
              stats.totalOrphanedAccounts > 0
                ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            }`}>
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-purple-400">
              {stats.totalOrphanedAccounts}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {stats.totalOrphanedNCLogs + stats.totalOrphanedPointLogs} log riwayat menggantung
            </p>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-border/70 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("km_tracker")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "km_tracker"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-card"
          }`}
        >
          <Gauge className="w-4 h-4" />
          Tracker Minimum KM (2.500 KM)
          {kmSummary.pendingPenaltyDrivers > 0 ? (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === "km_tracker"
                ? "bg-rose-500 text-white"
                : "bg-rose-500/20 text-rose-400"
            }`}>
              {kmSummary.pendingPenaltyDrivers} Perlu Tindakan
            </span>
          ) : (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === "km_tracker"
                ? "bg-emerald-500 text-white"
                : "bg-emerald-500/20 text-emerald-400"
            }`}>
              Aman
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("roles")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "roles"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-card"
          }`}
        >
          <Radio className="w-4 h-4" />
          Audit Keanggotaan & Role
          {totalRoleAnomalies > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === "roles"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-amber-500/20 text-amber-400"
            }`}>
              {totalRoleAnomalies}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("orphans")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "orphans"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-card"
          }`}
        >
          <Trash2 className="w-4 h-4" />
          Data Yatim Piatu (Orphaned)
          {stats.totalOrphanedAccounts > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === "orphans"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-purple-500/20 text-purple-400"
            }`}>
              {stats.totalOrphanedAccounts}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("guide")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "guide"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-card"
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          Panduan & Mekanisme
        </button>
      </div>

      {/* TAB 1: DISCORD & MEMBERSHIP ROLE AUDIT */}
      {activeTab === "roles" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* SECTION 1A: Role Discord tapi bukan driverlink */}
          <div className="p-6 rounded-3xl bg-card border border-border/70 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
              <div>
                <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                  Member Discord Ber-role Driver/Intern Tanpa DriverLink
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Akun di server Discord Nismara yang memegang role Driver atau Intern, namun belum/tidak memiliki record resmi di database `driverlinks`.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-400 border border-amber-500/20 self-start sm:self-auto">
                {discordRoleAnomalies.length} Ditemukan
              </span>
            </div>

            {discordRoleAnomalies.length === 0 ? (
              <div className="py-8 text-center bg-background/50 rounded-2xl border border-dashed border-border/60">
                <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-bold text-foreground">Sinkronisasi Sempurna!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Seluruh pemilik role Driver dan Intern di server Discord sudah terhubung ke DriverLinks resmi.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full text-left text-xs">
                  <thead className="bg-background/80 text-muted-foreground font-black uppercase text-[10px] tracking-wider border-b border-border/50">
                    <tr>
                      <th className="p-3">Member Discord</th>
                      <th className="p-3">Discord ID</th>
                      <th className="p-3">Role Discord</th>
                      <th className="p-3">Status Web</th>
                      <th className="p-3 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-medium">
                    {discordRoleAnomalies.map((m) => (
                      <tr key={m.discordId} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <p className="font-bold text-foreground">{m.displayName}</p>
                          <p className="text-[11px] text-muted-foreground">@{m.username}</p>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-muted-foreground">
                          {m.discordId}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                            m.roleType === "both"
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                              : m.roleType === "driver"
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          }`}>
                            {m.roleLabel}
                          </span>
                        </td>
                        <td className="p-3">
                          {m.inWebDb ? (
                            <span className="text-[11px] text-emerald-400 font-bold">
                              ✓ Terdaftar ({m.webName})
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">
                              Belum pernah login web
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleRemoveDiscordRole(m.discordId, m.displayName, m.roleType)}
                            disabled={executingId === `discord-${m.discordId}`}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[11px] font-bold transition-all disabled:opacity-50"
                          >
                            {executingId === `discord-${m.discordId}` ? "Memproses..." : "Cabut Role"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 1B: isDriver true di web tapi bukan driverlink */}
          <div className="p-6 rounded-3xl bg-card border border-border/70 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
              <div>
                <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                  <UserX className="w-5 h-5 text-red-400" />
                  User Web (isDriver: true) Tanpa DriverLink
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Akun di database web yang statusnya masih aktif sebagai pengemudi (`isDriver: true`), padahal sudah tidak ada di `driverlinks`.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-red-500/10 text-red-400 border border-red-500/20">
                  {usersIsDriverAnomalies.length} Ditemukan
                </span>
                {usersIsDriverAnomalies.length > 0 && (
                  <button
                    onClick={handleBulkFixUsers}
                    disabled={executingId === "bulk-users"}
                    className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                  >
                    {executingId === "bulk-users" ? "Memproses..." : "Nonaktifkan Semua (Batch Fix)"}
                  </button>
                )}
              </div>
            </div>

            {usersIsDriverAnomalies.length === 0 ? (
              <div className="py-8 text-center bg-background/50 rounded-2xl border border-dashed border-border/60">
                <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-bold text-foreground">Database User Sinkron!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tidak ada akun web yang memiliki status isDriver: true tanpa keanggotaan DriverLinks.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full text-left text-xs">
                  <thead className="bg-background/80 text-muted-foreground font-black uppercase text-[10px] tracking-wider border-b border-border/50">
                    <tr>
                      <th className="p-3">User Web</th>
                      <th className="p-3">Discord ID</th>
                      <th className="p-3">Trucky ID</th>
                      <th className="p-3">Status di Server Discord</th>
                      <th className="p-3 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-medium">
                    {usersIsDriverAnomalies.map((u) => (
                      <tr key={u._id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-bold text-foreground">{u.name}</td>
                        <td className="p-3 font-mono text-[11px] text-muted-foreground">{u.discordId}</td>
                        <td className="p-3">{u.truckyId || "-"}</td>
                        <td className="p-3">
                          {u.inDiscord ? (
                            <span className="text-[11px] text-amber-400 font-bold">
                              Ada di server (Tanpa role driver)
                            </span>
                          ) : (
                            <span className="text-[11px] text-red-400 font-bold">
                              Sudah keluar dari server
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleSetUserDriverFalse(u.discordId, u.name)}
                            disabled={executingId === `user-${u.discordId}`}
                            className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[11px] font-bold transition-all disabled:opacity-50"
                          >
                            {executingId === `user-${u.discordId}` ? "Memproses..." : "Set isDriver: false"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 1C: DriverLink tapi sudah tidak ada di Discord */}
          <div className="p-6 rounded-3xl bg-card border border-border/70 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div>
                <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                  <UserMinus className="w-5 h-5 text-blue-400" />
                  DriverLinks Yang Telah Keluar dari Discord
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Driver yang masih terdaftar di koleksi `driverlinks` namun akun Discord-nya sudah meninggalkan server Nismara.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {driverLinksMissingDiscord.length} Ditemukan
              </span>
            </div>

            {driverLinksMissingDiscord.length === 0 ? (
              <div className="py-6 text-center bg-background/50 rounded-2xl border border-dashed border-border/60">
                <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-1.5 opacity-80" />
                <p className="text-xs font-bold text-foreground">100% Driver Berada di Server</p>
                <p className="text-[11px] text-muted-foreground">
                  Seluruh {stats.totalDriverLinks} driver terdaftar aktif berada di dalam server Discord resmi.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full text-left text-xs">
                  <thead className="bg-background/80 text-muted-foreground font-black uppercase text-[10px] tracking-wider border-b border-border/50">
                    <tr>
                      <th className="p-3">Nama Trucky</th>
                      <th className="p-3">Trucky ID</th>
                      <th className="p-3">Discord ID</th>
                      <th className="p-3">Tanggal Didaftarkan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-medium">
                    {driverLinksMissingDiscord.map((dl) => (
                      <tr key={dl.discordId} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-bold text-foreground">{dl.truckyName}</td>
                        <td className="p-3 font-mono">{dl.truckyId}</td>
                        <td className="p-3 font-mono text-[11px] text-muted-foreground">{dl.discordId}</td>
                        <td className="p-3 text-muted-foreground">
                          {dl.createdAt
                            ? new Date(dl.createdAt).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: TRACKER MINIMUM KM BULANAN (2.500 KM) */}
      {activeTab === "km_tracker" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* HEADER TOOLBAR */}
          <div className="p-6 rounded-3xl bg-card border border-border/70 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  Target Wajib: 2.500 KM / Bulan
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  Aturan VTC Nismara
                </span>
              </div>
              <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
                <Gauge className="w-6 h-6 text-primary" />
                Tracker Kepatuhan Minimum KM ({currentKmData.selectedMonthLabel})
              </h2>
              <p className="text-xs text-muted-foreground max-w-2xl">
                Pantau realisasi jarak tempuh seluruh driver resmi setiap bulan. Driver yang tidak memenuhi target 2.500 KM dikenakan sanksi <strong>+5 Poin Penalti</strong>. Driver dengan izin cuti resmi otomatis dibebaskan dari penalti.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* MONTH SELECTOR */}
              <div className="flex items-center gap-2 bg-background/80 border border-border/80 rounded-xl px-3 py-1.5 shadow-sm">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <label htmlFor="audit-month-select" className="sr-only">Pilih Periode Bulan</label>
                <select
                  id="audit-month-select"
                  value={currentKmData.selectedMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  disabled={isPending}
                  className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer pr-2"
                >
                  {(currentKmData.availableMonths || []).map((m) => (
                    <option key={m.monthKey} value={m.monthKey} className="bg-card text-foreground">
                      {m.label} ({m.jobCount} jobs)
                    </option>
                  ))}
                </select>
              </div>

              {/* BATCH PENALTY ACTION */}
              <button
                onClick={handleBatchPenalizeKm}
                disabled={kmSummary.pendingPenaltyDrivers === 0 || executingId !== null}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-black shadow-lg shadow-rose-600/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                title={
                  kmSummary.pendingPenaltyDrivers === 0
                    ? "Tidak ada driver yang perlu dihukum"
                    : `Jatuhkan penalti +5 PTS kepada ${kmSummary.pendingPenaltyDrivers} driver yang melanggar`
                }
              >
                <AlertTriangle className={`w-4 h-4 ${executingId === "batch-km" ? "animate-spin" : ""}`} />
                {executingId === "batch-km" ? "Memproses Batch..." : `Penalti Semua Pelanggar (${kmSummary.pendingPenaltyDrivers})`}
              </button>
            </div>
          </div>

          {/* 5 KPI SUMMARY CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* Card 1: Total Drivers */}
            <div className="p-4 rounded-2xl bg-card border border-border/60 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Total Driver
                </span>
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-foreground">
                  {kmSummary.totalDrivers}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {kmSummary.totalAuditJobs.toLocaleString("id-ID")} jobs ({Math.round(kmSummary.totalAuditKm).toLocaleString("id-ID")} KM)
                </p>
              </div>
            </div>

            {/* Card 2: Compliant */}
            <div className="p-4 rounded-2xl bg-card border border-border/60 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Memenuhi Target
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-black text-emerald-400">
                    {kmSummary.compliantDrivers}
                  </p>
                  <span className="text-xs font-bold text-emerald-400/80">
                    ({kmSummary.totalDrivers > 0 ? ((kmSummary.compliantDrivers / kmSummary.totalDrivers) * 100).toFixed(0) : 0}%)
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Jarak tempuh ≥ 2.500 KM
                </p>
              </div>
            </div>

            {/* Card 3: Violating */}
            <div className="p-4 rounded-2xl bg-card border border-border/60 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Melanggar Target
                </span>
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-black text-amber-400">
                    {kmSummary.violatingDrivers}
                  </p>
                  <span className="text-xs font-bold text-amber-400/80">
                    ({kmSummary.totalDrivers > 0 ? ((kmSummary.violatingDrivers / kmSummary.totalDrivers) * 100).toFixed(0) : 0}%)
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Jarak tempuh &lt; 2.500 KM
                </p>
              </div>
            </div>

            {/* Card 4: On Leave (Exempted) */}
            <div className="p-4 rounded-2xl bg-card border border-border/60 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Izin Cuti (Bebas)
                </span>
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
                  <Umbrella className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-sky-400">
                  {kmSummary.onLeaveDrivers}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Bebas penalti karena cuti resmi
                </p>
              </div>
            </div>

            {/* Card 5: Pending Penalty (Action Required) */}
            <div className="p-4 rounded-2xl bg-card border border-rose-500/30 bg-rose-500/5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                  Perlu Tindakan
                </span>
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-black text-rose-400">
                    {kmSummary.pendingPenaltyDrivers}
                  </p>
                  {kmSummary.pendingPenaltyDrivers > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Belum dijatuhi penalti +5 PTS
                </p>
              </div>
            </div>
          </div>

          {/* FILTER BAR & SEARCH */}
          <div className="p-4 rounded-2xl bg-card border border-border/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => setFilterKm("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  filterKm === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                Semua ({kmSummary.totalDrivers})
              </button>
              <button
                onClick={() => setFilterKm("pending")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  filterKm === "pending"
                    ? "bg-rose-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                Perlu Tindakan ({kmSummary.pendingPenaltyDrivers})
              </button>
              <button
                onClick={() => setFilterKm("violating")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  filterKm === "violating"
                    ? "bg-amber-500 text-black shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                Melanggar Target ({kmSummary.violatingDrivers})
              </button>
              <button
                onClick={() => setFilterKm("leave")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  filterKm === "leave"
                    ? "bg-sky-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                Izin Cuti ({kmSummary.onLeaveDrivers})
              </button>
              <button
                onClick={() => setFilterKm("penalized")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  filterKm === "penalized"
                    ? "bg-purple-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                Sudah Dihukum ({kmSummary.alreadyPenalizedDrivers})
              </button>
              <button
                onClick={() => setFilterKm("compliant")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  filterKm === "compliant"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                Memenuhi Target ({kmSummary.compliantDrivers})
              </button>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari driver, Discord ID, Trucky ID..."
                value={searchKm}
                onChange={(e) => setSearchKm(e.target.value)}
                className="w-full bg-background/80 border border-border/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* DRIVER COMPLIANCE TABLE */}
          <div className="rounded-3xl bg-card border border-border/70 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-background/80 text-muted-foreground font-black uppercase text-[10px] tracking-wider border-b border-border/50">
                  <tr>
                    <th className="p-3.5">Driver</th>
                    <th className="p-3.5">Jarak Tempuh & Realisasi</th>
                    <th className="p-3.5">Status Kepatuhan</th>
                    <th className="p-3.5">Catatan / Keterangan</th>
                    <th className="p-3.5 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-medium">
                  {filteredKmDrivers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        Tidak ada driver yang cocok dengan kriteria filter atau pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredKmDrivers.map((row) => {
                      const isPendingRow = !row.isCompliant && !row.isOnLeave && !row.isAlreadyPenalized;
                      const progressPct = Math.min(100, Math.round((row.totalKm / 2500) * 100));

                      return (
                        <tr
                          key={row.userId}
                          className={`hover:bg-muted/20 transition-colors ${
                            isPendingRow ? "bg-rose-500/[0.02]" : ""
                          }`}
                        >
                          {/* DRIVER INFO */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl overflow-hidden bg-primary/10 border border-border/60 flex items-center justify-center shrink-0">
                                {row.avatarUrl ? (
                                  <img
                                    src={row.avatarUrl}
                                    alt={row.driverName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xs font-black text-primary uppercase">
                                    {row.driverName.charAt(0)}
                                  </span>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-foreground">
                                    {row.driverName}
                                  </span>
                                  <Link
                                    href={`/profile/${row.truckyId}`}
                                    target="_blank"
                                    className="text-muted-foreground hover:text-primary transition-colors"
                                    title="Buka profil Trucky"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </Link>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono mt-0.5">
                                  <span>ID: {row.userId}</span>
                                  <span>•</span>
                                  <span>#{row.truckyId}</span>
                                </div>
                                {row.joinedInAuditMonth && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 mt-1">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    Baru Bergabung Bulan Ini
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* DISTANCE & PROGRESS */}
                          <td className="p-3.5 min-w-[200px]">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className={row.isCompliant ? "text-emerald-400" : row.isOnLeave ? "text-sky-400" : "text-foreground"}>
                                  {row.totalKm.toLocaleString("id-ID")} KM
                                </span>
                                <span className="text-[11px] text-muted-foreground font-normal">
                                  {row.totalJobs} jobs
                                </span>
                              </div>
                              <div className="w-full bg-background/80 h-2 rounded-full overflow-hidden border border-border/50">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    row.isCompliant
                                      ? "bg-emerald-500"
                                      : row.isOnLeave
                                      ? "bg-sky-500"
                                      : "bg-rose-500"
                                  }`}
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>{progressPct}% dari target</span>
                                <span>Target: 2.500 KM</span>
                              </div>
                            </div>
                          </td>

                          {/* COMPLIANCE STATUS */}
                          <td className="p-3.5 whitespace-nowrap">
                            {row.isCompliant ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Memenuhi Target
                              </span>
                            ) : row.isOnLeave ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                <Umbrella className="w-3.5 h-3.5" />
                                Bebas Penalti (Cuti)
                              </span>
                            ) : row.isAlreadyPenalized ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Sudah Dihukum (+5 PTS)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                <XCircle className="w-3.5 h-3.5" />
                                Melanggar Target
                              </span>
                            )}
                          </td>

                          {/* NOTES & REASONS */}
                          <td className="p-3.5 max-w-[240px]">
                            {row.isOnLeave ? (
                              <div>
                                <p className="text-xs text-sky-400 font-bold truncate">
                                  {row.leaveReason || "Izin Cuti Resmi"}
                                </p>
                                {row.leaveDateRange && (
                                  <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Periode: {row.leaveDateRange}
                                  </p>
                                )}
                              </div>
                            ) : row.isAlreadyPenalized ? (
                              <div>
                                <p className="text-xs text-purple-400 font-bold truncate">
                                  {row.penaltyRecord?.reason || "Penalti 2.500 KM"}
                                </p>
                                {row.penaltyRecord?.createdAt && (
                                  <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Tanggal: {new Date(row.penaltyRecord.createdAt).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric" })}
                                  </p>
                                )}
                              </div>
                            ) : row.isCompliant ? (
                              <p className="text-xs text-muted-foreground">
                                Target bulanan berhasil dicapai.
                              </p>
                            ) : (
                              <p className="text-xs text-rose-400 font-medium">
                                Kurang {(2500 - row.totalKm).toLocaleString("id-ID")} KM dari target minimum.
                              </p>
                            )}
                          </td>

                          {/* ACTIONS */}
                          <td className="p-3.5 text-right whitespace-nowrap">
                            {row.isOnLeave ? (
                              <span
                                className="px-3 py-1.5 rounded-lg bg-sky-500/5 border border-sky-500/20 text-sky-400/60 text-[11px] font-bold cursor-not-allowed inline-flex items-center gap-1"
                                title="Driver berstatus cuti resmi dan dibebaskan dari penalti."
                              >
                                <Umbrella className="w-3 h-3" />
                                Bebas Penalti
                              </span>
                            ) : row.isAlreadyPenalized ? (
                              <span
                                className="px-3 py-1.5 rounded-lg bg-purple-500/5 border border-purple-500/20 text-purple-400/60 text-[11px] font-bold cursor-not-allowed inline-flex items-center gap-1"
                                title="Penalti sudah dijatuhkan untuk bulan ini."
                              >
                                <Check className="w-3 h-3" />
                                Sudah Dihukum
                              </span>
                            ) : row.isCompliant ? (
                              <span
                                className="px-3 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-emerald-400/60 text-[11px] font-bold cursor-not-allowed inline-flex items-center gap-1"
                                title="Driver patuh dan mencapai target."
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Aman
                              </span>
                            ) : (
                              <button
                                onClick={() => handleSinglePenalizeKm(row)}
                                disabled={executingId === `km-${row.userId}`}
                                className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[11px] font-bold transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50 inline-flex items-center gap-1.5"
                                title="Jatuhkan penalti +5 PTS"
                              >
                                <AlertTriangle className={`w-3 h-3 ${executingId === `km-${row.userId}` ? "animate-spin" : ""}`} />
                                {executingId === `km-${row.userId}` ? "Memproses..." : "+5 PTS"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ORPHANED HISTORIES & BALANCES CLEANUP */}
      {activeTab === "orphans" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="p-6 rounded-3xl bg-card border border-border/70 space-y-6 shadow-sm">
            {/* Header & Bulk Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/50 pb-5">
              <div>
                <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-purple-400" />
                  Pembersihan Data Yatim Piatu (Orphaned Records)
                </h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                  Data log mutasi NC (`currencyhistories`), log penalti (`pointhistories`), serta saldo menggantung (`currencies` & `points`) dari mantan driver yang sudah tidak terdaftar di `driverlinks`.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {orphanedDataList.length > 0 && (
                  <button
                    onClick={handleBulkCleanOrphans}
                    disabled={executingId === "bulk-orphans"}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    {executingId === "bulk-orphans"
                      ? "Sedang Membersihkan..."
                      : `Bersihkan Semua (${orphanedDataList.length} Akun)`}
                  </button>
                )}
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-background/50 p-4 rounded-2xl border border-border/50 text-xs">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Akun Yatim</p>
                <p className="text-lg font-black text-purple-400">{stats.totalOrphanedAccounts}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Log NC Yatim</p>
                <p className="text-lg font-black text-amber-400">{stats.totalOrphanedNCLogs.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Log Poin Yatim</p>
                <p className="text-lg font-black text-red-400">{stats.totalOrphanedPointLogs.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Akun Saldo Terpapar</p>
                <p className="text-lg font-black text-blue-400">
                  {stats.totalOrphanedCurrAccounts} NC / {stats.totalOrphanedPointAccounts} Poin
                </p>
              </div>
            </div>

            {/* Filter Search */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan Discord ID atau Nama..."
                  value={searchOrphan}
                  onChange={(e) => setSearchOrphan(e.target.value)}
                  className="w-full bg-background pl-9 pr-4 py-2 rounded-xl border border-border/60 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-all"
                />
              </div>
              <span className="text-xs text-muted-foreground">
                Menampilkan {filteredOrphans.length} dari {orphanedDataList.length} akun
              </span>
            </div>

            {/* Table */}
            {filteredOrphans.length === 0 ? (
              <div className="py-12 text-center bg-background/30 rounded-2xl border border-dashed border-border/60">
                <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-bold text-foreground">Tidak Ada Data Orphaned!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Seluruh data riwayat dan saldo di database sudah 100% sinkron dengan DriverLinks resmi.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border/50">
                <table className="w-full text-left text-xs">
                  <thead className="bg-background/80 text-muted-foreground font-black uppercase text-[10px] tracking-wider border-b border-border/50">
                    <tr>
                      <th className="p-3">User / Discord ID</th>
                      <th className="p-3 text-center">Log Riwayat NC</th>
                      <th className="p-3 text-center">Log Riwayat Poin</th>
                      <th className="p-3 text-right">Saldo NC Menggantung</th>
                      <th className="p-3 text-right">Saldo Poin Menggantung</th>
                      <th className="p-3 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-medium">
                    {filteredOrphans.map((o) => (
                      <tr key={o.discordId} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <p className="font-bold text-foreground">
                            {o.userName || "Ex-Driver"}
                          </p>
                          <p className="text-[11px] font-mono text-muted-foreground">
                            {o.discordId}
                          </p>
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {o.currencyHistoriesCount} log
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                            {o.pointHistoriesCount} log
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-foreground">
                          {o.ncBalance > 0 ? (
                            <span className="text-amber-400">
                              {o.ncBalance.toLocaleString("id-ID")} NC
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-foreground">
                          {o.pointBalance > 0 ? (
                            <span className="text-red-400">{o.pointBalance} Poin</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteOrphanSingle(o.discordId, o.userName)}
                            disabled={executingId === `orphan-${o.discordId}`}
                            className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[11px] font-bold transition-all disabled:opacity-50"
                          >
                            {executingId === `orphan-${o.discordId}` ? "Menghapus..." : "Hapus Data"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: GUIDE & BEST PRACTICES */}
      {activeTab === "guide" && (
        <div className="p-6 rounded-3xl bg-card border border-border/70 space-y-6 shadow-sm animate-in fade-in duration-300">
          <div>
            <h2 className="text-lg font-black text-foreground flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Panduan Manajemen & Mekanisme Audit
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Standar operasional integritas data antara Discord, Trucky, dan Web Database Nismara Transport.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-5 rounded-2xl bg-background/50 border border-border/50 space-y-2">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Gauge className="w-4 h-4 text-rose-400" />
                Kebijakan Target Minimum 2.500 KM & Penalti (+5 PTS)
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Setiap driver resmi VTC Nismara Transport diwajibkan mencapai minimal 2.500 KM jarak tempuh setiap bulan kalender (terhitung dari tanggal 1 pukul 00:00:00 WIB hingga akhir bulan 23:59:59 WIB). Driver yang tidak memenuhi target akan dikenakan sanksi +5 Poin Penalti (PTS). Sistem dilengkapi kunci atomik (anti-race condition) untuk mencegah penalti ganda.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-background/50 border border-border/50 space-y-2">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Umbrella className="w-4 h-4 text-sky-400" />
                Pengecualian Izin Cuti Resmi (Bebas Penalti)
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Driver yang sedang dalam status cuti resmi atau memiliki permohonan cuti yang telah disetujui (`leavehistories`) dan jadwalnya bersinggungan dengan bulan audit secara otomatis <strong>DIBEBASKAN</strong> dari penalti minimum KM. Tombol penalti dinonaktifkan, aksi massal (batch) melewatinya secara otomatis, dan server action memvalidasi status cuti secara ketat.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-background/50 border border-border/50 space-y-2">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" />
                Mengapa Data Orphaned Bisa Muncul?
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Ketika seorang pengemudi resign atau dikeluarkan dari VTC, Manager menghapus data tautan di `driverlinks`. Namun, log transaksi masa lalu (`currencyhistories` & `pointhistories`) serta record saldo di `currencies` mungkin masih tertinggal jika tidak dibersihkan secara bersamaan. Halaman ini memudahkan pembersihan menyeluruh.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-background/50 border border-border/50 space-y-2">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                Sinkronisasi Role Discord Otomatis
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Bot Discord membaca role Driver dan Intern secara berkala. Jika ada member Discord yang memegang role tanpa record di `driverlinks`, Manager dapat langsung mencabut role tersebut via tombol *Cabut Role* tanpa harus membuka aplikasi Discord secara manual.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-background/50 border border-border/50 space-y-2">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                Perlindungan Keamanan Driver Aktif
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Setiap fungsi penghapusan data orphaned di server action memiliki guard otomatis yang memeriksa apakah `discordId` terdaftar di `driverlinks`. Data milik driver aktif yang sah tidak akan pernah bisa terhapus secara tidak sengaja.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-background/50 border border-border/50 space-y-2">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                Target Database Health Scan
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Setelah tombol *Bersihkan Semua Data Orphaned* dijalankan, jumlah record di `currencies` dan `points` akan bernilai sama persis dengan total `driverlinks` (100% Synchronized), sehingga status Health Scan di halaman utama Manager Hub akan berstatus hijau nominal.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
