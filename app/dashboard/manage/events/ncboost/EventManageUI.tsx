"use client";

import React, { useState, useEffect } from "react";
import {
  createNCEventAction,
  updateNCEventAction,
  closeNCEventAction,
  publishScheduledNCEventAction,
  deleteNCEventAction,
} from "@/app/actions/eventActions";
import { showAlert, showConfirm } from "@/lib/dialog";
import {
  Plus,
  Zap,
  Calendar,
  History,
  Clock,
  Sparkles,
  Edit3,
  Trash2,
  ExternalLink,
  PowerOff,
  Play,
  Upload,
  Image as ImageIcon,
  X,
  Truck,
  Gamepad2,
  Globe,
  Flame,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { compressImageToWebP } from "@/lib/imageUtils";
import { slugify } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

// Preset pilihan bonus multiplier yang sering digunakan
const MULTIPLIER_PRESETS = [
  { value: 0.2, label: "+20%", desc: "1.2x NC" },
  { value: 0.4, label: "+40%", desc: "1.4x NC" },
  { value: 0.5, label: "+50%", desc: "1.5x NC" },
  { value: 1.0, label: "+100%", desc: "2.0x Double NC" },
  { value: 2.0, label: "+200%", desc: "3.0x Triple NC" },
];

export default function EventManageUI({
  active = [],
  scheduled = [],
  history = [],
  manager,
}: {
  active: any[];
  scheduled: any[];
  history: any[];
  manager: any;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "scheduled" | "history">("active");

  // State Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Helper date timezone WIB (Asia/Jakarta)
  const getWIBDateTimeLocal = (date: Date) => {
    const wibDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    const year = wibDate.getFullYear();
    const month = String(wibDate.getMonth() + 1).padStart(2, "0");
    const day = String(wibDate.getDate()).padStart(2, "0");
    const hours = String(wibDate.getHours()).padStart(2, "0");
    const minutes = String(wibDate.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getInitialStartDate = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    return getWIBDateTimeLocal(d);
  };

  const getInitialEndDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return getWIBDateTimeLocal(d);
  };

  const [formData, setFormData] = useState({
    nameEvent: "",
    slug: "",
    type: "all",
    gameId: "all",
    multiplier: "0.5",
    isScheduled: false,
    startDate: getInitialStartDate(),
    endAt: getInitialEndDate(),
    imageUrl: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const openCreateModal = () => {
    setEditingEvent(null);
    setFormData({
      nameEvent: "",
      slug: "",
      type: "all",
      gameId: "all",
      multiplier: "0.5",
      isScheduled: false,
      startDate: getInitialStartDate(),
      endAt: getInitialEndDate(),
      imageUrl: "",
    });
    setImageFile(null);
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const openEditModal = (eventItem: any) => {
    setEditingEvent(eventItem);
    const start = eventItem.startDate ? new Date(eventItem.startDate) : new Date(eventItem.setAt || Date.now());
    const end = eventItem.endAt ? new Date(eventItem.endAt) : new Date();

    setFormData({
      nameEvent: eventItem.nameEvent || "",
      slug: eventItem.slug || slugify(eventItem.nameEvent || ""),
      type: eventItem.type || "all",
      gameId: eventItem.gameId || "all",
      multiplier: String(eventItem.multiplier || "0.5"),
      isScheduled: Boolean(eventItem.isScheduled),
      startDate: getWIBDateTimeLocal(start),
      endAt: getWIBDateTimeLocal(end),
      imageUrl: eventItem.imageUrl || "",
    });
    setImageFile(null);
    setImagePreview(eventItem.imageUrl || null);
    setIsModalOpen(true);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      nameEvent: val,
      slug: !editingEvent ? slugify(val) : prev.slug,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showAlert("File harus berupa format gambar (PNG, JPEG, WebP, GIF).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showAlert("Maksimal ukuran gambar adalah 5MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, imageUrl: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nameEvent.trim()) {
      await showAlert("Nama Event wajib diisi.");
      return;
    }
    if (!formData.endAt) {
      await showAlert("Waktu Berakhir Event wajib ditentukan.");
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = formData.imageUrl;

      // Upload deferred file jika ada file baru yang dipilih
      if (imageFile) {
        let fileToUpload = imageFile;
        if (imageFile.type !== "image/gif") {
          fileToUpload = await compressImageToWebP(imageFile, 1, 1920);
        }

        const presignedRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: fileToUpload.name,
            fileType: fileToUpload.type,
            folder: "events",
            fileSize: fileToUpload.size,
          }),
        });

        if (!presignedRes.ok) {
          const errData = await presignedRes.json();
          throw new Error(errData.error || "Gagal mendapatkan izin upload Cloudflare R2.");
        }

        const { uploadUrl, fileUrl } = await presignedRes.json();

        const uploadBinaryRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": fileToUpload.type },
          body: fileToUpload,
        });

        if (!uploadBinaryRes.ok) {
          throw new Error("Gagal mengunggah gambar ke server storage Cloudflare R2.");
        }

        finalImageUrl = fileUrl;
      }

      const payload = {
        ...formData,
        imageUrl: finalImageUrl,
        setBy: manager?.discordId || manager?.id,
      };

      if (editingEvent) {
        const res = await updateNCEventAction(editingEvent._id, payload);
        if (res.success) {
          await showAlert("Event Currency Boost berhasil diperbarui!");
          setIsModalOpen(false);
          router.refresh();
        } else {
          await showAlert(res.error || "Gagal memperbarui event.");
        }
      } else {
        const res = await createNCEventAction(payload);
        if (res.success) {
          await showAlert("Event Currency Boost berhasil dibuat dan dijadwalkan!");
          setIsModalOpen(false);
          router.refresh();
        } else {
          await showAlert("Gagal membuat event.");
        }
      }
    } catch (err: any) {
      await showAlert(`Terjadi kesalahan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseEvent = async (eventItem: any) => {
    const confirm = await showConfirm(
      `Yakin ingin mengakhiri event "${eventItem.nameEvent}" sekarang? Event akan langsung dipindahkan ke Riwayat.`
    );
    if (!confirm) return;

    const res = await closeNCEventAction(eventItem._id);
    if (res.success) {
      await showAlert("Event berhasil diakhiri!");
      router.refresh();
    } else {
      await showAlert(res.error || "Gagal mengakhiri event.");
    }
  };

  const handlePublishScheduled = async (eventItem: any) => {
    const confirm = await showConfirm(
      `Publikasikan event "${eventItem.nameEvent}" sekarang? Status akan langsung berubah menjadi AKTIF.`
    );
    if (!confirm) return;

    const res = await publishScheduledNCEventAction(eventItem._id);
    if (res.success) {
      await showAlert("Event berhasil dipublikasikan menjadi Aktif!");
      router.refresh();
    } else {
      await showAlert(res.error || "Gagal mempublikasikan event.");
    }
  };

  const handleDeleteEvent = async (eventItem: any) => {
    const confirm = await showConfirm(
      `PERINGATAN: Hapus event "${eventItem.nameEvent}" secara permanen dari database? Aksi ini tidak dapat dibatalkan.`
    );
    if (!confirm) return;

    const res = await deleteNCEventAction(eventItem._id);
    if (res.success) {
      await showAlert("Event berhasil dihapus secara permanen!");
      router.refresh();
    } else {
      await showAlert(res.error || "Gagal menghapus event.");
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!mounted || !dateString) return "-";
    return (
      new Date(dateString).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " WIB"
    );
  };

  const getGameBadge = (gameId: string) => {
    if (gameId === "1") {
      return (
        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
          <Gamepad2 size={11} /> ETS2
        </span>
      );
    }
    if (gameId === "2") {
      return (
        <span className="px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
          <Gamepad2 size={11} /> ATS
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
        <Globe size={11} /> Semua Game
      </span>
    );
  };

  const currentList =
    activeTab === "active" ? active : activeTab === "scheduled" ? scheduled : history;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-lg shadow-amber-500/10">
              <Zap size={22} className="fill-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
                Currency Boost <span className="text-amber-400">Events</span>
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                Kelola multiplier bonus Nismara Coin (NC), jadwalkan event mendatang, dan atur periode promo.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-600 hover:to-orange-600 text-black font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 hover:scale-[1.02] shrink-0"
        >
          <Plus size={16} strokeWidth={3} />
          <span>Buat Boost Event Baru</span>
        </button>
      </div>

      {/* 2. Quick Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setActiveTab("active")}
          className={`cursor-pointer p-5 rounded-3xl border transition-all ${
            activeTab === "active"
              ? "bg-gradient-to-br from-amber-500/15 via-card to-card border-amber-500/50 shadow-xl shadow-amber-500/10 ring-1 ring-amber-500/30"
              : "bg-card/60 border-border/60 hover:border-border hover:bg-card"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Flame size={14} className="fill-amber-400" /> Event Aktif
            </span>
            {active.length > 0 && (
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
            )}
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-foreground tabular-nums">{active.length}</span>
            <span className="text-xs text-muted-foreground font-semibold">Sedang Berjalan</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab("scheduled")}
          className={`cursor-pointer p-5 rounded-3xl border transition-all ${
            activeTab === "scheduled"
              ? "bg-gradient-to-br from-sky-500/15 via-card to-card border-sky-500/50 shadow-xl shadow-sky-500/10 ring-1 ring-sky-500/30"
              : "bg-card/60 border-border/60 hover:border-border hover:bg-card"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <Calendar size={14} /> Terjadwal
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-foreground tabular-nums">{scheduled.length}</span>
            <span className="text-xs text-muted-foreground font-semibold">Upcoming Event</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab("history")}
          className={`cursor-pointer p-5 rounded-3xl border transition-all ${
            activeTab === "history"
              ? "bg-gradient-to-br from-emerald-500/15 via-card to-card border-emerald-500/50 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500/30"
              : "bg-card/60 border-border/60 hover:border-border hover:bg-card"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <History size={14} /> Riwayat Selesai
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-foreground tabular-nums">{history.length}</span>
            <span className="text-xs text-muted-foreground font-semibold">Event Telah Berakhir</span>
          </div>
        </div>
      </div>

      {/* 3. Tab Navigasi */}
      <div className="flex items-center gap-2 p-1.5 bg-card/60 border border-border/60 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("active")}
          className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition ${
            activeTab === "active"
              ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Sedang Berjalan ({active.length})
        </button>
        <button
          onClick={() => setActiveTab("scheduled")}
          className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition ${
            activeTab === "scheduled"
              ? "bg-sky-500 text-black shadow-lg shadow-sky-500/20"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Terjadwal ({scheduled.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition ${
            activeTab === "history"
              ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Riwayat ({history.length})
        </button>
      </div>

      {/* 4. Event Cards Grid */}
      {currentList.length === 0 ? (
        <div className="p-12 rounded-3xl border border-dashed border-border/80 bg-card/30 flex flex-col items-center justify-center text-center space-y-3">
          <div className="p-4 rounded-full bg-muted/30 text-muted-foreground">
            <Zap size={28} />
          </div>
          <h3 className="text-base font-black text-foreground">
            {activeTab === "active"
              ? "Tidak ada Currency Boost yang sedang aktif"
              : activeTab === "scheduled"
              ? "Tidak ada jadwal event mendatang"
              : "Belum ada riwayat event"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            {activeTab === "active"
              ? "Buat event baru atau publikasikan event yang telah dijadwalkan untuk memberikan bonus NC ke driver."
              : "Klik tombol 'Buat Boost Event Baru' di atas untuk merencanakan promo NC selanjutnya."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {currentList.map((item: any) => {
            const boostPercent = Math.round(Number(item.multiplier || 0) * 100);
            const isLive = item.isActive;
            const isSched = item.isScheduled && !item.isActive;

            return (
              <div
                key={item._id}
                className="group relative rounded-3xl border border-border/70 bg-card/80 hover:bg-card hover:border-amber-500/40 transition-all duration-300 overflow-hidden shadow-md flex flex-col justify-between"
              >
                {/* Banner Thumbnail */}
                <div className="relative h-44 w-full bg-muted/40 overflow-hidden">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.nameEvent}
                      fill
                      unoptimized
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-500/10 via-card to-card text-muted-foreground">
                      <Zap size={36} className="text-amber-500/40 mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                        No Banner Image
                      </span>
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-black/40" />

                  {/* Top Badges */}
                  <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2">
                    <span className="px-3 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-amber-500/30 text-amber-400 font-black text-xs tracking-wider shadow-lg flex items-center gap-1.5">
                      <Zap size={13} className="fill-amber-400" />
                      +{boostPercent}% NC ({item.multiplier}x)
                    </span>

                    {isLive ? (
                      <span className="px-2.5 py-1 rounded-xl bg-amber-500 text-black font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-md animate-pulse">
                        <Flame size={12} className="fill-black" /> LIVE AKTIF
                      </span>
                    ) : isSched ? (
                      <span className="px-2.5 py-1 rounded-xl bg-sky-500 text-black font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-md">
                        <Clock size={12} /> TERJADWAL
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl bg-muted text-muted-foreground font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 size={12} /> SELESAI
                      </span>
                    )}
                  </div>
                </div>

                {/* Content Body */}
                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {getGameBadge(item.gameId)}
                      <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                        {item.type === "all" ? "Semua Tipe" : item.type}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-foreground tracking-tight line-clamp-1" title={item.nameEvent}>
                      {item.nameEvent}
                    </h3>
                  </div>

                  {/* Time Range Information */}
                  <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Mulai:</span>
                      <span className="font-semibold text-foreground">
                        {formatDateTime(item.startDate || item.setAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Selesai:</span>
                      <span className="font-semibold text-foreground">{formatDateTime(item.endAt)}</span>
                    </div>
                  </div>

                  {/* Action Buttons Toolbar */}
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {/* Link to Public Event Page */}
                      <Link
                        href={`/currency-boost/${item.slug || slugify(item.nameEvent)}`}
                        target="_blank"
                        className="p-2 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition"
                        title="Buka Halaman Publik"
                      >
                        <ExternalLink size={15} />
                      </Link>

                      {/* Edit Button */}
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-2 rounded-xl bg-muted/60 hover:bg-amber-500/20 hover:text-amber-400 text-muted-foreground transition"
                        title="Edit Event"
                      >
                        <Edit3 size={15} />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteEvent(item)}
                        className="p-2 rounded-xl bg-muted/60 hover:bg-red-500/20 hover:text-red-400 text-muted-foreground transition"
                        title="Hapus Event"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {/* Specific State Actions */}
                    <div>
                      {isLive && (
                        <button
                          onClick={() => handleCloseEvent(item)}
                          className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition"
                        >
                          <PowerOff size={13} /> Selesaikan
                        </button>
                      )}

                      {isSched && (
                        <button
                          onClick={() => handlePublishScheduled(item)}
                          className="px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20 text-sky-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition"
                        >
                          <Play size={13} className="fill-sky-400" /> Aktifkan Sekarang
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Create & Edit Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Zap size={22} className="fill-amber-400" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-foreground tracking-tight">
                    {editingEvent ? "Edit Currency Boost Event" : "Buat Currency Boost Event"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {editingEvent
                      ? "Perbarui detail, multiplier bonus, atau jadwal event."
                      : "Tentukan parameter bonus NC, jadwal mulai, dan batas waktu event."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-white/5 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Nama Event */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Nama Event <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Weekend Double NC Rush 2026"
                  value={formData.nameEvent}
                  onChange={handleNameChange}
                  className="w-full px-4 py-3 rounded-xl bg-black/30 border border-border focus:border-amber-500 text-foreground font-semibold text-sm outline-none transition"
                />
              </div>

              {/* Slug URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  URL Slug
                </label>
                <div className="flex items-center px-4 py-3 rounded-xl bg-black/30 border border-border text-sm">
                  <span className="text-muted-foreground text-xs font-mono mr-1">/currency-boost/</span>
                  <input
                    type="text"
                    required
                    placeholder="weekend-double-nc-rush-2026"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, slug: slugify(e.target.value) }))
                    }
                    className="flex-1 bg-transparent text-foreground font-mono text-xs outline-none"
                  />
                </div>
              </div>

              {/* Multiplier Boost Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Multiplier Bonus NC <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs font-bold text-amber-400">
                    +{Math.round(Number(formData.multiplier || 0) * 100)}% Bonus (x
                    {(1 + Number(formData.multiplier || 0)).toFixed(2)} Total)
                  </span>
                </div>

                {/* Preset Pills */}
                <div className="grid grid-cols-5 gap-2">
                  {MULTIPLIER_PRESETS.map((p) => {
                    const isSelected = Number(formData.multiplier) === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, multiplier: String(p.value) }))
                        }
                        className={`py-2 px-1 rounded-xl border text-center transition ${
                          isSelected
                            ? "bg-amber-500 text-black border-amber-500 font-black shadow-md shadow-amber-500/20"
                            : "bg-black/20 border-border/80 text-muted-foreground hover:text-foreground hover:bg-black/40"
                        }`}
                      >
                        <p className="text-xs font-bold leading-tight">{p.label}</p>
                        <p className="text-[9px] opacity-75">{p.desc}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Multiplier Number Input */}
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xs text-muted-foreground">Atau tentukan kustom:</span>
                  <input
                    type="number"
                    step="0.05"
                    min="0.05"
                    max="10.0"
                    value={formData.multiplier}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, multiplier: e.target.value }))
                    }
                    className="w-28 px-3 py-1.5 rounded-lg bg-black/30 border border-border text-foreground font-mono text-xs text-center outline-none focus:border-amber-500"
                  />
                  <span className="text-xs text-muted-foreground font-mono">
                    (Misal: 0.5 = +50% NC)
                  </span>
                </div>
              </div>

              {/* Game & Tipe Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Target Game
                  </label>
                  <select
                    value={formData.gameId}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, gameId: e.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl bg-black/30 border border-border focus:border-amber-500 text-foreground font-semibold text-sm outline-none"
                  >
                    <option value="all">Semua Game (ETS2 & ATS)</option>
                    <option value="1">Euro Truck Simulator 2</option>
                    <option value="2">American Truck Simulator</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Tipe Pengiriman / Server
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-black/30 border border-border focus:border-amber-500 text-foreground font-semibold text-sm outline-none"
                  >
                    <option value="all">Semua Server (Singleplayer & Multiplayer)</option>
                    <option value="TruckersMP">Khusus TruckersMP</option>
                    <option value="Single Player">Khusus Single Player</option>
                    <option value="Convoy">Khusus Convoy</option>
                  </select>
                </div>
              </div>

              {/* Schedule Mode Toggle */}
              <div className="p-4 rounded-2xl bg-black/30 border border-border/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-foreground block">
                    Mode Jadwal (Scheduled Event)
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formData.isScheduled
                      ? "Event akan dijadwalkan dan aktif otomatis saat waktu mulai tiba."
                      : "Event langsung aktif seketika setelah formulir disimpan."}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, isScheduled: !prev.isScheduled }))
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.isScheduled ? "bg-amber-500" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.isScheduled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Date & Time Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Calendar size={13} /> Waktu Mulai (WIB)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl bg-black/30 border border-border focus:border-amber-500 text-foreground font-mono text-xs outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Clock size={13} /> Deadline Selesai (WIB) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.endAt}
                    onChange={(e) => setFormData((prev) => ({ ...prev, endAt: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-black/30 border border-border focus:border-amber-500 text-foreground font-mono text-xs outline-none"
                  />
                </div>
              </div>

              {/* Banner Image Upload (Deferred to R2) */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <ImageIcon size={13} /> Banner / Poster Event
                </label>

                {imagePreview ? (
                  <div className="relative h-44 w-full rounded-2xl overflow-hidden border border-border">
                    <Image src={imagePreview} alt="Preview" fill unoptimized className="object-cover" />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-3 right-3 p-2 rounded-xl bg-black/70 hover:bg-black text-white transition shadow-lg"
                      title="Hapus Gambar"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer border-2 border-dashed border-border/80 hover:border-amber-500/50 hover:bg-amber-500/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 transition group">
                    <Upload size={22} className="text-muted-foreground group-hover:text-amber-400" />
                    <span className="text-xs font-bold text-foreground">
                      Klik untuk memilih gambar poster banner
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      PNG, JPEG, WebP, GIF (Maks. 5MB) • Otomatis dikompres ke WebP
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 rounded-xl border border-border text-foreground font-bold text-xs uppercase tracking-wider hover:bg-white/5 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-7 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-600 hover:to-orange-600 text-black font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50"
                >
                  <Sparkles size={16} className="fill-black" />
                  <span>{loading ? "Menyimpan Event..." : editingEvent ? "Simpan Perubahan" : "Buat Event"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
