"use client";

import React, { useState, useTransition } from "react";
import {
  Trophy,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Calendar,
  Layers,
  Search,
  Filter,
  Coins,
  Ticket,
  Fuel,
  Percent,
  Truck,
  Weight,
  Compass,
  Zap,
  ShieldCheck,
  Flame,
  ArrowRight,
  Clock,
  X,
  Loader2,
  RefreshCw,
  Globe,
} from "lucide-react";
import {
  createQuestTemplateAction,
  updateQuestTemplateAction,
  deleteQuestTemplateAction,
  toggleTemplateActiveAction,
  getQuestTemplatesAction,
  getActiveAndNextWeekPreviewAction,
} from "@/app/actions/nplusQuestManageActions";
import { showAlert, showConfirm } from "@/lib/dialog";
import { INplusQuestTemplate } from "@/lib/models/NplusQuestTemplate";

interface QuestManageClientProps {
  initialTemplates: any[];
  initialPreview: any;
}

const EMPTY_FORM: Partial<INplusQuestTemplate> = {
  title: "",
  description: "",
  type: "TOTAL_JOBS",
  target: 5,
  minCargoMass: 0,
  minDistanceKm: 0,
  difficulty: "MEDIUM",
  isActive: true,
  order: 0,
  reward: {
    type: "VOUCHER",
    title: "Kupon Diskon Servis 50%",
    amount: 0,
    voucherCategory: "FLEET_MAINTENANCE",
    voucherDiscountType: "percentage",
    voucherDiscountValue: 50,
    voucherDurationHours: 0,
    description: "Diskon 50% untuk biaya perawatan & servis armada.",
  },
};

export default function QuestManageClient({
  initialTemplates,
  initialPreview,
}: QuestManageClientProps) {
  const [templates, setTemplates] = useState<any[]>(initialTemplates);
  const [preview, setPreview] = useState<any>(initialPreview);
  const [isPending, startTransition] = useTransition();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [diffFilter, setDiffFilter] = useState("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<INplusQuestTemplate>>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const refreshAll = async () => {
    startTransition(async () => {
      const [tRes, pRes] = await Promise.all([
        getQuestTemplatesAction(),
        getActiveAndNextWeekPreviewAction(),
      ]);
      if (tRes.success) setTemplates(tRes.templates);
      if (pRes.success) setPreview(pRes);
    });
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (template: any) => {
    setEditingId(template._id);
    setFormData({
      title: template.title,
      description: template.description,
      type: template.type,
      target: template.target,
      minCargoMass: template.minCargoMass || 0,
      minDistanceKm: template.minDistanceKm || 0,
      difficulty: template.difficulty || "MEDIUM",
      isActive: template.isActive !== undefined ? template.isActive : true,
      order: template.order || 0,
      reward: { ...template.reward },
    });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (template: any) => {
    const newStatus = !template.isActive;
    try {
      const res = await toggleTemplateActiveAction(template._id, newStatus);
      if (res.success) {
        setTemplates((prev) =>
          prev.map((t) => (t._id === template._id ? { ...t, isActive: newStatus } : t))
        );
        refreshAll();
      } else {
        await showAlert(res.error || "Gagal mengubah status template.", "Gagal");
      }
    } catch (err: any) {
      await showAlert(err?.message || "Error saat mengubah status.", "Error");
    }
  };

  const handleDelete = async (template: any) => {
    const confirmed = await showConfirm(
      `Apakah Anda yakin ingin menghapus template quest "${template.title}"?`,
      "Hapus Template"
    );
    if (!confirmed) return;

    try {
      const res = await deleteQuestTemplateAction(template._id);
      if (res.success) {
        await showAlert("Template quest berhasil dihapus!", "Berhasil");
        setTemplates((prev) => prev.filter((t) => t._id !== template._id));
        refreshAll();
      } else {
        await showAlert(res.error || "Gagal menghapus template.", "Gagal");
      }
    } catch (err: any) {
      await showAlert(err?.message || "Error saat menghapus.", "Error");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.target || !formData.reward?.title) {
      await showAlert("Mohon lengkapi semua kolom wajib.", "Form Belum Lengkap");
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        const res = await updateQuestTemplateAction(editingId, formData);
        if (res.success) {
          await showAlert("Template quest berhasil diperbarui!", "Tersimpan");
          setIsModalOpen(false);
          refreshAll();
        } else {
          await showAlert(res.error || "Gagal memperbarui template.", "Gagal");
        }
      } else {
        const res = await createQuestTemplateAction(formData);
        if (res.success) {
          await showAlert("Template quest baru berhasil ditambahkan!", "Berhasil");
          setIsModalOpen(false);
          refreshAll();
        } else {
          await showAlert(res.error || "Gagal membuat template.", "Gagal");
        }
      }
    } catch (err: any) {
      await showAlert(err?.message || "Terjadi kesalahan sistem.", "Error");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper render icons & badges
  const getQuestIcon = (type: string) => {
    switch (type) {
      case "HEAVY_CARGO":
        return <Weight className="w-4 h-4 text-amber-400" />;
      case "LONG_HAUL":
        return <Compass className="w-4 h-4 text-cyan-400" />;
      case "TOTAL_DISTANCE":
        return <Zap className="w-4 h-4 text-indigo-400" />;
      case "PERFECT_DELIVERY":
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case "HARDCORE_JOB":
        return <Flame className="w-4 h-4 text-rose-400" />;
      case "TRUCKERSMP_JOB":
        return <Globe className="w-4 h-4 text-purple-400" />;
      default:
        return <Truck className="w-4 h-4 text-blue-400" />;
    }
  };

  const getRewardBadge = (reward: any) => {
    if (!reward) return null;
    switch (reward.type) {
      case "NC":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Coins className="w-3.5 h-3.5" /> +{reward.amount?.toLocaleString("id-ID")} NC
          </span>
        );
      case "SAFEBOX_TICKET":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Ticket className="w-3.5 h-3.5" /> {reward.amount}x Tiket Safebox
          </span>
        );
      case "FUEL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Fuel className="w-3.5 h-3.5" /> {reward.amount?.toLocaleString("id-ID")} L Fuel
          </span>
        );
      case "VOUCHER":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Percent className="w-3.5 h-3.5" /> {reward.title}
          </span>
        );
    }
  };

  const filteredTemplates = templates.filter((t) => {
    const matchSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === "ALL" || t.type === typeFilter;
    const matchDiff = diffFilter === "ALL" || t.difficulty === diffFilter;
    return matchSearch && matchType && matchDiff;
  });

  const activeCount = templates.filter((t) => t.isActive).length;

  return (
    <div className="space-y-8">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-extrabold uppercase rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/30 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Manager Portal
            </span>
            <span className="text-xs text-muted-foreground font-semibold">Nismara+ Systems</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3 mt-1">
            <Trophy className="text-amber-400 h-8 w-8 drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]" />
            Kelola Bank Template Quest Mingguan
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Atur kumpulan soal quest mingguan & variasi reward yang akan di-rolling secara otomatis tiap hari Senin 00:00 WIB.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refreshAll}
            className="p-3 rounded-2xl bg-secondary hover:bg-secondary/80 border border-border text-foreground transition-all hover:scale-105 active:scale-95"
            title="Muat ulang data"
          >
            <RefreshCw className={`w-5 h-5 ${isPending ? "animate-spin text-amber-400" : ""}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5" /> Buat Template Baru
          </button>
        </div>
      </div>

      {/* Ringkasan Status & Rolling Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Statistik Template */}
        <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bank Template</span>
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-3xl font-black text-foreground">{templates.length}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-emerald-400 font-bold">{activeCount} Aktif</span> dalam rotasi rolling mingguan
            </p>
          </div>
        </div>

        {/* Quest Aktif Minggu Ini */}
        <div className="bg-card border border-amber-400/30 bg-amber-400/5 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> Minggu Ini ({preview?.currentWeek?.weekInfo?.weekKey || "Aktif"})
            </span>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-400">
              Live
            </span>
          </div>
          <div className="space-y-1.5">
            {preview?.currentWeek?.activeDoc?.quests?.map((q: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0">
                <span className="font-bold text-foreground truncate max-w-[180px]">{q.title}</span>
                <span className="text-muted-foreground font-semibold">{q.target}x Target</span>
              </div>
            )) || <p className="text-xs text-muted-foreground">Belum ada data aktif.</p>}
          </div>
        </div>

        {/* Estimasi Rotasi Minggu Depan */}
        <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-400" /> Preview Minggu Depan ({preview?.nextWeek?.weekInfo?.weekKey || "Next"})
            </span>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400">
              Auto-Rolling
            </span>
          </div>
          <div className="space-y-1.5">
            {preview?.nextWeek?.previewQuests?.map((q: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0">
                <span className="font-bold text-foreground truncate max-w-[180px]">{q.title}</span>
                <span className="text-cyan-400 font-semibold">{q.difficulty}</span>
              </div>
            )) || <p className="text-xs text-muted-foreground">Belum ada template aktif.</p>}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari nama atau deskripsi quest..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none"
          >
            <option value="ALL">Semua Tipe Quest</option>
            <option value="TOTAL_JOBS">Total Pekerjaan</option>
            <option value="TRUCKERSMP_JOB">TruckersMP Multiplayer</option>
            <option value="HEAVY_CARGO">Heavy Cargo (≥20T)</option>
            <option value="LONG_HAUL">Long Haul (≥1000KM)</option>
            <option value="TOTAL_DISTANCE">Akumulasi Jarak (KM)</option>
            <option value="PERFECT_DELIVERY">Zero Damage (0%)</option>
            <option value="HARDCORE_JOB">Hardcore Mode</option>
          </select>

          <select
            value={diffFilter}
            onChange={(e) => setDiffFilter(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none"
          >
            <option value="ALL">Semua Kesulitan</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hardcore</option>
          </select>
        </div>
      </div>

      {/* Tabel Daftar Template Quest */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase font-extrabold text-muted-foreground tracking-wider">
              <tr>
                <th className="py-4 px-6">Quest Info</th>
                <th className="py-4 px-6">Tipe & Target</th>
                <th className="py-4 px-6">Kesulitan</th>
                <th className="py-4 px-6">Hadiah Reward</th>
                <th className="py-4 px-6">Status Pool</th>
                <th className="py-4 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredTemplates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                    Tidak ada template quest yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredTemplates.map((template) => (
                  <tr key={template._id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-4 px-6 space-y-1">
                      <div className="font-bold text-foreground flex items-center gap-2">
                        {getQuestIcon(template.type)}
                        {template.title}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 max-w-sm">
                        {template.description}
                      </p>
                    </td>

                    <td className="py-4 px-6">
                      <div className="font-bold text-foreground text-xs">
                        Target: {template.target.toLocaleString("id-ID")}{" "}
                        {template.type === "TOTAL_DISTANCE" ? "KM" : "Job"}
                      </div>
                      {template.minCargoMass > 0 && (
                        <p className="text-[11px] text-amber-400">Min. {template.minCargoMass} Ton</p>
                      )}
                      {template.minDistanceKm > 0 && (
                        <p className="text-[11px] text-cyan-400">Min. {template.minDistanceKm} KM</p>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full border ${
                          template.difficulty === "EASY"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : template.difficulty === "HARD"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {template.difficulty}
                      </span>
                    </td>

                    <td className="py-4 px-6">{getRewardBadge(template.reward)}</td>

                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleToggleActive(template)}
                        className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          template.isActive
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                            : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
                        }`}
                      >
                        {template.isActive ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Aktif
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" /> Nonaktif
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(template)}
                        className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                        title="Edit Template"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(template)}
                        className="p-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
                        title="Hapus Template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Buat / Edit Template */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-xl font-black text-foreground">
                  {editingId ? "Edit Template Quest" : "Buat Template Quest Baru"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Konfigurasikan syarat quest dan hadiah yang akan diperoleh driver.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              {/* Form Baris 1: Judul & Kesulitan */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Judul Quest *</label>
                  <input
                    type="text"
                    required
                    value={formData.title || ""}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Contoh: Heavy Cargo Specialist"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Tingkat Kesulitan</label>
                  <select
                    value={formData.difficulty || "MEDIUM"}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 font-bold"
                  >
                    <option value="EASY">🟢 Easy</option>
                    <option value="MEDIUM">🟡 Medium</option>
                    <option value="HARD">🔴 Hardcore</option>
                  </select>
                </div>
              </div>

              {/* Form Baris 2: Deskripsi */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Deskripsi Tugas *</label>
                <textarea
                  required
                  rows={2}
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Contoh: Selesaikan 3 pekerjaan dengan muatan kargo berbobot minimal 20 Ton."
                  className="w-full px-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>

              {/* Form Baris 3: Tipe Quest & Parameter Target */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-secondary/30 border border-border">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Tipe Quest *</label>
                  <select
                    value={formData.type || "TOTAL_JOBS"}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none"
                  >
                    <option value="TOTAL_JOBS">📦 Total Pekerjaan</option>
                    <option value="TRUCKERSMP_JOB">🌐 TruckersMP Multiplayer (Job)</option>
                    <option value="HEAVY_CARGO">🏋️ Heavy Cargo (Ton)</option>
                    <option value="LONG_HAUL">🛣️ Long Haul (KM)</option>
                    <option value="TOTAL_DISTANCE">⚡ Akumulasi Jarak (KM)</option>
                    <option value="PERFECT_DELIVERY">🛡️ Perfect Delivery (0% Damage)</option>
                    <option value="HARDCORE_JOB">🎯 Hardcore Mode</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Target Angka * ({formData.type === "TOTAL_DISTANCE" ? "KM" : "Jumlah Job"})
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.target || 1}
                    onChange={(e) => setFormData({ ...formData, target: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 font-black"
                  />
                </div>

                {formData.type === "HEAVY_CARGO" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-amber-400">Min. Berat (Ton) *</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.minCargoMass || 20}
                      onChange={(e) => setFormData({ ...formData, minCargoMass: Number(e.target.value) })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 font-bold"
                    />
                  </div>
                )}

                {formData.type === "LONG_HAUL" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-cyan-400">Min. Jarak (KM) *</label>
                    <input
                      type="number"
                      min={100}
                      value={formData.minDistanceKm || 1000}
                      onChange={(e) => setFormData({ ...formData, minDistanceKm: Number(e.target.value) })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 font-bold"
                    />
                  </div>
                )}
              </div>

              {/* Form Bagian 4: Pengaturan Hadiah (Reward) */}
              <div className="space-y-4 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Pengaturan Hadiah (Reward)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Tipe Hadiah *</label>
                    <select
                      value={formData.reward?.type || "VOUCHER"}
                      onChange={(e) => {
                        const newType = e.target.value as any;
                        setFormData({
                          ...formData,
                          reward: {
                            ...formData.reward!,
                            type: newType,
                            title:
                              newType === "NC"
                                ? "10.000 Nismara Coin"
                                : newType === "SAFEBOX_TICKET"
                                ? "3x Tiket Safebox Penebusan Penalti"
                                : newType === "FUEL"
                                ? "2.500 Liter Bahan Bakar"
                                : "Kupon Diskon Servis 50%",
                            amount: newType === "NC" ? 10000 : newType === "SAFEBOX_TICKET" ? 3 : newType === "FUEL" ? 2500 : 0,
                          },
                        });
                      }}
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none"
                    >
                      <option value="VOUCHER">🎟️ Voucher Diskon / Booster</option>
                      <option value="NC">🪙 Nismara Coin (NC)</option>
                      <option value="SAFEBOX_TICKET">🛡️ Tiket Safebox Penebusan Penalti</option>
                      <option value="FUEL">⛽ Bahan Bakar Garasi (Liter)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Label Judul Hadiah *</label>
                    <input
                      type="text"
                      required
                      value={formData.reward?.title || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reward: { ...formData.reward!, title: e.target.value },
                        })
                      }
                      placeholder="Contoh: Voucher Diskon Servis 50%"
                      className="w-full px-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>

                {/* Khusus NC / Tiket / Fuel */}
                {formData.reward?.type !== "VOUCHER" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Jumlah Hadiah (Nominal) *</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={formData.reward?.amount || 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reward: { ...formData.reward!, amount: Number(e.target.value) },
                        })
                      }
                      className="w-full px-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none font-black"
                    />
                  </div>
                )}

                {/* Khusus Voucher */}
                {formData.reward?.type === "VOUCHER" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-foreground">Kategori Voucher</label>
                      <select
                        value={formData.reward?.voucherCategory || "FLEET_MAINTENANCE"}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            reward: { ...formData.reward!, voucherCategory: e.target.value as any },
                          })
                        }
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-bold"
                      >
                        <option value="FLEET_MAINTENANCE">Servis Armada</option>
                        <option value="FLEET_BUY">Pembelian Fleet</option>
                        <option value="NC_BOOSTER">Booster NC</option>
                        <option value="MARKET_MOD">Mod Market</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-foreground">Diskon (%)</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={formData.reward?.voucherDiscountValue || 50}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            reward: { ...formData.reward!, voucherDiscountValue: Number(e.target.value) },
                          })
                        }
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-bold"
                      />
                    </div>

                    {formData.reward?.voucherCategory === "NC_BOOSTER" && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-foreground">Durasi Booster (Jam)</label>
                        <input
                          type="number"
                          min={1}
                          value={formData.reward?.voucherDurationHours || 6}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              reward: { ...formData.reward!, voucherDurationHours: Number(e.target.value) },
                            })
                          }
                          className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-bold"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Form Baris 5: Status Pool & Order */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span className="text-xs font-bold text-foreground">
                    Aktifkan dalam pool rolling mingguan
                  </span>
                </label>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                      </>
                    ) : (
                      "Simpan Template"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
