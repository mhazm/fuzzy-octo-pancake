"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Trophy,
  Search,
  Upload,
  Code,
  Tag,
  Sparkles,
  Calendar,
  Award,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  ShieldAlert,
  X,
  CheckCircle2,
  Flame,
  FileText,
} from "lucide-react";
import { compressImageToWebP } from "@/lib/imageUtils";
import { useSession } from "next-auth/react";
import { showAlert, showConfirm } from "@/lib/dialog";

const CATEGORIES = [
  {
    id: "weekly",
    label: "Weekly",
    fullName: "Tantangan Mingguan",
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  },
  {
    id: "monthly",
    label: "Monthly",
    fullName: "Prestasi Bulanan",
    color: "text-accent-lilac",
    bg: "bg-accent-lilac/10",
    border: "border-accent-lilac/30",
    badge: "bg-accent-lilac/15 text-accent-lilac border-accent-lilac/30",
  },
  {
    id: "yearly",
    label: "Yearly",
    fullName: "Milestone Tahunan",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  {
    id: "event",
    label: "Event",
    fullName: "Operasi Khusus / Event",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
];

export default function AchievementManagerClient() {
  const { data: session } = useSession();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Form Modal State
  const [formModal, setFormModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    data: any;
  }>({
    open: false,
    mode: "create",
    data: { codeId: "", name: "", description: "", imageUrl: "", category: "weekly" },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fetchAchievements = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/manage/achievements");
      const data = await res.json();
      if (data.success) {
        setAchievements(data.achievements || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, []);

  // Category & Stats Helper
  const getCategoryMeta = (catId: string) => {
    return CATEGORIES.find((c) => c.id === catId) || CATEGORIES[0];
  };

  const stats = useMemo(() => {
    const weeklyCount = achievements.filter((a) => a.category === "weekly").length;
    const monthlyCount = achievements.filter((a) => a.category === "monthly").length;
    const yearlyCount = achievements.filter((a) => a.category === "yearly").length;
    const eventCount = achievements.filter((a) => a.category === "event").length;

    return {
      total: achievements.length,
      weekly: weeklyCount,
      monthly: monthlyCount,
      yearly: yearlyCount,
      event: eventCount,
    };
  }, [achievements]);

  // Filter & Search Logic
  const filtered = useMemo(() => {
    return achievements.filter((a) => {
      const matchFilter = filter === "all" || a.category === filter;
      const matchSearch =
        search === "" ||
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.codeId.toLowerCase().includes(search.toLowerCase()) ||
        (a.description && a.description.toLowerCase().includes(search.toLowerCase()));
      return matchFilter && matchSearch;
    });
  }, [achievements, filter, search]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formModal.data.codeId || !formModal.data.name || !formModal.data.category) {
      showAlert("Harap lengkapi Code ID, Nama Achievement, dan Kategori!");
      return;
    }

    setIsSubmitting(true);

    try {
      const isEdit = formModal.mode === "edit";
      let imageUrl = formModal.data.imageUrl;

      // Upload image to Cloudflare R2 if new file selected
      if (imageFile) {
        const isNismaraPlus = (session?.user as any)?.nismaraplus?.status === true;
        const compressedImage = await compressImageToWebP(
          imageFile,
          isNismaraPlus ? 5 : 3,
          512
        );

        const presignRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: compressedImage.name,
            fileType: compressedImage.type,
            folder: "achievements",
            fileSize: compressedImage.size,
          }),
        });

        if (!presignRes.ok) {
          const errData = await presignRes.json();
          throw new Error(errData.error || "Gagal mendapatkan presigned upload URL.");
        }

        const { signedUrl, publicUrl } = await presignRes.json();
        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": compressedImage.type },
          body: compressedImage,
        });

        if (!uploadRes.ok) {
          throw new Error("Gagal mengunggah file gambar ke storage.");
        }

        imageUrl = publicUrl;
      }

      const url = isEdit
        ? `/api/manage/achievements/${formModal.data._id}`
        : "/api/manage/achievements";

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formModal.data, imageUrl }),
      });

      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || "Gagal menyimpan achievement");
      }

      setFormModal({
        open: false,
        mode: "create",
        data: { codeId: "", name: "", description: "", imageUrl: "", category: "weekly" },
      });
      setImageFile(null);
      setImagePreview(null);
      await fetchAchievements();
      await showAlert(
        isEdit ? "Perubahan achievement berhasil disimpan!" : "Achievement baru berhasil dibuat!"
      );
    } catch (err: any) {
      await showAlert(err.message || "Terjadi kesalahan saat memproses data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirm = await showConfirm(
      `Hapus permanen achievement "${name}"? Gambar di Cloudflare R2 juga akan dibersihkan secara otomatis.`
    );
    if (!confirm) return;

    try {
      const res = await fetch(`/api/manage/achievements/${id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (result.success) {
        await showAlert(`Achievement "${name}" berhasil dihapus.`);
        await fetchAchievements();
      } else {
        await showAlert(result.error || "Gagal menghapus achievement.");
      }
    } catch {
      await showAlert("Terjadi kesalahan sistem saat menghapus achievement.");
    }
  };

  const openEditModal = (item: any) => {
    setImageFile(null);
    setImagePreview(item.imageUrl || null);
    setFormModal({
      open: true,
      mode: "edit",
      data: {
        _id: item._id,
        codeId: item.codeId,
        name: item.name,
        description: item.description || "",
        imageUrl: item.imageUrl || "",
        category: item.category || "weekly",
      },
    });
  };

  const openCreateModal = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormModal({
      open: true,
      mode: "create",
      data: { codeId: "", name: "", description: "", imageUrl: "", category: "weekly" },
    });
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
              <Sparkles size={13} /> Driver Recognition & Badge Registry
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground uppercase">
              Achievement <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-accent-lilac to-primary">Registry</span>
            </h1>
            <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">
              Otorisasi dan kelola seluruh lencana prestasi driver, tantangan mingguan, pencapaian bulanan, serta penghargaan event khusus armada.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="bg-primary text-primary-foreground px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-3 shadow-xl hover:brightness-110 hover:scale-105 active:scale-95 shadow-primary/25"
          >
            <Plus size={18} /> New Achievement
          </button>
        </div>
      </div>

      {/* 2. STATISTICAL KPI OVERVIEW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Badges */}
        <div className="p-5 rounded-3xl border border-border/80 bg-card flex flex-col justify-between space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Total Badges
            </span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Trophy size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-foreground tabular-nums">
              {stats.total}
            </div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1">
              Seluruh Kategori Terdaftar
            </p>
          </div>
        </div>

        {/* Metric 2: Weekly Challenges */}
        <div className="p-5 rounded-3xl border border-border/80 bg-card flex flex-col justify-between space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-sky-400">
              Weekly Quests
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Calendar size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-sky-400 tabular-nums">
              {stats.weekly}
            </div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1">
              Pencapaian Mingguan
            </p>
          </div>
        </div>

        {/* Metric 3: Monthly & Yearly */}
        <div className="p-5 rounded-3xl border border-border/80 bg-card flex flex-col justify-between space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-accent-lilac">
              Monthly & Yearly
            </span>
            <div className="w-8 h-8 rounded-xl bg-accent-lilac/10 text-accent-lilac flex items-center justify-center">
              <Award size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-accent-lilac tabular-nums">
              {stats.monthly + stats.yearly}
            </div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1">
              {stats.monthly} Bulanan • {stats.yearly} Tahunan
            </p>
          </div>
        </div>

        {/* Metric 4: Event Badges */}
        <div className="p-5 rounded-3xl border border-border/80 bg-card flex flex-col justify-between space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
              Special Events
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Flame size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-emerald-400 tabular-nums">
              {stats.event}
            </div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1">
              Badge Operasi Khusus
            </p>
          </div>
        </div>
      </div>

      {/* 3. FILTER TABS, SEARCH & VIEW SWITCHER */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-3xl border border-border bg-card shadow-lg">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 ${
              filter === "all"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            <Layers size={14} /> Semua ({achievements.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = achievements.filter((a) => a.category === cat.id).length;
            const isActive = filter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 ${
                  isActive
                    ? `${cat.bg} ${cat.color} border ${cat.border} shadow-md`
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Search & View Mode */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Cari nama atau Code ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/20 border border-border rounded-2xl text-xs font-medium text-foreground outline-none focus:border-primary transition-all"
            />
          </div>

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

      {/* 4. MAIN CONTENT AREA */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Memuat Registry Achievement...
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-16 rounded-[2.5rem] border border-border bg-card text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-3xl bg-white/5 text-muted-foreground flex items-center justify-center mx-auto">
            <Trophy size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-foreground uppercase tracking-tight">
              {search ? "Achievement Tidak Ditemukan" : "Belum Ada Achievement"}
            </h3>
            <p className="text-muted-foreground text-xs max-w-md mx-auto">
              {search
                ? `Tidak ada badge yang cocok dengan kata kunci "${search}". Coba periksa kembali Code ID atau nama badge.`
                : "Belum ada lencana yang dibuat untuk kategori ini. Klik tombol 'New Achievement' untuk mendaftarkan lencana pertama."}
            </p>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => {
            const cat = getCategoryMeta(item.category);
            return (
              <div
                key={item._id}
                className="group bg-card border border-border hover:border-primary/40 rounded-[2.5rem] overflow-hidden flex flex-col justify-between shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 relative"
              >
                <div>
                  {/* Top Badge Cover & Emblem */}
                  <div className="relative h-44 bg-gradient-to-b from-black/60 to-card flex items-center justify-center p-6 overflow-hidden border-b border-border/50">
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />

                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-24 h-24 object-contain group-hover:scale-110 transition-transform duration-500 drop-shadow-2xl relative z-10"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground relative z-10">
                        <Trophy size={32} />
                      </div>
                    )}

                    {/* Category Pill */}
                    <div className="absolute top-4 right-4 z-10">
                      <span
                        className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border backdrop-blur-md ${cat.badge}`}
                      >
                        {cat.label}
                      </span>
                    </div>

                    {/* Code ID Pill */}
                    <div className="absolute top-4 left-4 z-10">
                      <span className="px-2.5 py-1 rounded-lg bg-black/60 border border-white/10 text-muted-foreground font-mono text-[9px] font-bold tracking-wider flex items-center gap-1">
                        <Code size={11} /> {item.codeId}
                      </span>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-6 space-y-3">
                    <h3 className="text-xl font-black text-foreground uppercase tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                      {item.name}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 min-h-[3.75rem]">
                      {item.description || "Belum ada instruksi spesifik untuk achievement ini."}
                    </p>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-6 pt-0">
                  <div className="grid grid-cols-2 gap-2 pt-4 border-t border-border/60">
                    <button
                      onClick={() => openEditModal(item)}
                      className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-foreground font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-border"
                    >
                      <Edit2 size={13} /> Edit Data
                    </button>
                    <button
                      onClick={() => handleDelete(item._id, item.name)}
                      className="py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-red-500/20"
                    >
                      <Trash2 size={13} /> Hapus
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-foreground/5 text-foreground/40 text-[10px] font-black uppercase tracking-widest border-b border-border">
                <tr>
                  <th className="px-8 py-5">Emblem</th>
                  <th className="px-8 py-5">Code ID</th>
                  <th className="px-8 py-5">Name & Description</th>
                  <th className="px-8 py-5">Category</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((item) => {
                  const cat = getCategoryMeta(item.category);
                  return (
                    <tr key={item._id} className="hover:bg-foreground/[0.02] transition-colors group">
                      {/* Emblem */}
                      <td className="px-8 py-4">
                        <div className="w-12 h-12 rounded-xl bg-black/40 border border-border/80 flex items-center justify-center overflow-hidden p-1">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                          ) : (
                            <Trophy size={18} className="text-muted-foreground" />
                          )}
                        </div>
                      </td>

                      {/* Code ID */}
                      <td className="px-8 py-4">
                        <span className="font-mono text-xs font-bold text-foreground bg-black/30 px-2.5 py-1 rounded-lg border border-border">
                          {item.codeId}
                        </span>
                      </td>

                      {/* Name & Description */}
                      <td className="px-8 py-4 max-w-md">
                        <p className="font-black text-foreground uppercase group-hover:text-primary transition-colors text-sm">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {item.description || "-"}
                        </p>
                      </td>

                      {/* Category */}
                      <td className="px-8 py-4">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${cat.badge}`}>
                          {cat.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-8 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(item)}
                            title="Edit Achievement"
                            className="p-2.5 rounded-xl bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors border border-border/60"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item._id, item.name)}
                            title="Hapus Achievement"
                            className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-colors border border-border/60"
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
      )}

      {/* 5. MODAL: CREATE / EDIT ACHIEVEMENT */}
      {formModal.open && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <form
            onSubmit={handleSubmit}
            className="bg-card border border-border p-6 md:p-10 rounded-[3rem] w-full max-w-xl shadow-2xl space-y-6 relative overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between relative z-10 border-b border-border/50 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-primary tracking-widest">
                  {formModal.mode === "create" ? "Registration Form" : "Modification Mode"}
                </span>
                <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">
                  {formModal.mode === "create" ? "New Achievement" : "Edit Achievement"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFormModal({ ...formModal, open: false })}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 relative z-10">
              {/* Category Selector Pills */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-accent-lilac uppercase tracking-widest ml-1">
                  Kategori Achievement *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CATEGORIES.map((cat) => {
                    const isSelected = formModal.data.category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() =>
                          setFormModal({
                            ...formModal,
                            data: { ...formModal.data, category: cat.id },
                          })
                        }
                        className={`p-3 rounded-2xl border text-center transition-all ${
                          isSelected
                            ? `${cat.bg} ${cat.color} ${cat.border} shadow-md`
                            : "bg-black/20 border-white/5 text-muted-foreground hover:border-white/20"
                        }`}
                      >
                        <p className="font-black text-xs uppercase">{cat.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Code ID & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-accent-lilac uppercase tracking-widest ml-1">
                    Code ID (Unique) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formModal.data.codeId}
                    onChange={(e) =>
                      setFormModal({
                        ...formModal,
                        data: {
                          ...formModal.data,
                          codeId: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""),
                        },
                      })
                    }
                    placeholder="HW_RUNNER"
                    className="w-full bg-black/20 border border-white/10 rounded-2xl p-3.5 text-foreground font-mono text-sm outline-none focus:border-accent-lilac transition-all"
                  />
                  <p className="text-[9px] text-muted-foreground ml-1">Hanya huruf besar, angka, dan underscore.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-accent-lilac uppercase tracking-widest ml-1">
                    Nama Badge *
                  </label>
                  <input
                    type="text"
                    required
                    value={formModal.data.name}
                    onChange={(e) =>
                      setFormModal({
                        ...formModal,
                        data: { ...formModal.data, name: e.target.value },
                      })
                    }
                    placeholder="Highway Runner"
                    className="w-full bg-black/20 border border-white/10 rounded-2xl p-3.5 text-foreground text-sm outline-none focus:border-accent-lilac transition-all"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-accent-lilac uppercase tracking-widest ml-1">
                  Deskripsi / Syarat Pencapaian
                </label>
                <textarea
                  rows={3}
                  value={formModal.data.description}
                  onChange={(e) =>
                    setFormModal({
                      ...formModal,
                      data: { ...formModal.data, description: e.target.value },
                    })
                  }
                  placeholder="Jelaskan instruksi atau target yang harus dicapai oleh driver..."
                  className="w-full bg-black/20 border border-white/10 rounded-2xl p-3.5 text-foreground text-sm outline-none focus:border-accent-lilac transition-all resize-none"
                />
              </div>

              {/* Emblem / Image Uploader with Preview */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-accent-lilac uppercase tracking-widest ml-1">
                  Emblem / Ikon Badge (WebP / GIF Nismara+)
                </label>

                {imagePreview ? (
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-black/20 border border-emerald-500/30">
                    <div className="w-16 h-16 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center p-2 overflow-hidden">
                      <img src={imagePreview} alt="Emblem Preview" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-foreground">Gambar Terpilih</p>
                      <p className="text-[10px] text-emerald-400">Siap diunggah ke Cloudflare R2 saat disimpan.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="px-3 py-2 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 rounded-xl text-xs font-black uppercase transition-all"
                    >
                      Hapus
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      disabled={isSubmitting}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-20"
                    />
                    <div className="w-full bg-black/20 border-2 border-dashed border-white/10 hover:border-accent-lilac/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 transition-colors">
                      <Upload size={24} className="text-muted-foreground" />
                      <p className="text-xs font-bold text-foreground">Klik atau Tarik Ikon Emblem ke Sini</p>
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
                    Menyimpan Achievement...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />{" "}
                    {formModal.mode === "create" ? "Authorize & Create Achievement" : "Save Badge Changes"}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setFormModal({ ...formModal, open: false })}
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
