"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Image as ImageIcon } from "lucide-react";
import dynamic from "next/dynamic";
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });
import { showAlert } from "@/lib/dialog";
import { compressImageToWebP } from "@/lib/imageUtils";

export default function KBEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [order, setOrder] = useState(0);
  const [accessLevel, setAccessLevel] = useState("public");
  const [coverImage, setCoverImage] = useState("");
  
  const [categories, setCategories] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(editId ? true : false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchCategories();
    if (editId) fetchArticle();
  }, [editId]);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/kb/categories");
      const data = await res.json();
      if (data.success && data.categories) {
        setCategories(data.categories);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchArticle = async () => {
    try {
      // Temporary fetch all from manager API and find the one.
      // Better to have a specific GET /api/manager/kb/[id] but this works for now.
      const res = await fetch("/api/manager/kb");
      const data = await res.json();
      if (data.success) {
        const article = data.articles.find((a: any) => a._id === editId);
        if (article) {
          setTitle(article.title);
          setDescription(article.description || "");
          setContent(article.content);
          setCategory(article.category);
          setOrder(article.order || 0);
          setAccessLevel(article.accessLevel);
          setCoverImage(article.coverImage || "");
          setImagePreview(article.coverImage || null);
        } else {
          showAlert("Artikel tidak ditemukan", "error");
          router.push("/dashboard/manage/kb");
        }
      }
    } catch (e) {
      console.error(e);
      showAlert("Gagal mengambil artikel", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (file.size > 5 * 1024 * 1024) {
        showAlert("Ukuran gambar maksimal 5MB!", "error");
        return;
      }

      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !content || !category) {
      showAlert("Mohon lengkapi Judul, Deskripsi, Kategori, dan Isi Artikel!", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      let finalImageUrl = coverImage;

      // Handle Image Upload using R2 approach
      if (imageFile) {
        setIsUploading(true);
        const compressedFile = await compressImageToWebP(imageFile);
        const formData = new FormData();
        formData.append("file", compressedFile);
        formData.append("folder", "kb-covers");
        // We reuse the existing generic upload endpoint from the project (if standard) 
        // Or if the project uses a specific one, we assume /api/upload
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalImageUrl = uploadData.url;
        } else {
          showAlert("Gagal mengunggah gambar kover", "error");
          setIsSubmitting(false);
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      }

      const payload = {
        title,
        description,
        content,
        category,
        order,
        accessLevel,
        coverImage: finalImageUrl,
      };

      const url = editId ? `/api/manager/kb/${editId}` : "/api/manager/kb";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showAlert(editId ? "Artikel berhasil diperbarui!" : "Artikel berhasil diterbitkan!");
        router.push("/dashboard/manage/kb");
        router.refresh();
      } else {
        showAlert(`Gagal menyimpan: ${data.error}`, "error");
      }
    } catch (e) {
      console.error(e);
      showAlert("Terjadi kesalahan sistem", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-20 text-muted-foreground">Memuat editor...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/manage/kb" className="p-2 bg-card border border-border rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{editId ? "Edit Artikel" : "Tulis Artikel Baru"}</h1>
          <p className="text-sm text-muted-foreground">Mendukung format Markdown untuk penulisan.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card/50 border border-border/50 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">Judul Artikel</label>
            <input
              type="text"
              required
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Contoh: Peraturan Konvoi Resmi Nismara"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">Deskripsi Singkat</label>
            <textarea
              required
              rows={2}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              placeholder="Deskripsi singkat yang akan muncul di daftar kategori (Maksimal 150 karakter)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={150}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-foreground">Kategori</label>
                <Link href="/dashboard/manage/kb/categories" className="text-[10px] text-primary font-bold uppercase tracking-widest hover:underline">
                  Kelola Kategori
                </Link>
              </div>
              <select
                required
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="" disabled>Pilih Kategori...</option>
                {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Urutan Artikel (Order)</label>
              <input
                type="number"
                required
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Hak Akses</label>
              <select
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value)}
              >
                <option value="public">Public (Semua Orang)</option>
                <option value="driver">Driver (Member Nismara)</option>
                <option value="manager">Manager (Staff Only)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground block">Gambar Kover (Opsional)</label>
            <div className="flex items-start gap-6">
              <div 
                className="w-40 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-background overflow-hidden relative group cursor-pointer"
                onClick={() => document.getElementById('cover-upload')?.click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Cover Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground group-hover:text-primary transition-colors">
                    <ImageIcon className="w-6 h-6 mb-1" />
                    <span className="text-xs font-semibold">Pilih Kover</span>
                  </div>
                )}
                {imagePreview && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                    Ganti
                  </div>
                )}
              </div>
              <input 
                type="file" 
                id="cover-upload" 
                accept="image/png, image/jpeg, image/jpg" 
                className="hidden"
                onChange={handleImageChange}
              />
              <div className="text-xs text-muted-foreground max-w-xs pt-2">
                Format: JPG, PNG. Max: 5MB.<br/>Akan otomatis dikompresi menjadi WebP saat diunggah.
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-border/30">
            <label className="text-sm font-bold text-foreground flex items-center justify-between">
              Isi Artikel (Markdown)
              <a href="https://www.markdownguide.org/cheat-sheet/" target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline font-normal">Panduan Markdown</a>
            </label>
            <div data-color-mode="dark" className="mt-2 rounded-xl overflow-hidden border border-border/50">
  <MDEditor
    value={content}
    onChange={(val) => setContent(val || "")}
    height={500}
    style={{ backgroundColor: "transparent" }}
  />
</div>
          </div>

        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting || isUploading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> {isUploading ? "Mengunggah Gambar..." : "Menyimpan..."}</>
            ) : (
              <><Save className="w-5 h-5" /> {editId ? "Simpan Perubahan" : "Terbitkan Artikel"}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
