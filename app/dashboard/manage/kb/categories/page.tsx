"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Save, Trash2, Edit } from "lucide-react";
import { showConfirm, showAlert } from "@/lib/dialog";
import { useRouter } from "next/navigation";

export default function ManageKBCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", order: 0, accessLevel: "public" });
  
  const router = useRouter();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/manager/kb/categories", {
        cache: "no-store",
        headers: { "Pragma": "no-cache", "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return showAlert("Nama kategori harus diisi", "error");

    try {
      const url = editingId 
        ? `/api/manager/kb/categories/${editingId}`
        : "/api/manager/kb/categories";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Pragma": "no-cache",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        showAlert(editingId ? "Kategori diperbarui!" : "Kategori dibuat!");
        setEditingId(null);
        setFormData({ name: "", order: 0, accessLevel: "public" });
        await fetchCategories();
        router.refresh();
      } else {
        showAlert(`Gagal: ${data.error}`, "error");
      }
    } catch (e) {
      showAlert("Terjadi kesalahan jaringan", "error");
    }
  };

  const handleEdit = (cat: any) => {
    setEditingId(cat._id);
    setFormData({ name: cat.name, order: cat.order || 0, accessLevel: cat.accessLevel || "public" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ name: "", order: 0, accessLevel: "public" });
  };

  const handleDelete = async (id: string, name: string) => {
    if (await showConfirm(`Yakin ingin menghapus kategori "${name}"? Pastikan tidak ada artikel yang terikat!`)) {
      try {
        const res = await fetch(`/api/manager/kb/categories/${id}`, {
          method: "DELETE",
          headers: { "Pragma": "no-cache", "Cache-Control": "no-cache" },
        });
        const data = await res.json();
        if (data.success) {
          setCategories(categories.filter(c => c._id !== id));
          showAlert("Kategori berhasil dihapus!");
          await fetchCategories();
          router.refresh();
        } else {
          showAlert(`Gagal: ${data.error}`, "error");
        }
      } catch (e) {
        showAlert("Terjadi kesalahan jaringan", "error");
      }
    }
  };

  const getAccessBadge = (level: string) => {
    if (level === "manager") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
          Manager
        </span>
      );
    }
    if (level === "driver") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
          Driver
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">
        Public
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard/manage/kb"
          className="p-2 bg-card border border-border rounded-lg hover:bg-card/80 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Kelola Kategori KB
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Atur nama, level akses (RAC), dan urutan kategori Knowledge Base.</p>
        </div>
      </div>

      <div className="bg-card/50 border border-border/50 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold mb-4">{editingId ? "Edit Kategori" : "Tambah Kategori Baru"}</h2>
        <form onSubmit={handleSave} className="flex flex-col sm:flex-row gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[200px] space-y-2 w-full">
            <label className="text-sm font-bold text-muted-foreground">Nama Kategori</label>
            <input 
              type="text" 
              required
              className="w-full bg-background border border-input rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Contoh: Peraturan Keanggotaan"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="w-full sm:w-44 space-y-2">
            <label className="text-sm font-bold text-muted-foreground">Level Akses (RAC)</label>
            <select
              value={formData.accessLevel}
              onChange={(e) => setFormData({...formData, accessLevel: e.target.value})}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="public">🌐 Public (Semua)</option>
              <option value="driver">🚗 Driver Only</option>
              <option value="manager">🛡️ Manager Only</option>
            </select>
          </div>
          <div className="w-full sm:w-28 space-y-2">
            <label className="text-sm font-bold text-muted-foreground">Order</label>
            <input 
              type="number" 
              required
              className="w-full bg-background border border-input rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={formData.order}
              onChange={(e) => setFormData({...formData, order: parseInt(e.target.value) || 0})}
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {editingId && (
              <button 
                type="button"
                onClick={handleCancelEdit}
                className="bg-muted text-muted-foreground hover:bg-muted/80 px-4 py-2 rounded-xl text-sm font-bold transition-all w-full sm:w-auto"
              >
                Batal
              </button>
            )}
            <button 
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
            >
              {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editingId ? "Simpan" : "Tambah"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-card/50 border border-border/50 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-bold w-16 text-center">Order</th>
              <th className="px-6 py-4 font-bold">Nama Kategori</th>
              <th className="px-6 py-4 font-bold">Akses (RAC)</th>
              <th className="px-6 py-4 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                  Memuat data...
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                  Belum ada kategori.
                </td>
              </tr>
            ) : (
              categories.map((cat, idx) => (
                <tr key={cat._id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                  <td className="px-6 py-4 font-black text-center text-primary">{cat.order}</td>
                  <td className="px-6 py-4 font-semibold">{cat.name}</td>
                  <td className="px-6 py-4">{getAccessBadge(cat.accessLevel || "public")}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={() => handleEdit(cat)}
                      className="text-muted-foreground hover:text-primary transition-colors p-2 bg-card hover:bg-primary/10 rounded-lg inline-block"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(cat._id, cat.name)}
                      className="text-muted-foreground hover:text-red-500 transition-colors p-2 bg-card hover:bg-red-500/10 rounded-lg inline-block"
                      title="Hapus"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
