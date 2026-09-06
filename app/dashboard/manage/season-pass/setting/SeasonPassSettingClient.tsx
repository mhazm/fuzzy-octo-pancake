"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Power,
  Eye,
  EyeOff,
  Save,
  ArrowLeft,
  Settings,
  ShieldAlert,
  CheckCircle2,
  Lock,
  ExternalLink,
  Info,
  Sparkles,
  Trophy,
} from "lucide-react";
import { showAlert, showConfirm } from "@/lib/dialog";

interface FeatureStatus {
  isEnabled: boolean;
  disabledReason: string;
  updatedAt?: string;
  updatedBy?: string;
}

export default function SeasonPassSettingClient({
  initialFeatureStatus,
}: {
  initialFeatureStatus: FeatureStatus;
}) {
  const router = useRouter();
  const [featureStatus, setFeatureStatus] = useState<FeatureStatus>(
    initialFeatureStatus || {
      isEnabled: true,
      disabledReason: "",
    }
  );
  const [isToggling, setIsToggling] = useState(false);
  const [editingReason, setEditingReason] = useState(
    initialFeatureStatus?.disabledReason || ""
  );
  const [isReasonModified, setIsReasonModified] = useState(false);

  const handleToggle = async (targetEnabled: boolean) => {
    const actionText = targetEnabled ? "MENGAKTIFKAN" : "MENONAKTIFKAN";
    const detailText = targetEnabled
      ? "Fitur Season Pass akan dibuka untuk seluruh driver. Menu akan tampil di Sidebar & Navbar publik, dan driver dapat mengakses halaman serta memesan/mengklaim hadiah."
      : "Fitur Season Pass akan DISEMBUNYIKAN dari publik. Menu di Sidebar & Navbar driver akan hilang, dan driver yang membuka link manual akan otomatis dialihkan ke Dashboard. Manajer tetap dapat membuka pratinjau.";

    const confirmed = await showConfirm(
      `Apakah Anda yakin ingin ${actionText} fitur Season Pass?\n\n${detailText}`
    );
    if (!confirmed) return;

    setIsToggling(true);
    try {
      const res = await fetch("/api/manage/season-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_FEATURE",
          enabled: targetEnabled,
          disabledReason: editingReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah status fitur");

      setFeatureStatus(data.featureStatus);
      setIsReasonModified(false);
      await showAlert(data.message || "Status fitur berhasil diperbarui!");
      router.refresh();
    } catch (err: any) {
      await showAlert(`Gagal: ${err.message}`);
    } finally {
      setIsToggling(false);
    }
  };

  const handleSaveReason = async () => {
    setIsToggling(true);
    try {
      const res = await fetch("/api/manage/season-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_FEATURE",
          enabled: featureStatus.isEnabled,
          disabledReason: editingReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan catatan");

      setFeatureStatus(data.featureStatus);
      setIsReasonModified(false);
      await showAlert("Catatan pengumuman berhasil disimpan!");
      router.refresh();
    } catch (err: any) {
      await showAlert(`Gagal: ${err.message}`);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* 1. Header & Navigation */}
      <div className="space-y-4">
        <Link
          href="/dashboard/manage/season-pass"
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-xl hover:bg-card border border-transparent hover:border-border w-fit"
        >
          <ArrowLeft size={14} />
          <span>Kembali ke Kelola Season Pass</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Settings size={14} /> Pengaturan Sistem
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border ${
                  featureStatus.isEnabled
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                    : "bg-rose-500/15 border-rose-500/30 text-rose-400"
                }`}
              >
                ● {featureStatus.isEnabled ? "Fitur Aktif" : "Fitur Nonaktif"}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
              Pengaturan Ketersediaan Fitur Season Pass
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Kontrol apakah fitur Season Pass terbuka untuk publik atau disembunyikan sementara selama masa persiapan hadiah musim baru.
            </p>
          </div>

          <Link
            href="/dashboard/season-pass"
            target="_blank"
            className="px-4 py-2.5 rounded-2xl bg-card border border-border hover:border-amber-500/40 text-foreground text-xs font-bold transition-all flex items-center gap-2 w-fit shadow-xs"
          >
            <ExternalLink size={14} className="text-amber-400" />
            <span>Buka Halaman Musim (Pratinjau)</span>
          </Link>
        </div>
      </div>

      {/* 2. Main Setting Toggle Card */}
      <div
        className={`relative overflow-hidden rounded-3xl border p-6 md:p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
          featureStatus.isEnabled
            ? "border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-card/95 to-card"
            : "border-rose-500/40 bg-gradient-to-br from-rose-950/30 via-card/95 to-amber-950/20"
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border shadow-xs ${
                  featureStatus.isEnabled
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                    : "bg-rose-500/15 border-rose-500/40 text-rose-400 animate-pulse"
                }`}
              >
                <Power size={13} />
                {featureStatus.isEnabled
                  ? "STATUS: AKTIF & TERBUKA UNTUK DRIVER"
                  : "STATUS: NONAKTIF (DISEMBUNYIKAN DARI PUBLIK)"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-card border border-border text-[11px] text-muted-foreground">
                {featureStatus.isEnabled ? "Menu Driver Ditampilkan" : "Akses Driver Dialihkan"}
              </span>
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
                {featureStatus.isEnabled
                  ? "Season Pass Sedang Berjalan Normal"
                  : "Season Pass Sedang Dinonaktifkan Sementara"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {featureStatus.isEnabled
                  ? "Menu 'Nismara Pass' muncul di Sidebar & Navbar publik. Seluruh driver dapat mengakses halaman musim, melihat progresi XP, serta memesan atau mengklaim reward."
                  : "Menu 'Nismara Pass' otomatis DISEMBUNYIKAN dari seluruh driver (Sidebar & Navbar). Driver yang mencoba mengetik manual URL /dashboard/season-pass akan langsung dialihkan kembali ke Dashboard. Transaksi dan klaim API juga dikunci."}
              </p>
            </div>

            {/* Input Pesan Alasan / Status */}
            <div className="pt-2 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Catatan / Alasan Penonaktifan (Untuk Catatan Manajemen & Banner Pratinjau):
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <input
                  type="text"
                  value={editingReason}
                  placeholder="Contoh: Tim Manajemen Nismara sedang menyiapkan hadiah..."
                  onChange={(e) => {
                    setEditingReason(e.target.value);
                    setIsReasonModified(true);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-amber-500/60 transition-all shadow-inner"
                />
                {isReasonModified && (
                  <button
                    onClick={handleSaveReason}
                    disabled={isToggling}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 shadow-md shadow-amber-500/20 cursor-pointer"
                  >
                    <Save size={14} />
                    <span>Simpan Catatan</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end gap-3 shrink-0">
            {featureStatus.isEnabled ? (
              <button
                onClick={() => handleToggle(false)}
                disabled={isToggling}
                className="px-6 py-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:text-rose-200 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center justify-center gap-2.5 group cursor-pointer"
              >
                <EyeOff size={16} className="text-rose-400 group-hover:scale-110 transition-transform" />
                <span>Nonaktifkan Season Pass</span>
              </button>
            ) : (
              <button
                onClick={() => handleToggle(true)}
                disabled={isToggling}
                className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-black font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2.5 group cursor-pointer"
              >
                <Eye size={16} className="text-black group-hover:scale-110 transition-transform" />
                <span>Buka / Aktifkan Season Pass</span>
              </button>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center lg:justify-end">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
              <span>
                {featureStatus.updatedAt
                  ? `Diperbarui: ${new Date(featureStatus.updatedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`
                  : "Status default"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Detailed Technical Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Nonaktif */}
        <div className="p-6 rounded-2xl bg-card border border-border/80 space-y-3">
          <div className="flex items-center gap-2.5 text-rose-400 font-bold text-sm">
            <Lock size={16} />
            <span>Mekanisme Saat Fitur Dinonaktifkan:</span>
          </div>
          <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-rose-400 font-bold">•</span>
              <span><strong>Sidebar Driver:</strong> Menu "Nismara Pass" disaring dan tidak muncul baik di sidebar desktop maupun bottom bar mobile.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-400 font-bold">•</span>
              <span><strong>Navbar Publik:</strong> Link "Season Pass" di mobile drawer dan widget kartu Season Pass di Profile Dropdown otomatis disembunyikan.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-400 font-bold">•</span>
              <span><strong>Pengalihan URL Langsung:</strong> Jika driver mengetik manual <code className="text-amber-400">/dashboard/season-pass</code>, mereka otomatis dialihkan (redirect) ke <code className="text-amber-400">/dashboard</code>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-400 font-bold">•</span>
              <span><strong>Proteksi API:</strong> Endpoint order pass, skip level, dan klaim reward terkunci dengan kode respon <code className="text-rose-400">403 Forbidden</code>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">•</span>
              <span><strong>Mode Pratinjau Manajer:</strong> Akun Manajer & Admin tetap dapat membuka <code className="text-amber-400">/dashboard/season-pass</code> disertai banner peringatan pratinjau.</span>
            </li>
          </ul>
        </div>

        {/* Card Aktif */}
        <div className="p-6 rounded-2xl bg-card border border-border/80 space-y-3">
          <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
            <CheckCircle2 size={16} />
            <span>Mekanisme Saat Fitur Diaktifkan:</span>
          </div>
          <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong>Ketersediaan Penuh:</strong> Seluruh menu navigasi di Sidebar dan Navbar kembali aktif dan dapat diakses semua anggota.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong>Progresi & XP:</strong> Seluruh driver dapat melihat progresi level 1–30 dan mengklaim hadiah Free maupun Premium.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong>Pemesanan & Skip Level:</strong> Driver dapat mengajukan pesanan pembelian Nismara Pass Premium dan Skip Level secara normal.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong>Integrasi Job XP:</strong> XP pekerjaan Truk ETS2/ATS otomatis terakumulasi ke dalam musim yang sedang aktif.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
