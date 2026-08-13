"use client";

import { useState } from "react";
import { X, UploadCloud, Loader2 } from "lucide-react";
import { compressImageToWebP } from "@/lib/imageUtils";

export default function UploadPostDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (post: any) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    if (files.length + selectedFiles.length > 5) {
      setError("Maksimal 5 foto dalam 1 postingan.");
      return;
    }

    for (const f of selectedFiles) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
        setError("Hanya format JPEG, PNG, dan WebP yang diperbolehkan.");
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        setError(`Ukuran file ${f.name} terlalu besar (maks 10MB).`);
        return;
      }
    }

    setError(null);
    setFiles((prev) => [...prev, ...selectedFiles]);
    setPreviews((prev) => [
      ...prev,
      ...selectedFiles.map((f) => URL.createObjectURL(f))
    ]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    setError(null);

    try {
      const publicUrls: string[] = [];

      // Upload sequentially to avoid overloading presign service/network
      for (const file of files) {
        // 0. Compress Image
        const compressedFile = await compressImageToWebP(file, 2, 1920);

        // 1. Get Presigned URL
        const presignRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: compressedFile.name,
            fileType: compressedFile.type,
            fileSize: compressedFile.size,
            folder: "gallery",
          }),
        });

        if (!presignRes.ok) {
          const err = await presignRes.json();
          throw new Error(err.error || `Gagal mendapatkan izin unggah untuk ${file.name}`);
        }

        const { signedUrl, publicUrl } = await presignRes.json();

        // 2. Upload to R2 directly
        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": compressedFile.type },
          body: compressedFile,
        });

        if (!uploadRes.ok) {
          throw new Error(`Gagal mengunggah file ${file.name} ke server.`);
        }

        publicUrls.push(publicUrl);
      }

      // 3. Save Post to DB
      const dbRes = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: publicUrls[0], // primary for backwards compat
          imageUrls: publicUrls,
          caption,
          tags: tagsInput,
        }),
      });

      if (!dbRes.ok) {
        throw new Error("Gagal menyimpan data kiriman.");
      }

      const newPost = await dbRes.json();
      onSuccess(newPost);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Terjadi kesalahan yang tidak terduga.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-card w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden z-10 border border-border/50 flex flex-col">
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <h2 className="font-bold text-lg">Buat Postingan Baru</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm text-center">
              {error}
            </div>
          )}

          {previews.length === 0 ? (
            <div className="border-2 border-dashed border-border/50 rounded-2xl p-10 flex flex-col items-center justify-center bg-muted/30">
              <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="font-medium text-foreground mb-1">Pilih foto dari perangkat Anda</p>
              <p className="text-sm text-muted-foreground mb-6">JPEG atau PNG, maks 5 foto, maks 10MB/foto</p>
              <label className="cursor-pointer px-6 py-2 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg hover:bg-primary/90 transition">
                Pilih File
                <input
                  type="file"
                  multiple
                  accept="image/jpeg, image/png, image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-2">
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-square bg-black rounded-lg overflow-hidden border border-border/50">
                    <img src={src} alt={`Preview ${i}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-500 rounded-full text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {previews.length < 5 && (
                  <label className="aspect-square border-2 border-dashed border-border/50 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition">
                    <UploadCloud className="w-6 h-6 text-muted-foreground mb-1" />
                    <span className="text-[10px] text-muted-foreground">Tambah</span>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg, image/png, image/webp"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Keterangan (Caption)</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Ceritakan tentang truk Anda..."
                  className="w-full bg-background border border-border/50 rounded-xl p-3 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/50 mb-4"
                  maxLength={500}
                />
                
                <label className="block text-sm font-medium mb-2">Tagar (Opsional)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="scania, mabar, konvoi (pisahkan dengan koma)"
                  className="w-full bg-background border border-border/50 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  maxLength={100}
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border/50 flex justify-end gap-3 bg-muted/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-xl transition"
            disabled={isUploading}
          >
            Batal
          </button>
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-xl shadow-lg hover:bg-primary/90 transition disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isUploading ? "Mengunggah..." : "Bagikan"}
          </button>
        </div>
      </div>
    </div>
  );
}
