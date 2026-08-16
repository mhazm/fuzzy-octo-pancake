"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Upload } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { compressImageToWebP } from "@/lib/imageUtils";

export default function EditMarketItem() {
  const router = useRouter();
  const { id } = useParams();
  const { data: session } = useSession();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    price: 0,
    game_id: 1,
    game_version: "",
    download_url: "",
    categories: [] as string[],
    isPublished: true,
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  const categoriesList = [
    { id: "vehicle", label: "Vehicle" },
    { id: "trailer", label: "Trailer" },
    { id: "map", label: "Map" },
    { id: "sound", label: "Sound" },
    { id: "vehicle_part", label: "Vehicle Part" },
    { id: "skin", label: "Skin" },
    { id: "other", label: "Other" },
  ];

  useEffect(() => {
    if (session) {
      fetchItem();
    }
  }, [id, session]);

  const fetchItem = async () => {
    try {
      const res = await fetch(`/api/market/${id}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Gagal mengambil data");
      
      if (data.sellerId !== session?.user?.discordId) {
        throw new Error("Anda tidak memiliki akses untuk mengedit mod ini");
      }

      setFormData({
        title: data.title || "",
        slug: data.slug || "",
        description: data.description || "",
        price: data.price || 0,
        game_id: data.game_id || 1,
        game_version: data.game_version || "",
        download_url: data.download_url || "",
        categories: data.categories || [],
        isPublished: data.isPublished !== false,
      });
      setExistingImages(data.images?.length > 0 ? data.images : (data.image_url ? [data.image_url] : []));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  };

  const handleCategoryToggle = (catId: string) => {
    setFormData((prev) => {
      if (prev.categories.includes(catId)) {
        return { ...prev, categories: prev.categories.filter((c) => c !== catId) };
      } else {
        return { ...prev, categories: [...prev.categories, catId] };
      }
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (existingImages.length + imageFiles.length + files.length > 3) {
      setError("Maksimal hanya 3 gambar preview yang diizinkan (termasuk gambar yang sudah ada).");
      return;
    }

    const isNismaraPlus = (session?.user as any)?.nismaraplus?.status === true;
    const maxSizeMB = isNismaraPlus ? 5 : 3;
    const newValidFiles: File[] = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        setError(`File ${file.name} bukan gambar.`);
        return;
      }
      if (!isNismaraPlus && file.type === "image/gif") {
        setError(`File ${file.name} adalah GIF. Hanya member Nismara+ yang diizinkan mengunggah GIF.`);
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`Ukuran gambar ${file.name} melebihi maksimal ${maxSizeMB}MB`);
        return;
      }
      newValidFiles.push(file);
    }

    setImageFiles((prev) => [...prev, ...newValidFiles]);
    setError("");
    e.target.value = ""; // reset input
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (formData.categories.length === 0) {
        throw new Error("Pilih setidaknya satu kategori");
      }

      let finalImageUrls = [...existingImages];

      // Upload image to R2 if selected new ones
      for (const file of imageFiles) {
        let fileToUpload = file;
        
        // Kompresi jika bukan GIF
        if (file.type !== "image/gif") {
          fileToUpload = await compressImageToWebP(file, 1, 1920);
        }
        
        const reqData = {
          fileName: fileToUpload.name,
          fileType: fileToUpload.type,
          folder: "market",
          fileSize: fileToUpload.size,
        };
        
        const presignRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reqData),
        });
        
        if (presignRes.ok) {
          const { signedUrl, publicUrl } = await presignRes.json();
          // Upload file directly to R2
          const s3Res = await fetch(signedUrl, {
            method: "PUT",
            headers: { "Content-Type": fileToUpload.type },
            body: fileToUpload,
          });

          if (s3Res.ok) {
            finalImageUrls.push(publicUrl);
          } else {
            console.warn(`Upload ke R2 gagal untuk file ${file.name}`);
          }
        } else {
          console.warn(`Gagal mendapatkan presigned URL untuk file ${file.name}`);
        }
      }

      const res = await fetch(`/api/market/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...formData, 
          images: finalImageUrls,
          image_url: finalImageUrls[0] || ""
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.push("/dashboard/my-market");
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin w-10 h-10 border-4 border-accent-lilac/20 border-t-accent-lilac rounded-full"></div>
      </div>
    );
  }

  return (
    <main className="p-6 max-w-4xl mx-auto w-full">
      <Link href="/dashboard/my-market" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </Link>
      
      <h1 className="text-3xl font-black text-white mb-8">Edit Mod</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-card/50 p-6 md:p-8 rounded-2xl border border-border/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Judul Mod <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => {
                const title = e.target.value;
                const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                setFormData({ ...formData, title, slug });
              }}
              className="w-full bg-black/30 border border-border/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-lilac transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">URI / Slug <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
              className="w-full bg-black/30 border border-border/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-lilac transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Game <span className="text-red-500">*</span></label>
            <select
              value={formData.game_id}
              onChange={(e) => setFormData({ ...formData, game_id: Number(e.target.value) })}
              className="w-full bg-black/30 border border-border/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-lilac transition-colors"
            >
              <option value={1}>Euro Truck Simulator 2</option>
              <option value={2}>American Truck Simulator</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Versi Game</label>
            <input
              type="text"
              value={formData.game_version}
              onChange={(e) => setFormData({ ...formData, game_version: e.target.value })}
              className="w-full bg-black/30 border border-border/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-lilac transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">Kategori (Pilih minimal 1) <span className="text-red-500">*</span></label>
          <div className="flex flex-wrap gap-2">
            {categoriesList.map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => handleCategoryToggle(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                  formData.categories.includes(cat.id)
                    ? "bg-accent-lilac text-white border-accent-lilac"
                    : "bg-black/30 text-gray-400 border-border/50 hover:border-gray-500"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Harga (NC)</label>
            <input
              type="number"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
              className="w-full bg-black/30 border border-border/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-lilac transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Link Download <span className="text-red-500">*</span></label>
            <input
              type="url"
              required
              value={formData.download_url}
              onChange={(e) => setFormData({ ...formData, download_url: e.target.value })}
              className="w-full bg-black/30 border border-border/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-lilac transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">Status Publikasi</label>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublished"
              checked={formData.isPublished}
              onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
              className="w-5 h-5 accent-accent-lilac"
            />
            <label htmlFor="isPublished" className="text-white cursor-pointer">Tampilkan di Market Publik</label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">Gambar Preview (Maksimal 3) <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {existingImages.map((url, idx) => (
              <div key={`exist-${idx}`} className="relative aspect-video rounded-xl overflow-hidden border border-border/50 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Existing Preview ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeExistingImage(idx)}
                  className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="sr-only">Hapus</span>
                  &times;
                </button>
              </div>
            ))}
            {imageFiles.map((file, idx) => (
              <div key={`new-${idx}`} className="relative aspect-video rounded-xl overflow-hidden border border-border/50 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(file)} alt={`New Preview ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeNewImage(idx)}
                  className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="sr-only">Hapus</span>
                  &times;
                </button>
              </div>
            ))}
            
            {(existingImages.length + imageFiles.length) < 3 && (
              <div className="border-2 border-dashed border-border/50 rounded-xl flex flex-col items-center justify-center p-6 text-center hover:border-accent-lilac/50 transition-colors aspect-video">
                <input
                  type="file"
                  accept="image/*"
                  id="image-upload"
                  className="hidden"
                  multiple
                  onChange={handleImageChange}
                />
                <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center w-full h-full justify-center">
                  <Upload className="w-8 h-8 text-gray-500 mb-2" />
                  <span className="text-accent-lilac font-bold mb-1 text-sm">Tambah Gambar</span>
                  <span className="text-gray-500 text-[10px]">PNG, JPG (Max 3MB)</span>
                </label>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">Deskripsi Mod <span className="text-red-500">*</span></label>
          <textarea
            required
            rows={6}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-black/30 border border-border/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-lilac transition-colors resize-y"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-4 bg-accent-lilac text-white font-bold rounded-xl hover:bg-accent-lilac/80 transition-colors shadow-lg shadow-accent-lilac/20 disabled:opacity-50"
        >
          {loading ? "Menyimpan..." : <><Save className="w-5 h-5" /> Simpan Perubahan</>}
        </button>
      </form>
    </main>
  );
}
