"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Upload } from "lucide-react";
import Link from "next/link";
import { compressImageToWebP } from "@/lib/imageUtils";

export default function CreateMarketItem() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const categoriesList = [
    { id: "vehicle", label: "Vehicle" },
    { id: "trailer", label: "Trailer" },
    { id: "map", label: "Map" },
    { id: "sound", label: "Sound" },
    { id: "vehicle_part", label: "Vehicle Part" },
    { id: "skin", label: "Skin" },
    { id: "other", label: "Other" },
  ];

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
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        setError("Ukuran gambar maksimal 3MB");
        return;
      }
      setImageFile(file);
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (formData.categories.length === 0) {
        throw new Error("Pilih setidaknya satu kategori");
      }

      let image_url = "";

      // Upload image to R2 if selected
      if (imageFile) {
        const compressedImage = await compressImageToWebP(imageFile, 1, 1920);
        
        const reqData = {
          fileName: compressedImage.name,
          fileType: compressedImage.type,
          folder: "market",
          fileSize: compressedImage.size,
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
            headers: { "Content-Type": compressedImage.type },
            body: compressedImage,
          });

          if (s3Res.ok) {
            image_url = publicUrl;
          } else {
            console.warn("Upload ke R2 gagal");
          }
        } else {
          console.warn("Gagal mendapatkan presigned URL dari /api/upload");
        }
      }

      const res = await fetch("/api/market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, image_url }),
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

  return (
    <main className="p-6 max-w-4xl mx-auto w-full">
      <Link href="/dashboard/my-market" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </Link>
      
      <h1 className="text-3xl font-black text-white mb-8">Jual Mod Baru</h1>

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
              placeholder="Contoh: Mod Map Trans Jawa V1"
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
              placeholder="mod-map-trans-jawa-v1"
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
              placeholder="Contoh: 1.49, 1.50"
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
              placeholder="0 untuk gratis"
            />
            <p className="text-xs text-gray-500 mt-2">*Bila harga &gt; 0, penjual akan menerima (Harga - 16% Pajak/Admin)</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Link Download <span className="text-red-500">*</span></label>
            <input
              type="url"
              required
              value={formData.download_url}
              onChange={(e) => setFormData({ ...formData, download_url: e.target.value })}
              className="w-full bg-black/30 border border-border/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-lilac transition-colors"
              placeholder="Contoh: https://sharemods.com/..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">Thumbnail / Gambar Mod</label>
          <div className="border-2 border-dashed border-border/50 rounded-2xl p-6 text-center hover:border-accent-lilac/50 transition-colors">
            <input
              type="file"
              accept="image/*"
              id="image-upload"
              className="hidden"
              onChange={handleImageChange}
            />
            <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center">
              <Upload className="w-10 h-10 text-gray-500 mb-2" />
              <span className="text-accent-lilac font-bold mb-1">Pilih Gambar</span>
              <span className="text-gray-500 text-xs">PNG, JPG up to 3MB</span>
              {imageFile && (
                <span className="mt-4 text-green-400 text-sm bg-green-400/10 px-3 py-1 rounded-full">
                  Terpilih: {imageFile.name}
                </span>
              )}
            </label>
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
            placeholder="Jelaskan fitur mod, cara pasang, versi game yang didukung, dll."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-4 bg-accent-lilac text-white font-bold rounded-xl hover:bg-accent-lilac/80 transition-colors shadow-lg shadow-accent-lilac/20 disabled:opacity-50"
        >
          {loading ? "Menyimpan..." : <><Save className="w-5 h-5" /> Publikasikan Mod</>}
        </button>
      </form>
    </main>
  );
}
