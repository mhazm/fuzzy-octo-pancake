"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Truck,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
  Trash2,
  Search,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Check,
  X,
  FileText,
  MessageSquare,
} from "lucide-react";
import { showAlert, showConfirm } from "@/lib/dialog";
import { NO_CACHE_FETCH_OPTIONS } from "@/lib/antiCache";

interface HaulMPManageClientProps {
  initialActiveDrivers: any[];
  initialApplications: any[];
  allVerifiedDrivers: any[];
}

export default function HaulMPManageClient({
  initialActiveDrivers,
  initialApplications,
  allVerifiedDrivers,
}: HaulMPManageClientProps) {
  const [activeTab, setActiveTab] = useState<"active" | "pending" | "history">("active");
  const [activeDrivers, setActiveDrivers] = useState<any[]>(initialActiveDrivers);
  const [applications, setApplications] = useState<any[]>(initialApplications);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Modal Tambah Driver Manual
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDriverDiscordId, setSelectedDriverDiscordId] = useState("");
  const [addSearchQuery, setAddSearchQuery] = useState("");

  const pendingApps = applications.filter((app) => app.status === "pending");
  const historyApps = applications.filter((app) => app.status !== "pending");

  // Filter Driver Aktif
  const filteredActiveDrivers = activeDrivers.filter((driver) => {
    const q = searchQuery.toLowerCase();
    return (
      driver.name?.toLowerCase().includes(q) ||
      String(driver.truckyId || "").includes(q) ||
      String(driver.discordId || "").includes(q)
    );
  });

  // Filter Driver Verified untuk Modal Tambah Manual (Deduplikasi & belum jadi HaulMP Driver)
  const candidateDrivers = useMemo(() => {
    const seenDiscordIds = new Set<string>();
    return allVerifiedDrivers.filter((driver) => {
      const dId = String(driver.discordId || "");
      if (!dId || seenDiscordIds.has(dId)) return false;
      seenDiscordIds.add(dId);

      const isAlreadyHaulmp = activeDrivers.some(
        (ad) => String(ad.discordId) === dId
      );
      if (isAlreadyHaulmp) return false;

      const q = addSearchQuery.toLowerCase();
      return (
        driver.name?.toLowerCase().includes(q) ||
        String(driver.truckyId || "").includes(q) ||
        dId.includes(q)
      );
    });
  }, [allVerifiedDrivers, activeDrivers, addSearchQuery]);

  // Action: Setujui Pengajuan
  const handleApprove = async (appId: string, discordId: string, name: string) => {
    if (await showConfirm(`Setujui pengajuan driver HaulMP untuk "${name}"?`)) {
      setLoadingAction(appId);
      try {
        const res = await fetch("/api/manage/haulmp", {
          ...NO_CACHE_FETCH_OPTIONS,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "approve",
            applicationId: appId,
            discordId,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showAlert(data.message);
          // Update status lokal
          setApplications((prev) =>
            prev.map((item) =>
              item._id === appId
                ? { ...item, status: "approved", reviewedAt: new Date() }
                : item
            )
          );
          // Tambahkan ke active drivers jika belum ada
          const approvedUser = allVerifiedDrivers.find(
            (u) => String(u.discordId) === String(discordId)
          );
          if (approvedUser && !activeDrivers.some((d) => String(d.discordId) === String(discordId))) {
            setActiveDrivers((prev) => [
              ...prev,
              { ...approvedUser, isHaulmpDriver: true, updatedAt: new Date() },
            ]);
          }
        } else {
          showAlert(data.error || "Gagal menyetujui pengajuan.", "error");
        }
      } catch (err) {
        console.error(err);
        showAlert("Terjadi kesalahan jaringan.", "error");
      } finally {
        setLoadingAction(null);
      }
    }
  };

  // Action: Tolak Pengajuan
  const handleReject = async (appId: string, name: string) => {
    if (await showConfirm(`Yakin ingin menolak pengajuan dari "${name}"?`)) {
      setLoadingAction(appId);
      try {
        const res = await fetch("/api/manage/haulmp", {
          ...NO_CACHE_FETCH_OPTIONS,
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationId: appId,
            reviewReason: "Tidak memenuhi syarat keanggotaan VTC HaulMP.",
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showAlert(data.message);
          setApplications((prev) =>
            prev.map((item) =>
              item._id === appId
                ? { ...item, status: "rejected", reviewedAt: new Date() }
                : item
            )
          );
        } else {
          showAlert(data.error || "Gagal menolak pengajuan.", "error");
        }
      } catch (err) {
        console.error(err);
        showAlert("Terjadi kesalahan jaringan.", "error");
      } finally {
        setLoadingAction(null);
      }
    }
  };

  // Action: Hapus Driver dari HaulMP
  const handleRemoveDriver = async (discordId: string, name: string) => {
    if (
      await showConfirm(
        `Yakin ingin menghapus "${name}" dari daftar Driver HaulMP? Driver tidak akan lagi menerima bonus multiplier HaulMP.`
      )
    ) {
      setLoadingAction(discordId);
      try {
        const res = await fetch(`/api/manage/haulmp?discordId=${discordId}`, {
          ...NO_CACHE_FETCH_OPTIONS,
          method: "DELETE",
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showAlert(data.message);
          setActiveDrivers((prev) =>
            prev.filter((d) => String(d.discordId) !== String(discordId))
          );
        } else {
          showAlert(data.error || "Gagal menghapus driver.", "error");
        }
      } catch (err) {
        console.error(err);
        showAlert("Terjadi kesalahan jaringan.", "error");
      } finally {
        setLoadingAction(null);
      }
    }
  };

  // Action: Tambah Driver Manual
  const handleAddManual = async () => {
    if (!selectedDriverDiscordId) {
      showAlert("Pilih pengemudi yang ingin ditambahkan.", "error");
      return;
    }

    setLoadingAction("add_manual");
    try {
      const res = await fetch("/api/manage/haulmp", {
        ...NO_CACHE_FETCH_OPTIONS,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_manual",
          discordId: selectedDriverDiscordId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showAlert(data.message);
        const addedUser = allVerifiedDrivers.find(
          (u) => String(u.discordId) === String(selectedDriverDiscordId)
        );
        if (addedUser) {
          setActiveDrivers((prev) => [
            ...prev,
            { ...addedUser, isHaulmpDriver: true, updatedAt: new Date() },
          ]);
        }
        if (data.historyRecord) {
          setApplications((prev) => [data.historyRecord, ...prev]);
        }
        setShowAddModal(false);
        setSelectedDriverDiscordId("");
        setAddSearchQuery("");
      } else {
        showAlert(data.error || "Gagal menambahkan driver.", "error");
      }
    } catch (err) {
      console.error(err);
      showAlert("Terjadi kesalahan jaringan.", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard/manage/data"
            className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-primary transition-colors font-bold mb-2 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Kembali ke Manage Data
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl shadow-inner">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-foreground tracking-tight">
                Manage Driver <span className="text-emerald-400">HaulMP</span>
              </h1>
              <p className="text-sm text-foreground/60">
                Pusat verifikasi dan kelola keanggotaan driver VTC Nismara Transport di platform HaulMP.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-sm transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98]"
        >
          <UserPlus className="w-4 h-4" />
          Tambah Driver Manual
        </button>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl border-border/50 bg-card/40 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-foreground/50">Driver HaulMP Aktif</p>
            <p className="text-3xl font-black text-emerald-400 mt-1">{activeDrivers.length}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-border/50 bg-card/40 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-foreground/50">Pengajuan Pending</p>
            <p className="text-3xl font-black text-amber-400 mt-1">{pendingApps.length}</p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-border/50 bg-card/40 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-foreground/50">Total Riwayat Aplikasi</p>
            <p className="text-3xl font-black text-foreground mt-1">{applications.length}</p>
          </div>
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border/50 gap-2">
        <button
          onClick={() => setActiveTab("active")}
          className={`pb-3 px-4 font-bold text-sm transition-all relative flex items-center gap-2 ${
            activeTab === "active"
              ? "text-emerald-400"
              : "text-foreground/50 hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4" />
          Driver Aktif ({activeDrivers.length})
          {activeTab === "active" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("pending")}
          className={`pb-3 px-4 font-bold text-sm transition-all relative flex items-center gap-2 ${
            activeTab === "pending"
              ? "text-amber-400"
              : "text-foreground/50 hover:text-foreground"
          }`}
        >
          <Clock className="w-4 h-4" />
          Pengajuan Masuk ({pendingApps.length})
          {pendingApps.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
          {activeTab === "pending" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`pb-3 px-4 font-bold text-sm transition-all relative flex items-center gap-2 ${
            activeTab === "history"
              ? "text-primary"
              : "text-foreground/50 hover:text-foreground"
          }`}
        >
          <FileText className="w-4 h-4" />
          Riwayat ({historyApps.length})
          {activeTab === "history" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>
      </div>

      {/* TAB 1: DRIVER HAULMP AKTIF */}
      {activeTab === "active" && (
        <div className="space-y-6">
          {/* Search Box */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <input
              type="text"
              placeholder="Cari driver berdasarkan nama, Discord ID, atau Trucky ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card/60 border border-border/50 text-foreground placeholder:text-foreground/30 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          {filteredActiveDrivers.length === 0 ? (
            <div className="glass-panel p-16 text-center rounded-3xl border border-dashed border-border/50">
              <Truck className="w-12 h-12 text-foreground/20 mx-auto mb-3" />
              <p className="font-bold text-foreground/50">
                {searchQuery ? "Tidak ditemukan driver yang sesuai pencarian." : "Belum ada driver HaulMP aktif."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredActiveDrivers.map((driver, idx) => (
                <div
                  key={`${driver.discordId}-${driver._id || idx}`}
                  className="glass-panel p-5 rounded-2xl border border-border/50 bg-card/40 hover:border-emerald-500/30 transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden relative shrink-0 border border-border/50">
                      <img
                        src={driver.image || "/placeholder-avatar.png"}
                        alt={driver.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-foreground text-base truncate">
                          {driver.name}
                        </h3>
                        <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      </div>
                      <p className="text-xs text-foreground/50 font-mono mt-0.5 truncate">
                        ID: {driver.truckyId ? `@${driver.truckyId}` : driver.discordId}
                      </p>
                      {driver.haulmpId && (
                        <p className="text-[11px] text-emerald-400/80 mt-1">
                          HaulMP: <span className="font-semibold">{driver.haulmpId}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/30 flex items-center justify-between text-xs text-foreground/40">
                    <span>
                      Diperbarui:{" "}
                      {driver.updatedAt
                        ? new Date(driver.updatedAt).toLocaleDateString("id-ID", {
                            timeZone: "Asia/Jakarta",
                          })
                        : "-"}
                    </span>
                    <button
                      onClick={() => handleRemoveDriver(driver.discordId, driver.name)}
                      disabled={loadingAction === driver.discordId}
                      className="px-3 py-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 font-bold transition-all flex items-center gap-1.5"
                    >
                      {loadingAction === driver.discordId ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PENGAJUAN PENDING */}
      {activeTab === "pending" && (
        <div className="space-y-4">
          {pendingApps.length === 0 ? (
            <div className="glass-panel p-16 text-center rounded-3xl border border-dashed border-border/50">
              <CheckCircle className="w-12 h-12 text-emerald-400/40 mx-auto mb-3" />
              <p className="font-bold text-foreground/50">
                Semua permohonan telah diproses. Tidak ada pengajuan yang tertunda.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingApps.map((app) => (
                <div
                  key={app._id}
                  className="glass-panel p-6 rounded-2xl border border-amber-500/20 bg-card/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-amber-500/40 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl shrink-0 border border-amber-500/20">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-foreground text-lg">{app.name}</h3>
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          Menunggu Review
                        </span>
                      </div>
                      <p className="text-xs text-foreground/50 font-mono mt-1">
                        Discord ID: {app.discordId} {app.truckyId ? `• Trucky: @${app.truckyId}` : ""}
                      </p>
                      {app.notes && (
                        <p className="text-xs text-foreground/80 mt-2 p-2.5 rounded-lg bg-black/20 border border-white/5 font-sans">
                          Catatan: &ldquo;{app.notes}&rdquo;
                        </p>
                      )}
                      <p className="text-[11px] text-foreground/40 mt-2">
                        Diajukan:{" "}
                        {new Date(app.submittedAt).toLocaleString("id-ID", {
                          timeZone: "Asia/Jakarta",
                        })}{" "}
                        WIB
                      </p>
                      {app.channelId && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#9aa4fc] bg-[#5865F2]/10 px-2.5 py-1 rounded-lg border border-[#5865F2]/20">
                            <MessageSquare className="w-3 h-3" /> Tiket Channel: #{app.channelId}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto shrink-0 flex-wrap">
                    {app.channelId && (
                      <a
                        href={`https://discord.com/channels/863959415702028318/${app.channelId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 md:flex-none px-4 py-2.5 rounded-xl border border-[#5865F2]/40 bg-[#5865F2]/10 text-[#9aa4fc] hover:bg-[#5865F2]/20 font-bold text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Kunjungi Channel
                      </a>
                    )}

                    <button
                      onClick={() => handleReject(app._id, app.name)}
                      disabled={loadingAction === app._id}
                      className="flex-1 md:flex-none px-4 py-2.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 font-bold text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      {loadingAction === app._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      Tolak
                    </button>

                    <button
                      onClick={() => handleApprove(app._id, app.discordId, app.name)}
                      disabled={loadingAction === app._id}
                      className="flex-1 md:flex-none px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      {loadingAction === app._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Setujui
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RIWAYAT PENGAJUAN */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {historyApps.length === 0 ? (
            <div className="glass-panel p-16 text-center rounded-3xl border border-dashed border-border/50">
              <FileText className="w-12 h-12 text-foreground/20 mx-auto mb-3" />
              <p className="font-bold text-foreground/50">Belum ada riwayat pengajuan.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30 glass-panel rounded-2xl border border-border/50 overflow-hidden bg-card/40">
              {historyApps.map((app) => (
                <div key={app._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{app.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          app.status === "approved"
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/50 font-mono mt-0.5">
                      Discord ID: {app.discordId} {app.truckyId ? `• Trucky: @${app.truckyId}` : ""}
                    </p>
                    {app.reviewReason && (
                      <p className="text-xs text-foreground/60 italic mt-1">
                        Alasan: {app.reviewReason}
                      </p>
                    )}
                  </div>

                  <div className="text-right text-xs text-foreground/40 shrink-0 space-y-0.5">
                    <p>
                      Direview:{" "}
                      {app.reviewedAt
                        ? new Date(app.reviewedAt).toLocaleDateString("id-ID", {
                            timeZone: "Asia/Jakarta",
                          })
                        : "-"}
                    </p>
                    {(app.reviewerName || app.reviewedBy) && (
                      <p className="text-xs text-foreground/60">
                        Reviewer:{" "}
                        <span className="font-bold text-foreground">
                          {app.reviewerName || "Manager"}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: TAMBAH DRIVER MANUAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-border/50 bg-background max-w-lg w-full space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg">Tambah Driver HaulMP</h3>
                  <p className="text-xs text-foreground/50">Pilih driver resmi untuk langsung diaktifkan status HaulMP-nya.</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-card text-foreground/50 hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Search */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/60 uppercase tracking-wider">Cari Driver</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                <input
                  type="text"
                  placeholder="Ketik nama atau Trucky ID..."
                  value={addSearchQuery}
                  onChange={(e) => setAddSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border/50 text-foreground text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Candidate List Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/60 uppercase tracking-wider">Pilih Driver ({candidateDrivers.length} tersedia)</label>
              <div className="max-h-56 overflow-y-auto space-y-1.5 p-1 rounded-xl border border-border/30 bg-card/30">
                {candidateDrivers.length === 0 ? (
                  <p className="text-center text-xs text-foreground/40 py-8">
                    Tidak ada driver yang cocok atau semua driver sudah terdaftar.
                  </p>
                ) : (
                  candidateDrivers.map((driver, idx) => {
                    const isSelected = selectedDriverDiscordId === driver.discordId;
                    return (
                      <button
                        key={`${driver.discordId}-${driver._id || idx}`}
                        type="button"
                        onClick={() => setSelectedDriverDiscordId(driver.discordId)}
                        className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-emerald-500/20 border border-emerald-500/40 text-foreground font-bold"
                            : "hover:bg-card/80 text-foreground/80 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-muted overflow-hidden relative shrink-0">
                            <img
                              src={driver.image || "/placeholder-avatar.png"}
                              alt={driver.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="truncate">
                            <p className="text-sm truncate">{driver.name}</p>
                            <p className="text-[11px] text-foreground/40 font-mono">
                              {driver.truckyId ? `@${driver.truckyId}` : driver.discordId}
                            </p>
                          </div>
                        </div>

                        {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2.5 rounded-xl border border-border/50 text-foreground/70 hover:bg-card font-bold text-sm transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAddManual}
                disabled={!selectedDriverDiscordId || loadingAction === "add_manual"}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-black text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                {loadingAction === "add_manual" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Jadikan Driver HaulMP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
