"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { compressImageToWebP } from "@/lib/imageUtils";
import {
  Gift,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Calendar,
  Ticket,
  Coins,
  Fuel,
  Shield,
  Tag,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  UploadCloud,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { showAlert } from "@/lib/dialog";

interface GiveawayFormClientProps {
  initialData?: any;
  isEdit?: boolean;
}

// Helper konversi tanggal ISO/Date ke format input HTML5 datetime-local ("YYYY-MM-DDTHH:mm") dalam WIB (Asia/Jakarta, GMT+7)
function toWIBDateTimeLocal(dateInput?: string | Date | null): string {
  if (!dateInput) return "";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "";

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  let hour = parts.find((p) => p.type === "hour")?.value || "00";
  if (hour === "24") hour = "00";
  const minute = parts.find((p) => p.type === "minute")?.value || "00";

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

// Helper konversi nilai input datetime-local ke ISO UTC dengan offset eksplisit WIB (+07:00)
function parseWIBToISO(dateTimeLocalStr?: string): string {
  if (!dateTimeLocalStr) return "";
  if (dateTimeLocalStr.includes("+") || dateTimeLocalStr.endsWith("Z")) {
    return new Date(dateTimeLocalStr).toISOString();
  }
  const withOffset = dateTimeLocalStr.length === 16 ? `${dateTimeLocalStr}:00+07:00` : `${dateTimeLocalStr}+07:00`;
  return new Date(withOffset).toISOString();
}

export default function GiveawayFormClient({ initialData, isEdit }: GiveawayFormClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Form State
  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [bannerUrl, setBannerUrl] = useState(initialData?.bannerUrl || "");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(initialData?.bannerUrl || "");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [status, setStatus] = useState(initialData?.status || "scheduled");
  const [startDate, setStartDate] = useState(
    initialData?.startDate
      ? toWIBDateTimeLocal(initialData.startDate)
      : toWIBDateTimeLocal(new Date())
  );

  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showAlert("Format tidak didukung! Harap unggah file gambar (PNG, JPG, WEBP, atau GIF).");
      return;
    }

    const isNismaraPlus = (session?.user as any)?.nismaraplus?.status === true;
    if (!isNismaraPlus && file.type === "image/gif") {
      showAlert("Format GIF hanya dapat diunggah oleh pengemudi dengan keanggotaan Nismara+.");
      return;
    }

    const maxSizeMB = isNismaraPlus ? 5 : 3;
    if (file.size > maxSizeMB * 1024 * 1024) {
      showAlert(`Ukuran gambar melebihi batas maksimal (${maxSizeMB}MB).`);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setBannerFile(file);
  };

  const handleRemoveBanner = () => {
    setBannerFile(null);
    setPreviewUrl("");
    setBannerUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  const [endDate, setEndDate] = useState(
    initialData?.endDate
      ? toWIBDateTimeLocal(initialData.endDate)
      : toWIBDateTimeLocal(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
  );
  const [drawDate, setDrawDate] = useState(
    initialData?.drawDate ? toWIBDateTimeLocal(initialData.drawDate) : ""
  );

  // Aturan & Toggle
  const [allowMultipleWins, setAllowMultipleWins] = useState(initialData?.allowMultipleWins || false);
  const [enableQuests, setEnableQuests] = useState(initialData?.enableQuests ?? true);
  const [enableNcPurchase, setEnableNcPurchase] = useState(initialData?.enableNcPurchase ?? true);
  const [ticketPriceNC, setTicketPriceNC] = useState(initialData?.ticketPriceNC || 1000);
  const [maxPurchasableTickets, setMaxPurchasableTickets] = useState(initialData?.maxPurchasableTickets ?? 5);

  // Daftar Quest Game
  const [quests, setQuests] = useState<any[]>(
    initialData?.quests && initialData.quests.length > 0
      ? initialData.quests
      : [
          {
            questId: "quest_jobs_3",
            title: "Pengemudi Rajin",
            description: "Selesaikan 3 pekerjaan kargo apa saja di ETS2 atau ATS.",
            type: "TOTAL_JOBS",
            target: 3,
            rewardTickets: 1,
          },
          {
            questId: "quest_long_haul",
            title: "Pengelana Jalur Jauh",
            description: "Selesaikan 1 pengiriman kargo dengan jarak minimal 2.500 KM.",
            type: "LONG_HAUL",
            target: 1,
            minDistanceKm: 2500,
            rewardTickets: 1,
          },
        ]
  );

  // Tingkatan Hadiah (Prize Tiers)
  const [prizes, setPrizes] = useState<any[]>(
    initialData?.prizes && initialData.prizes.length > 0
      ? initialData.prizes
      : [
          {
            tier: 1,
            tierTitle: "Juara 1 - Grand Master",
            winnerCount: 1,
            rewards: [
              { type: "NC", title: "50.000 NC", amount: 50000 },
              { type: "FUEL", title: "5.000 L Fuel Garasi", amount: 5000 },
              { type: "CUSTOM", title: "Mod Livery Eksklusif Nismara" },
            ],
          },
          {
            tier: 2,
            tierTitle: "Juara 2 - Runner Up",
            winnerCount: 2,
            rewards: [
              { type: "NC", title: "25.000 NC", amount: 25000 },
              { type: "SAFEBOX_TICKET", title: "2x Tiket Penebusan Penalti", amount: 2 },
            ],
          },
          {
            tier: 3,
            tierTitle: "Juara 3 - Hadiah Spesial",
            winnerCount: 3,
            rewards: [
              { type: "NC", title: "10.000 NC", amount: 10000 },
              { type: "FUEL", title: "1.000 L Fuel Garasi", amount: 1000 },
            ],
          },
        ]
  );

  // Handler Quest
  const handleAddQuest = () => {
    const nextIndex = quests.length + 1;
    setQuests([
      ...quests,
      {
        questId: `quest_${Date.now().toString().slice(-4)}`,
        title: `Misi Baru #${nextIndex}`,
        description: "Deskripsi misi pengantaran kargo.",
        type: "TOTAL_JOBS",
        target: 1,
        rewardTickets: 1,
      },
    ]);
  };

  const handleRemoveQuest = (index: number) => {
    setQuests(quests.filter((_, i) => i !== index));
  };

  const handleUpdateQuest = (index: number, field: string, value: any) => {
    const updated = [...quests];
    updated[index] = { ...updated[index], [field]: value };
    setQuests(updated);
  };

  // Handler Prize Tier
  const handleAddTier = () => {
    const nextTier = prizes.length + 1;
    setPrizes([
      ...prizes,
      {
        tier: nextTier,
        tierTitle: `Juara ${nextTier}`,
        winnerCount: 1,
        rewards: [{ type: "NC", title: "10.000 NC", amount: 10000 }],
      },
    ]);
  };

  const handleRemoveTier = (tierIndex: number) => {
    setPrizes(prizes.filter((_, i) => i !== tierIndex));
  };

  const handleAddRewardToTier = (tierIndex: number) => {
    const updated = [...prizes];
    updated[tierIndex].rewards.push({
      type: "NC",
      title: "Hadiah Baru",
      amount: 5000,
    });
    setPrizes(updated);
  };

  const handleRemoveRewardFromTier = (tierIndex: number, rewardIndex: number) => {
    const updated = [...prizes];
    updated[tierIndex].rewards = updated[tierIndex].rewards.filter((_: any, i: number) => i !== rewardIndex);
    setPrizes(updated);
  };

  const handleUpdateReward = (tierIndex: number, rewardIndex: number, field: string, value: any) => {
    const updated = [...prizes];
    updated[tierIndex].rewards[rewardIndex] = {
      ...updated[tierIndex].rewards[rewardIndex],
      [field]: value,
    };
    setPrizes(updated);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !startDate || !endDate) {
      await showAlert("Mohon lengkapi judul, tanggal mulai, dan tanggal berakhir giveaway.");
      return;
    }

    if (prizes.length === 0) {
      await showAlert("Minimal harus ada 1 tingkatan hadiah (Tier).");
      return;
    }

    setLoading(true);
    try {
      let finalBannerUrl = bannerUrl.trim();

      // Jika ada file gambar baru yang dipilih, kompres ke WebP dan unggah ke Cloudflare R2
      if (bannerFile) {
        setIsUploadingImage(true);
        try {
          const isNismaraPlus = (session?.user as any)?.nismaraplus?.status === true;
          const compressedFile = await compressImageToWebP(bannerFile, isNismaraPlus ? 5 : 3, 1920);

          const uploadInitRes = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: compressedFile.name,
              fileType: compressedFile.type,
              fileSize: compressedFile.size,
              folder: "giveaways",
            }),
          });

          const uploadInitData = await uploadInitRes.json();
          if (!uploadInitRes.ok || !uploadInitData.signedUrl) {
            throw new Error(uploadInitData.error || "Gagal mendapatkan izin upload ke Cloudflare R2.");
          }

          const uploadRes = await fetch(uploadInitData.signedUrl, {
            method: "PUT",
            headers: { "Content-Type": compressedFile.type },
            body: compressedFile,
          });

          if (!uploadRes.ok) {
            throw new Error("Gagal mengunggah file gambar ke Cloudflare R2.");
          }

          finalBannerUrl = uploadInitData.publicUrl;
        } catch (uploadErr: any) {
          console.error("[Giveaway Form] R2 Upload Error:", uploadErr);
          await showAlert(uploadErr.message || "Gagal mengunggah gambar banner.");
          setLoading(false);
          setIsUploadingImage(false);
          return;
        } finally {
          setIsUploadingImage(false);
        }
      }

      const payload = {
        title,
        slug: slug.trim() || undefined,
        description,
        bannerUrl: finalBannerUrl || undefined,
        status,
        startDate: parseWIBToISO(startDate),
        endDate: parseWIBToISO(endDate),
        drawDate: parseWIBToISO(drawDate || endDate),
        allowMultipleWins,
        enableQuests,
        quests,
        enableNcPurchase,
        ticketPriceNC: Number(ticketPriceNC),
        maxPurchasableTickets: Number(maxPurchasableTickets),
        discountNPlusAndBooster: 20,
        prizes,
      };

      const url = isEdit ? `/api/manage/giveaways/${initialData._id}` : "/api/manage/giveaways";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        await showAlert(data.error || "Gagal menyimpan konfigurasi giveaway.");
      } else {
        await showAlert(isEdit ? "Giveaway berhasil diperbarui!" : "Giveaway baru berhasil dibuat!");
        router.push("/dashboard/manage/giveaways");
        router.refresh();
      }
    } catch (err: any) {
      await showAlert("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/manage/giveaways"
            className="p-2.5 rounded-2xl bg-card border border-border hover:border-primary/50 text-foreground transition-all"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Gift className="text-primary" />
              {isEdit ? "Edit Giveaway" : "Buat Giveaway Baru"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Atur periode, misi pengantaran tiket, harga boosting NC, dan tingkatan hadiah undian.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50"
        >
          <Save size={16} />{" "}
          {loading
            ? isUploadingImage
              ? "Mengunggah Gambar WebP..."
              : "Menyimpan..."
            : "Simpan Giveaway"}
        </button>
      </div>

      {/* 1. Informasi Utama */}
      <div className="p-6 rounded-3xl bg-card/60 border border-border/60 shadow-lg space-y-5">
        <h2 className="text-base font-black text-foreground uppercase tracking-wider flex items-center gap-2">
          <Calendar size={18} className="text-primary" /> 1. Informasi Event & Jadwal
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-foreground">Judul Giveaway</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Mega Giveaway Awal Musim ETS2 & ATS"
              className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-border/80 focus:border-primary text-foreground text-sm font-semibold outline-none transition-all"
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>Banner Poster Giveaway (Upload Cloudflare R2 • WebP)</span>
              {previewUrl && (
                <button
                  type="button"
                  onClick={handleRemoveBanner}
                  className="text-[11px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                >
                  <X size={12} /> Hapus Banner
                </button>
              )}
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleBannerFileChange}
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              className="hidden"
            />

            {previewUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-border/80 bg-black/40 group max-h-64 flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="Preview Banner"
                  className="w-full h-56 sm:h-64 object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5 transition-all"
                  >
                    <UploadCloud size={14} /> Ganti Gambar
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveBanner}
                    className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5 transition-all"
                  >
                    <Trash2 size={14} /> Hapus
                  </button>
                </div>
                {bannerFile && (
                  <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                    ✓ Siap Dikompresi WebP & Diunggah ke R2 saat Disimpan
                  </span>
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 sm:p-8 rounded-2xl border-2 border-dashed border-border/80 hover:border-primary/60 bg-black/30 hover:bg-primary/5 transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-2 group"
              >
                <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                  <UploadCloud size={28} />
                </div>
                <div>
                  <p className="text-sm font-black text-foreground">
                    Klik atau Seret Gambar Banner ke Sini
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Format: PNG, JPG, WEBP (Maks 3MB) / GIF (Maks 5MB khusus Nismara+)
                  </p>
                </div>
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                  ⚡ Otomatis Dikompresi ke Format WebP R2
                </span>
              </div>
            )}

            {/* Opsi URL Gambar Manual */}
            <div className="pt-1">
              {!showUrlInput ? (
                <button
                  type="button"
                  onClick={() => setShowUrlInput(true)}
                  className="text-[11px] text-muted-foreground hover:text-primary transition-colors underline"
                >
                  Atau masukkan tautan URL gambar eksternal
                </button>
              ) : (
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold text-muted-foreground">URL Gambar Manual:</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={bannerUrl}
                      onChange={(e) => {
                        setBannerUrl(e.target.value);
                        if (!bannerFile) setPreviewUrl(e.target.value);
                      }}
                      placeholder="https://images.nismara.web.id/giveaways/banner.webp"
                      className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-border text-foreground text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(false)}
                      className="px-3 py-2 rounded-xl bg-card border border-border text-xs text-muted-foreground hover:text-foreground"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Status Event</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-border/80 focus:border-primary text-foreground text-sm font-semibold outline-none transition-all"
            >
              <option value="scheduled">Scheduled (Terjadwal Otomatis)</option>
              <option value="ongoing">Ongoing (Langsung Berjalan)</option>
              <option value="draft">Draft (Disimpan Sementara)</option>
              <option value="completed">Completed (Selesai)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Tanggal Mulai (WIB)</label>
            <input
              type="datetime-local"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-border/80 focus:border-primary text-foreground text-sm font-semibold outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Tanggal Berakhir Klaim Tiket (WIB)</label>
            <input
              type="datetime-local"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-border/80 focus:border-primary text-foreground text-sm font-semibold outline-none transition-all"
            />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-foreground">Deskripsi & Syarat Ketentuan</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan tema event, aturan partisipasi, dan tata cara pengundian hadiah..."
              className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-border/80 focus:border-primary text-foreground text-sm outline-none transition-all resize-none"
            />
          </div>
        </div>

        {/* Toggle 1 User 1 Hadiah */}
        <div className="pt-3 border-t border-border/50">
          <label className="flex items-start gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/15 transition-all">
            <input
              type="checkbox"
              checked={!allowMultipleWins}
              onChange={(e) => setAllowMultipleWins(!e.target.checked)}
              className="mt-1 w-4 h-4 rounded text-primary border-primary focus:ring-0"
            />
            <div>
              <span className="text-sm font-black text-foreground block">
                Batasi 1 Pengemudi Maksimal 1 Hadiah (Sangat Direkomendasikan)
              </span>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Jika diaktifkan, pengemudi yang sudah memenangkan hadiah di tier lebih tinggi (misal Juara 1) tidak akan diundi lagi pada tier di bawahnya, sehingga hadiah terdistribusi merata ke driver lain.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* 2. Pengaturan Tiket & Quest */}
      <div className="p-6 rounded-3xl bg-card/60 border border-border/60 shadow-lg space-y-6">
        <h2 className="text-base font-black text-foreground uppercase tracking-wider flex items-center gap-2">
          <Ticket size={18} className="text-sky-400" /> 2. Pengaturan Tiket & Misi Pengantaran
        </h2>

        {/* Sub-A: Quest Game (Tiket Gratis) */}
        <div className="space-y-4 p-5 rounded-2xl bg-black/30 border border-border/60">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="enableQuests"
                checked={enableQuests}
                onChange={(e) => setEnableQuests(e.target.checked)}
                className="w-4 h-4 rounded text-primary border-border focus:ring-0"
              />
              <label htmlFor="enableQuests" className="text-sm font-black text-foreground cursor-pointer">
                Aktifkan Misi Pengantaran Game (Tiket Undian Gratis)
              </label>
            </div>
            {enableQuests && (
              <button
                type="button"
                onClick={handleAddQuest}
                className="px-3.5 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Plus size={14} /> Tambah Misi
              </button>
            )}
          </div>

          {enableQuests && (
            <div className="space-y-3 pt-2">
              {quests.map((q, idx) => (
                <div key={q.questId || idx} className="p-4 rounded-xl bg-card/60 border border-border/70 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-sky-400 uppercase tracking-wider">
                      Misi #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuest(idx)}
                      className="text-red-400 hover:text-red-300 transition-colors p-1"
                      title="Hapus Misi"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground">Judul Misi</label>
                      <input
                        type="text"
                        value={q.title}
                        onChange={(e) => handleUpdateQuest(idx, "title", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-border text-foreground text-xs font-semibold outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground">Tipe Misi</label>
                      <select
                        value={q.type}
                        onChange={(e) => handleUpdateQuest(idx, "type", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-border text-foreground text-xs font-semibold outline-none"
                      >
                        <option value="TOTAL_JOBS">Total Pekerjaan (Job)</option>
                        <option value="LONG_HAUL">Jarak Jauh (Long Haul)</option>
                        <option value="TRUCKERSMP_JOB">Job TruckersMP</option>
                        <option value="HEAVY_CARGO">Kargo Berat (Heavy)</option>
                        <option value="PERFECT_DELIVERY">0% Damage (Perfect)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground">Target Jumlah</label>
                      <input
                        type="number"
                        min={1}
                        value={q.target}
                        onChange={(e) => handleUpdateQuest(idx, "target", Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-border text-foreground text-xs font-semibold outline-none"
                      />
                    </div>

                    {q.type === "LONG_HAUL" && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground">Min. Jarak (KM)</label>
                        <input
                          type="number"
                          value={q.minDistanceKm || 2000}
                          onChange={(e) => handleUpdateQuest(idx, "minDistanceKm", Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-border text-foreground text-xs font-semibold outline-none"
                        />
                      </div>
                    )}

                    {q.type === "HEAVY_CARGO" && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground">Min. Berat (Ton)</label>
                        <input
                          type="number"
                          value={q.minCargoMass || 25}
                          onChange={(e) => handleUpdateQuest(idx, "minCargoMass", Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-border text-foreground text-xs font-semibold outline-none"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground">Hadiah Tiket</label>
                      <input
                        type="number"
                        min={1}
                        value={q.rewardTickets || 1}
                        onChange={(e) => handleUpdateQuest(idx, "rewardTickets", Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-border text-foreground text-xs font-semibold outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sub-B: Beli Tiket Ekstra via NC (Burn NC) */}
        <div className="space-y-4 p-5 rounded-2xl bg-black/30 border border-border/60">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enableNcPurchase"
              checked={enableNcPurchase}
              onChange={(e) => setEnableNcPurchase(e.target.checked)}
              className="w-4 h-4 rounded text-primary border-border focus:ring-0"
            />
            <label htmlFor="enableNcPurchase" className="text-sm font-black text-foreground cursor-pointer">
              Aktifkan Pembelian Tiket Tambahan via Nismara Coin (Burn NC)
            </label>
          </div>

          {enableNcPurchase && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Coins size={14} className="text-amber-400" /> Harga Dasar Tiket (NC)
                  </label>
                  <input
                    type="number"
                    min={100}
                    step={100}
                    value={ticketPriceNC}
                    onChange={(e) => setTicketPriceNC(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-border text-foreground text-sm font-bold outline-none"
                  />
                  <span className="text-[11px] text-muted-foreground">Contoh: 1.000 NC per lembar</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Batas Maksimal Beli per Driver</label>
                  <input
                    type="number"
                    min={0}
                    value={maxPurchasableTickets}
                    onChange={(e) => setMaxPurchasableTickets(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-border text-foreground text-sm font-bold outline-none"
                  />
                  <span className="text-[11px] text-muted-foreground">Isi 0 jika tanpa batasan kuota</span>
                </div>
              </div>

              {/* Informasi Diskon 20% */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-3">
                <Sparkles size={20} className="text-amber-400 shrink-0" />
                <div className="text-xs text-foreground leading-relaxed">
                  <span className="font-bold text-amber-400">Diskon Otomatis 20%: </span>
                  Pengemudi berstatus <strong>Nismara+ Aktif</strong> atau <strong>Discord Server Booster</strong> akan otomatis mendapatkan harga diskon 20% saat membeli tiket (misal: {(ticketPriceNC * 0.8).toLocaleString("id-ID")} NC).
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Tingkatan Hadiah (Prize Tiers Builder) */}
      <div className="p-6 rounded-3xl bg-card/60 border border-border/60 shadow-lg space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-foreground uppercase tracking-wider flex items-center gap-2">
              <Gift size={18} className="text-amber-400" /> 3. Tingkatan Hadiah Undian (Prizes)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Atur daftar juara dan paket hadiah (NC, Fuel, Tiket Safebox, Voucher, Trial VIP).
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddTier}
            className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <Plus size={14} /> Tambah Tier Juara
          </button>
        </div>

        <div className="space-y-6">
          {prizes.map((tier, tIdx) => (
            <div
              key={tier.tier || tIdx}
              className="p-5 rounded-2xl bg-black/30 border border-border/70 space-y-4 relative"
            >
              {/* Tier Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs uppercase">
                    Tier #{tier.tier}
                  </span>
                  <input
                    type="text"
                    value={tier.tierTitle}
                    onChange={(e) => {
                      const updated = [...prizes];
                      updated[tIdx].tierTitle = e.target.value;
                      setPrizes(updated);
                    }}
                    placeholder="Judul Tier (misal: Juara 1)"
                    className="px-3 py-1.5 rounded-lg bg-black/40 border border-border text-foreground font-black text-sm outline-none w-52"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-muted-foreground whitespace-nowrap">Kuota Pemenang:</label>
                    <input
                      type="number"
                      min={1}
                      value={tier.winnerCount || 1}
                      onChange={(e) => {
                        const updated = [...prizes];
                        updated[tIdx].winnerCount = Number(e.target.value);
                        setPrizes(updated);
                      }}
                      className="w-16 px-2.5 py-1 rounded-lg bg-black/40 border border-border text-foreground font-bold text-xs text-center outline-none"
                    />
                    <span className="text-xs text-muted-foreground">orang</span>
                  </div>

                  {prizes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTier(tIdx)}
                      className="text-red-400 hover:text-red-300 p-1.5 transition-colors"
                      title="Hapus Tier"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Reward Items inside Tier */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground block">
                  Paket Hadiah untuk Setiap Pemenang di Tier Ini:
                </span>
                {tier.rewards?.map((r: any, rIdx: number) => (
                  <div
                    key={rIdx}
                    className="p-3.5 rounded-xl bg-card/60 border border-border/60 space-y-3"
                  >
                    {/* Baris 1: Pilihan Tipe, Judul Hadiah, Input Jumlah / Aksi Hapus */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <div className="w-full sm:w-48 shrink-0">
                        <select
                          value={r.type}
                          onChange={(e) => {
                            const newType = e.target.value;
                            const updated = [...prizes];
                            const item = updated[tIdx].rewards[rIdx];
                            item.type = newType;
                            if (newType === "VOUCHER") {
                              item.voucherCategory = item.voucherCategory || "NC_BOOSTER";
                              item.voucherDiscountValue = item.voucherDiscountValue ?? 50;
                              item.voucherDurationHours = item.voucherDurationHours ?? 24;
                              item.voucherExpireDays = item.voucherExpireDays ?? 30;
                              item.voucherDiscountType = "percentage";
                              item.title = "Voucher NC Booster +50% (24 Jam)";
                            } else if (newType === "NC") {
                              item.amount = item.amount || 25000;
                              item.title = "25.000 NC";
                            } else if (newType === "FUEL") {
                              item.amount = item.amount || 2000;
                              item.title = "2.000 L Fuel Garasi";
                            } else if (newType === "SAFEBOX_TICKET") {
                              item.amount = item.amount || 1;
                              item.title = "1x Tiket Penebusan Penalti";
                            } else if (newType === "NPLUS_TRIAL") {
                              item.amount = item.amount || 7;
                              item.title = "7 Hari VIP Nismara+";
                            }
                            setPrizes(updated);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-black/40 border border-border text-foreground text-xs font-bold outline-none"
                        >
                          <option value="NC">Nismara Coin (NC)</option>
                          <option value="FUEL">Fuel Garasi (Liter)</option>
                          <option value="SAFEBOX_TICKET">Tiket Safebox Penalti</option>
                          <option value="VOUCHER">Kupon Voucher Diskon</option>
                          <option value="NPLUS_TRIAL">Trial VIP Nismara+ (Hari)</option>
                          <option value="CUSTOM">Hadiah Custom / Livery</option>
                        </select>
                      </div>

                      <div className="flex-1">
                        <input
                          type="text"
                          value={r.title}
                          onChange={(e) => handleUpdateReward(tIdx, rIdx, "title", e.target.value)}
                          placeholder="Judul / Keterangan Hadiah"
                          className="w-full px-3 py-2 rounded-lg bg-black/40 border border-border text-foreground text-xs font-semibold outline-none"
                        />
                      </div>

                      {["NC", "FUEL", "SAFEBOX_TICKET", "NPLUS_TRIAL"].includes(r.type) && (
                        <div className="w-full sm:w-32 shrink-0">
                          <input
                            type="number"
                            min={1}
                            value={r.amount || 0}
                            onChange={(e) => handleUpdateReward(tIdx, rIdx, "amount", Number(e.target.value))}
                            placeholder="Jumlah"
                            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-border text-foreground text-xs font-mono font-bold outline-none"
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveRewardFromTier(tIdx, rIdx)}
                        className="text-red-400 hover:text-red-300 p-2 shrink-0 self-end sm:self-center transition-colors"
                        title="Hapus Hadiah"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Baris 2 KHUSUS TIPE VOUCHER: Konfigurasi Kategori, Persen Diskon, Durasi Jam, dan Masa Berlaku Hari */}
                    {r.type === "VOUCHER" && (
                      <div className="p-3.5 rounded-xl bg-black/40 border border-border/60 space-y-3">
                        <div
                          className={`grid grid-cols-1 sm:grid-cols-2 ${
                            r.voucherCategory === "NC_BOOSTER" ? "lg:grid-cols-4" : "lg:grid-cols-3"
                          } gap-3`}
                        >
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                              Kategori Voucher
                            </label>
                            <select
                              value={r.voucherCategory || "NC_BOOSTER"}
                              onChange={(e) => {
                                const cat = e.target.value;
                                const updated = [...prizes];
                                const item = updated[tIdx].rewards[rIdx];
                                item.voucherCategory = cat;
                                item.voucherExpireDays = item.voucherExpireDays ?? 30;
                                if (cat === "FLEET_MAINTENANCE") {
                                  item.voucherDiscountValue = 100;
                                  item.title = "Voucher Bebas Servis Armada (100%)";
                                } else if (cat === "NC_BOOSTER") {
                                  item.voucherDiscountValue = 50;
                                  item.voucherDurationHours = 24;
                                  item.title = "Voucher NC Booster +50% (24 Jam)";
                                } else if (cat === "MARKET_MOD") {
                                  item.voucherDiscountValue = 25;
                                  item.title = "Voucher Diskon Mod Market 25%";
                                } else if (cat === "FLEET_BUY") {
                                  item.voucherDiscountValue = 15;
                                  item.title = "Voucher Diskon Beli Fleet 15%";
                                } else if (cat === "GARAGE_UPGRADE") {
                                  item.voucherDiscountValue = 20;
                                  item.title = "Voucher Diskon Upgrade Garasi 20%";
                                }
                                setPrizes(updated);
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-border text-foreground text-xs font-bold outline-none"
                            >
                              <option value="NC_BOOSTER">⚡ Booster NC</option>
                              <option value="FLEET_MAINTENANCE">🔧 Servis Truk (Bebas / Diskon)</option>
                              <option value="MARKET_MOD">🛒 Diskon Mod Market</option>
                              <option value="FLEET_BUY">🚛 Diskon Pembelian Armada</option>
                              <option value="GARAGE_UPGRADE">🏢 Diskon Upgrade Garasi</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                              {r.voucherCategory === "NC_BOOSTER" ? "Bonus Booster (%)" : "Nilai Diskon (%)"}
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={r.voucherDiscountValue ?? 50}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  const updated = [...prizes];
                                  const item = updated[tIdx].rewards[rIdx];
                                  item.voucherDiscountValue = val;
                                  if (item.voucherCategory === "NC_BOOSTER") {
                                    item.title = `Voucher NC Booster +${val}% (${item.voucherDurationHours || 24} Jam)`;
                                  } else if (item.voucherCategory === "FLEET_MAINTENANCE") {
                                    item.title = val === 100 ? "Voucher Bebas Servis Armada (100%)" : `Voucher Diskon Servis ${val}%`;
                                  }
                                  setPrizes(updated);
                                }}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-border text-foreground text-xs font-mono font-bold outline-none"
                                placeholder="50"
                              />
                              <span className="absolute right-2.5 top-1.5 text-xs font-bold text-muted-foreground">%</span>
                            </div>
                            <span className="text-[9px] text-muted-foreground mt-0.5 block">
                              {r.voucherCategory === "NC_BOOSTER" ? "Tambahan NC per job" : "Isi 100 untuk gratis 100%"}
                            </span>
                          </div>

                          {/* Khusus NC Booster: Input Jam Durasi Aktif */}
                          {r.voucherCategory === "NC_BOOSTER" && (
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                                Durasi Booster (Jam)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min={1}
                                  value={r.voucherDurationHours ?? 24}
                                  onChange={(e) => {
                                    const hrs = Number(e.target.value);
                                    const updated = [...prizes];
                                    const item = updated[tIdx].rewards[rIdx];
                                    item.voucherDurationHours = hrs;
                                    item.title = `Voucher NC Booster +${item.voucherDiscountValue || 50}% (${hrs} Jam)`;
                                    setPrizes(updated);
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-border text-foreground text-xs font-mono font-bold outline-none"
                                  placeholder="24"
                                />
                                <span className="absolute right-2.5 top-1.5 text-xs font-bold text-muted-foreground">Jam</span>
                              </div>
                              <span className="text-[9px] text-muted-foreground mt-0.5 block">
                                Durasi aktif boost saat diaktifkan
                              </span>
                            </div>
                          )}

                          {/* Masa Berlaku Voucher Sebelum Hangus (Hari) - Berlaku untuk SEMUA kategori voucher termasuk NC Booster */}
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                              Masa Berlaku Voucher (Hari)
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min={0}
                                value={r.voucherExpireDays ?? 30}
                                onChange={(e) => {
                                  const days = Number(e.target.value);
                                  const updated = [...prizes];
                                  const item = updated[tIdx].rewards[rIdx];
                                  item.voucherExpireDays = days;
                                  setPrizes(updated);
                                }}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-border text-foreground text-xs font-mono font-bold outline-none"
                                placeholder="30"
                              />
                              <span className="absolute right-2.5 top-1.5 text-xs font-bold text-muted-foreground">Hari</span>
                            </div>
                            <span className="text-[9px] text-muted-foreground mt-0.5 block">
                              {(r.voucherExpireDays ?? 30) === 0 ? "Tidak pernah kadaluarsa" : "Batas waktu klaim sebelum hangus"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => handleAddRewardToTier(tIdx)}
                  className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1 mt-1 transition-colors"
                >
                  <Plus size={12} /> Tambah Item Hadiah
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Link
          href="/dashboard/manage/giveaways"
          className="px-5 py-3 rounded-2xl bg-card border border-border hover:bg-card/80 text-foreground font-bold text-xs uppercase tracking-wider transition-all"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-xl shadow-primary/25 disabled:opacity-50"
        >
          <Save size={16} />{" "}
          {loading
            ? isUploadingImage
              ? "Mengunggah Gambar WebP..."
              : "Menyimpan..."
            : "Simpan Giveaway"}
        </button>
      </div>
    </form>
  );
}
