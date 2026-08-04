"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Trophy, Search, Upload, Code, Tag } from "lucide-react";
import { compressImageToWebP } from "@/lib/imageUtils";

const CATEGORIES = [
  { id: "weekly", label: "Weekly", color: "text-blue-400", bg: "bg-blue-500/20 border-blue-500/30" },
  { id: "monthly", label: "Monthly", color: "text-purple-400", bg: "bg-purple-500/20 border-purple-500/30" },
  { id: "yearly", label: "Yearly", color: "text-amber-400", bg: "bg-amber-500/20 border-amber-500/30" },
  { id: "event", label: "Event", color: "text-green-400", bg: "bg-green-500/20 border-green-500/30" },
];

export default function AchievementManagerClient() {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Create/Edit Modal
  const [formModal, setFormModal] = useState<{ open: boolean; mode: "create" | "edit"; data: any }>({
    open: false,
    mode: "create",
    data: { codeId: "", name: "", description: "", imageUrl: "", category: "weekly" },
  });

  // Delete Modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string | null; name: string }>({
    open: false,
    id: null,
    name: "",
  });

  const fetchAchievements = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/manage/achievements");
      const data = await res.json();
      if (data.success) {
        setAchievements(data.achievements);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const isEdit = formModal.mode === "edit";
      let imageUrl = formModal.data.imageUrl;

      // Upload gambar ke R2 jika ada file baru
      if (imageFile) {
        const compressedImage = await compressImageToWebP(imageFile, 0.8, 512);

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

        if (presignRes.ok) {
          const { signedUrl, publicUrl } = await presignRes.json();
          const uploadRes = await fetch(signedUrl, {
            method: "PUT",
            headers: { "Content-Type": compressedImage.type },
            body: compressedImage,
          });

          if (uploadRes.ok) {
            imageUrl = publicUrl;
          } else {
            alert("Gagal mengupload gambar ke server");
            setIsSubmitting(false);
            return;
          }
        } else {
          alert("Gagal mendapatkan presigned URL");
          setIsSubmitting(false);
          return;
        }
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
      if (result.success) {
        setFormModal({
          open: false,
          mode: "create",
          data: { codeId: "", name: "", description: "", imageUrl: "", category: "weekly" },
        });
        setImageFile(null);
        setImagePreview(null);
        fetchAchievements();
      } else {
        alert(result.error || "Gagal menyimpan achievement");
      }
    } catch {
      alert("Terjadi kesalahan sistem");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.id) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/manage/achievements/${deleteModal.id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (result.success) {
        setDeleteModal({ open: false, id: null, name: "" });
        fetchAchievements();
      } else {
        alert(result.error || "Gagal menghapus achievement");
      }
    } catch {
      alert("Terjadi kesalahan sistem");
    } finally {
      setIsSubmitting(false);
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
        category: item.category,
      },
    });
  };

  const getCategoryStyle = (cat: string) => {
    return CATEGORIES.find((c) => c.id === cat) || CATEGORIES[0];
  };

  const filtered = achievements.filter((a) => {
    const matchFilter = filter === "all" || a.category === filter;
    const matchSearch =
      search === "" ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.codeId.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <main className="p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white mb-2">Manage Achievement</h1>
          <p className="text-gray-400 text-sm">
            Kelola seluruh achievement yang tersedia di Nismara Logistics.
          </p>
        </div>
        <button
          onClick={() =>
            setFormModal({
              open: true,
              mode: "create",
              data: { codeId: "", name: "", description: "", imageUrl: "", category: "weekly" },
            })
          }
          className="inline-flex items-center gap-2 px-6 py-3 bg-accent-lilac text-white font-bold rounded-xl hover:bg-accent-lilac/80 transition-colors shadow-lg shadow-accent-lilac/20"
        >
          <Plus className="w-5 h-5" /> Buat Achievement
        </button>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
              filter === "all"
                ? "bg-accent-lilac text-white"
                : "bg-black/50 text-gray-400 hover:bg-black/80"
            }`}
          >
            SEMUA ({achievements.length})
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                filter === cat.id
                  ? "bg-accent-lilac text-white"
                  : "bg-black/50 text-gray-400 hover:bg-black/80"
              }`}
            >
              {cat.label.toUpperCase()} (
              {achievements.filter((a) => a.category === cat.id).length})
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari achievement..."
            className="pl-10 pr-4 py-2 bg-black/50 border border-border/50 rounded-xl text-white text-sm focus:outline-none focus:border-accent-lilac w-full sm:w-64"
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
          <Trophy className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-300">
            {search ? "Tidak ditemukan" : "Belum Ada Achievement"}
          </h3>
          <p className="text-gray-500">
            {search ? "Coba kata kunci lain." : "Buat achievement pertama untuk driver Anda."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => {
            const catStyle = getCategoryStyle(item.category);
            return (
              <div
                key={item._id}
                className="bg-card/50 border border-border/50 rounded-2xl overflow-hidden flex flex-col group hover:border-accent-lilac/30 transition-colors"
              >
                {/* Image */}
                <div className="h-40 bg-black/50 relative flex items-center justify-center">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Trophy className="w-16 h-16 text-gray-700" />
                  )}
                  <div className="absolute top-3 right-3">
                    <span
                      className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border backdrop-blur-md ${catStyle.bg} ${catStyle.color}`}
                    >
                      {catStyle.label}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <Code className="w-3 h-3 text-gray-500" />
                    <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">
                      {item.codeId}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">
                    {item.name}
                  </h3>
                  <p className="text-xs text-gray-400 mb-4 line-clamp-2 flex-1">
                    {item.description}
                  </p>

                  <div className="flex gap-2 pt-4 border-t border-border/30">
                    <button
                      onClick={() => openEditModal(item)}
                      className="flex-1 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" /> Edit
                    </button>
                    <button
                      onClick={() =>
                        setDeleteModal({ open: true, id: item._id, name: item.name })
                      }
                      className="flex-1 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Hapus
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {formModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-6">
              {formModal.mode === "create" ? "Buat Achievement Baru" : "Edit Achievement"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    <Code className="w-3 h-3 inline mr-1" />
                    Code ID <span className="text-red-500">*</span>
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
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-accent-lilac"
                    placeholder="Contoh: HW_RUNNER"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    <Tag className="w-3 h-3 inline mr-1" />
                    Kategori <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formModal.data.category}
                    onChange={(e) =>
                      setFormModal({
                        ...formModal,
                        data: { ...formModal.data, category: e.target.value },
                      })
                    }
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-accent-lilac"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Nama Achievement <span className="text-red-500">*</span>
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
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-accent-lilac"
                  placeholder="Contoh: Highway Runner"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Deskripsi</label>
                <textarea
                  value={formModal.data.description}
                  onChange={(e) =>
                    setFormModal({
                      ...formModal,
                      data: { ...formModal.data, description: e.target.value },
                    })
                  }
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-accent-lilac min-h-[80px]"
                  placeholder="Jelaskan cara mendapatkan achievement ini..."
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  <Upload className="w-3 h-3 inline mr-1" />
                  Gambar / Ikon Achievement
                </label>
                <div className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center hover:border-accent-lilac/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    id="achievement-image"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 3 * 1024 * 1024) {
                          alert("Ukuran gambar maksimal 3MB");
                          return;
                        }
                        setImageFile(file);
                        setImagePreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                  <label htmlFor="achievement-image" className="cursor-pointer flex flex-col items-center gap-2">
                    {imagePreview ? (
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-black/50 border border-white/10">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <Upload className="w-8 h-8 text-gray-600" />
                    )}
                    <span className="text-accent-lilac font-bold text-sm">
                      {imagePreview ? "Ganti Gambar" : "Pilih Gambar"}
                    </span>
                    <span className="text-gray-500 text-xs">PNG, JPG up to 3MB (auto WebP)</span>
                  </label>
                </div>
                {imageFile && (
                  <p className="mt-2 text-xs text-green-400">✓ Terpilih: {imageFile.name}</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setFormModal({
                      open: false,
                      mode: "create",
                      data: { codeId: "", name: "", description: "", imageUrl: "", category: "weekly" },
                    })
                  }
                  className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-accent-lilac hover:bg-accent-lilac/80 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Menyimpan..."
                    : formModal.mode === "create"
                    ? "Buat Achievement"
                    : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md p-6">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4 text-red-500">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Hapus Achievement?</h3>
            <p className="text-sm text-gray-400 mb-6">
              Apakah Anda yakin ingin menghapus achievement{" "}
              <strong className="text-white">"{deleteModal.name}"</strong>? Aksi ini tidak
              dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, id: null, name: "" })}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
