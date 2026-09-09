"use client";

import React, { useState, useEffect } from "react";
import { X, Trophy, Calendar, Sparkles, Gift, DollarSign, Clock, Layers, Download, Package } from "lucide-react";
import { showAlert } from "@/lib/dialog";

interface SeasonFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: "CREATE" | "EDIT";
  initialData?: any;
  latestSeasonNumber?: number;
}

export default function SeasonFormModal({
  isOpen,
  onClose,
  onSuccess,
  mode,
  initialData,
  latestSeasonNumber = 1,
}: SeasonFormModalProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    seasonNumber: latestSeasonNumber + 1,
    title: `Season ${latestSeasonNumber + 1}: Road Conqueror`,
    subtitle: "Musim Baru Penakluk Jalanan",
    theme: "default",
    startAt: new Date().toISOString().split("T")[0],
    endAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    totalXp: 250000,
    weeklyCapXp: 20000,
    finalRushWeeks: 2,
    templateId: "",
    grandPrizeTitle: "Mod Livery Eksklusif / Merch Mug Season 2",
    grandPrizeDesc: "Hadiah puncak edisi terbatas resmi Nismara Transport",
    grandPrizeType: "MOD_LIVERY",
    grandPrizeUrl: "",
    grandPrizeImageUrl: "/images/season-pass/grandprize-mod-default.jpg",
    premiumPriceIdr: 35000,
    levelPriceIdr: 2000,
    status: "DRAFT",
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/manage/season-pass/templates")
        .then((res) => res.json())
        .then((data) => {
          if (data.templates) {
            setTemplates(data.templates);
            if (mode === "CREATE" && !formData.templateId) {
              const def = data.templates.find((t: any) => t.isDefault) || data.templates[0];
              if (def) setFormData((prev) => ({ ...prev, templateId: def._id }));
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (mode === "EDIT" && initialData) {
      const defaultImg =
        initialData.grandPrize?.type === "PHYSICAL_MERCH" || initialData.grandPrize?.type === "PHYSICAL"
          ? "/images/season-pass/grandprize-merch-default.jpg"
          : "/images/season-pass/grandprize-mod-default.jpg";

      setFormData({
        seasonNumber: initialData.seasonNumber,
        title: initialData.title || "",
        subtitle: initialData.subtitle || "",
        theme: initialData.theme || "default",
        startAt: initialData.startAt ? new Date(initialData.startAt).toISOString().split("T")[0] : "",
        endAt: initialData.endAt ? new Date(initialData.endAt).toISOString().split("T")[0] : "",
        totalXp: initialData.totalXp || 250000,
        weeklyCapXp: initialData.weeklyCapXp || 20000,
        finalRushWeeks: initialData.finalRushWeeks || 2,
        templateId: "",
        grandPrizeTitle: initialData.grandPrize?.title || "",
        grandPrizeDesc: initialData.grandPrize?.description || "",
        grandPrizeType: initialData.grandPrize?.type || "MOD_LIVERY",
        grandPrizeUrl: initialData.grandPrize?.downloadUrl || "",
        grandPrizeImageUrl: initialData.grandPrize?.imageUrl || defaultImg,
        premiumPriceIdr: initialData.premiumPriceIdr || 35000,
        levelPriceIdr: initialData.levelPriceIdr || 2000,
        status: initialData.status || "DRAFT",
      });
    } else if (mode === "CREATE") {
      setFormData((prev) => ({
        ...prev,
        seasonNumber: latestSeasonNumber + 1,
        title: `Season ${latestSeasonNumber + 1}: Road Conqueror`,
        grandPrizeImageUrl:
          prev.grandPrizeType === "PHYSICAL_MERCH" || prev.grandPrizeType === "PHYSICAL"
            ? "/images/season-pass/grandprize-merch-default.jpg"
            : "/images/season-pass/grandprize-mod-default.jpg",
      }));
    }
  }, [mode, initialData, latestSeasonNumber, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/manage/season-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode,
          ...formData,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memproses data Season");
      }

      await showAlert(data.message || "Berhasil!");
      onSuccess();
      onClose();
    } catch (err: any) {
      await showAlert(`Gagal: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-card border border-border/80 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-foreground">
                {mode === "CREATE" ? "Buat Musim Baru (New Season)" : `Edit Season ${formData.seasonNumber}`}
              </h3>
              <p className="text-xs text-muted-foreground">
                {mode === "CREATE"
                  ? "Inisialisasi musim baru dengan template 30 level, hadiah terstruktur, dan grand prize kustom."
                  : "Ubah metadata, jadwal, harga, dan informasi hadiah puncak musim."}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Season Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers size={13} /> Nomor Musim (Season #)
              </label>
              <input
                type="number"
                disabled={mode === "EDIT"}
                required
                value={formData.seasonNumber}
                onChange={(e) => setFormData({ ...formData, seasonNumber: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border focus:border-amber-500 focus:outline-none text-sm font-bold disabled:opacity-50"
              />
            </div>

            {/* Status (If Edit) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles size={13} /> Status Musim
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border focus:border-amber-500 focus:outline-none text-sm font-bold"
              >
                <option value="DRAFT">DRAFT (Persiapan / Belum Aktif)</option>
                <option value="ACTIVE">ACTIVE (Musim Utama Aktif)</option>
                <option value="COMPLETED">COMPLETED (Musim Selesai)</option>
              </select>
            </div>

            {/* Title */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Judul Musim (Title)
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Contoh: Season 2: Continental Journey"
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border focus:border-amber-500 focus:outline-none text-sm font-bold"
              />
            </div>

            {/* Subtitle */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Sub-judul / Tagline Musim
              </label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="Contoh: Taklukkan rute terjauh dan raih merchandise eksklusif"
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border focus:border-amber-500 focus:outline-none text-sm"
              />
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar size={13} /> Tanggal Mulai
              </label>
              <input
                type="date"
                required
                value={formData.startAt}
                onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border focus:border-amber-500 focus:outline-none text-sm font-medium"
              />
            </div>

            {/* End Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar size={13} /> Tanggal Berakhir (~90 Hari)
              </label>
              <input
                type="date"
                required
                value={formData.endAt}
                onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border focus:border-amber-500 focus:outline-none text-sm font-medium"
              />
            </div>

            {/* Total XP & Weekly Cap */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Target Total XP (Level 30)
              </label>
              <input
                type="number"
                required
                value={formData.totalXp}
                onChange={(e) => setFormData({ ...formData, totalXp: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border focus:border-amber-500 focus:outline-none text-sm font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock size={13} /> Limit Mingguan (Weekly Cap)
              </label>
              <input
                type="number"
                required
                value={formData.weeklyCapXp}
                onChange={(e) => setFormData({ ...formData, weeklyCapXp: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border focus:border-amber-500 focus:outline-none text-sm font-mono font-bold"
              />
            </div>

            {/* Template Selection for CREATE mode */}
            {mode === "CREATE" && (
              <div className="md:col-span-2 pt-2 border-t border-border/40 space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers size={14} /> Pilih Template Hadiah (Level 1–30)
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground lowercase">
                    {templates.length} template tersedia
                  </span>
                </label>
                <select
                  value={formData.templateId || ""}
                  onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border focus:border-amber-500 focus:outline-none text-xs font-bold text-foreground"
                >
                  {templates.map((tpl) => (
                    <option key={tpl._id} value={tpl._id}>
                      {tpl.isDefault ? "⭐ [DEFAULT] " : ""}{tpl.name} ({tpl.levels?.length || 30} Level • {tpl.totalXp?.toLocaleString("id-ID")} XP)
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">
                  Hadiah Free Track & Premium Track untuk level 1 s/d 30 akan otomatis diterapkan sesuai konfigurasi template yang Anda pilih.
                </p>
              </div>
            )}

            {/* Grand Prize Configuration */}
            <div className="md:col-span-2 pt-2 border-t border-border/40 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Gift size={14} /> Konfigurasi Hadiah Puncak Level 30 (Grand Prize)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Grand Prize Type */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                    <Sparkles size={13} /> Jenis Hadiah Puncak
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, grandPrizeType: "MOD_LIVERY" })}
                      className={`p-3 rounded-xl border flex items-center gap-3 text-left transition ${
                        formData.grandPrizeType === "MOD_LIVERY" || formData.grandPrizeType === "DOWNLOADABLE"
                          ? "bg-amber-500/10 border-amber-500 text-foreground ring-1 ring-amber-500"
                          : "bg-muted/30 border-border/60 text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          formData.grandPrizeType === "MOD_LIVERY" || formData.grandPrizeType === "DOWNLOADABLE"
                            ? "bg-amber-500 text-black shadow-sm"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Download size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">💾 Konten Digital / Mod</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Tombol unduhan file langsung (Download)</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, grandPrizeType: "PHYSICAL_MERCH" })}
                      className={`p-3 rounded-xl border flex items-center gap-3 text-left transition ${
                        formData.grandPrizeType === "PHYSICAL_MERCH" || formData.grandPrizeType === "PHYSICAL"
                          ? "bg-purple-500/15 border-purple-500 text-foreground ring-1 ring-purple-500"
                          : "bg-muted/30 border-border/60 text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          formData.grandPrizeType === "PHYSICAL_MERCH" || formData.grandPrizeType === "PHYSICAL"
                            ? "bg-purple-500 text-white shadow-sm"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Package size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">📦 Merchandise Fisik</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Tombol formulir konfirmasi alamat (Klaim Fisik)</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[11px] font-bold text-muted-foreground">Nama Hadiah Puncak</label>
                  <input
                    type="text"
                    required
                    value={formData.grandPrizeTitle}
                    onChange={(e) => setFormData({ ...formData, grandPrizeTitle: e.target.value })}
                    placeholder={
                      formData.grandPrizeType === "PHYSICAL_MERCH" || formData.grandPrizeType === "PHYSICAL"
                        ? "Contoh: Official T-Shirt & Exclusive Mug Season 2"
                        : "Contoh: Mod Livery Truk Eksklusif Season 2 (Scania & Volvo)"
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border focus:border-amber-500 focus:outline-none text-sm"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[11px] font-bold text-muted-foreground">Deskripsi Hadiah Puncak</label>
                  <input
                    type="text"
                    value={formData.grandPrizeDesc}
                    onChange={(e) => setFormData({ ...formData, grandPrizeDesc: e.target.value })}
                    placeholder={
                      formData.grandPrizeType === "PHYSICAL_MERCH" || formData.grandPrizeType === "PHYSICAL"
                        ? "Contoh: Merchandise fisik resmi dikirim langsung ke alamat rumah driver via ekspedisi"
                        : "Contoh: Livery resmi edisi terbatas Season 2 untuk truk Scania & Volvo"
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border focus:border-amber-500 focus:outline-none text-sm"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[11px] font-bold text-muted-foreground flex items-center justify-between">
                    <span>
                      {formData.grandPrizeType === "PHYSICAL_MERCH" || formData.grandPrizeType === "PHYSICAL"
                        ? "URL Link Formulir Klaim Pengiriman Alamat (Google Forms / Link Klaim)"
                        : "URL Link Unduh File Mod (Direct Download / GDrive / Mediafire)"}
                    </span>
                    <span className="text-[10px] text-amber-400 font-semibold">
                      {formData.grandPrizeType === "PHYSICAL_MERCH" || formData.grandPrizeType === "PHYSICAL"
                        ? "Formulir Alamat"
                        : "File Mod"}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formData.grandPrizeUrl}
                    onChange={(e) => setFormData({ ...formData, grandPrizeUrl: e.target.value })}
                    placeholder={
                      formData.grandPrizeType === "PHYSICAL_MERCH" || formData.grandPrizeType === "PHYSICAL"
                        ? "https://forms.gle/contoh-form-alamat atau link channel tiket..."
                        : "https://transport.nismara.web.id/mods/season2-livery.zip..."
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border focus:border-amber-500 focus:outline-none text-sm font-mono text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                    {formData.grandPrizeType === "PHYSICAL_MERCH" || formData.grandPrizeType === "PHYSICAL"
                      ? "💡 Driver yang menamatkan Level 30 akan melihat tombol 'Klaim Merchandise & Kirim Alamat' yang langsung membuka formulir pengiriman ini."
                      : "💡 Driver yang menamatkan Level 30 akan melihat tombol 'Unduh Mod / Konten' untuk mendownload file mod secara langsung."}
                  </p>
                </div>

                {/* Grand Prize Preview Image URL */}
                <div className="space-y-2 md:col-span-2 pt-1 border-t border-border/30">
                  <label className="text-[11px] font-bold text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={13} className="text-amber-400" /> URL Gambar Pratinjau Hadiah Puncak (Showcase Image)
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono">Format WebP / JPG / PNG</span>
                  </label>
                  <input
                    type="text"
                    value={formData.grandPrizeImageUrl}
                    onChange={(e) => setFormData({ ...formData, grandPrizeImageUrl: e.target.value })}
                    placeholder="https://images.nismara.my.id/... atau /images/season-pass/..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border focus:border-amber-500 focus:outline-none text-sm font-mono text-xs"
                  />

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[10px] font-bold text-muted-foreground">Pilihan Preset Cepat:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          grandPrizeImageUrl: "/images/season-pass/grandprize-mod-default.jpg",
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-muted/50 hover:bg-muted border border-border text-[10px] font-semibold text-foreground transition flex items-center gap-1"
                    >
                      💾 Preset Showcase Mod Livery
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          grandPrizeImageUrl: "/images/season-pass/grandprize-merch-default.jpg",
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-muted/50 hover:bg-muted border border-border text-[10px] font-semibold text-foreground transition flex items-center gap-1"
                    >
                      📦 Preset Showcase Merchandise
                    </button>
                  </div>

                  {/* Live Image Thumbnail Preview */}
                  {formData.grandPrizeImageUrl && (
                    <div className="mt-2 relative rounded-2xl overflow-hidden border border-border/80 bg-black/40 p-2 flex items-center gap-3">
                      <div className="w-24 h-16 rounded-xl overflow-hidden bg-black/60 shrink-0 border border-border/50 relative">
                        <img
                          src={formData.grandPrizeImageUrl}
                          alt="Preview Hadiah Puncak"
                          className="w-full h-full object-cover"
                          onError={(e: any) => {
                            e.target.style.display = "none";
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1 text-xs">
                        <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">
                          Pratinjau Gambar Aktif
                        </span>
                        <p className="font-bold text-foreground truncate mt-0.5">
                          {formData.grandPrizeTitle || "Hadiah Puncak Level 30"}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate font-mono mt-0.5">
                          {formData.grandPrizeImageUrl}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pricing Config */}
            <div className="md:col-span-2 pt-2 border-t border-border/40 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <DollarSign size={14} /> Pengaturan Biaya Pembelian (IDR)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground flex items-center justify-between">
                    <span>Harga Pass Premium (Rupiah)</span>
                    <span className="text-[10px] text-amber-400 font-mono">Akses 30 Level</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.premiumPriceIdr}
                    onChange={(e) => setFormData({ ...formData, premiumPriceIdr: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border focus:border-amber-500 focus:outline-none text-sm font-bold"
                  />
                  <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                    💡 Biaya pembelian Nismara Pass Premium (akses seluruh 30 level reward premium).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground flex items-center justify-between">
                    <span>Harga Beli per 1 Level Skip (Rupiah)</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Dinamis Per Musim</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.levelPriceIdr}
                    onChange={(e) => setFormData({ ...formData, levelPriceIdr: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border focus:border-amber-500 focus:outline-none text-sm font-bold"
                  />
                  <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                    💡 Biaya per 1 level jika driver ingin membeli level secara instan (misal: Rp 2.000 atau Rp 3.000).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-bold uppercase tracking-wider transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-black text-xs uppercase tracking-wider transition shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              <Trophy size={14} className="fill-black" />
              <span>{isLoading ? "Menyimpan..." : mode === "CREATE" ? "Buat Musim Baru" : "Simpan Perubahan"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
