"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";

export default function EditPostDialog({
  post,
  onClose,
  onSuccess,
}: {
  post: any;
  onClose: () => void;
  onSuccess: (updatedPost: any) => void;
}) {
  const [caption, setCaption] = useState(post.caption || "");
  const [tagsInput, setTagsInput] = useState(post.tags?.join(" ") || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/gallery/${post._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption,
          tags: tagsInput,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal memperbarui postingan.");
      }

      const updatedData = await res.json();
      
      // Compute the new parsed tags client-side for immediate UI reflection
      const newTags = tagsInput.split(/[\s,]+/)
        .map((t: string) => t.trim().toLowerCase().replace(/^#+/, ""))
        .filter((t: string) => t.length > 0)
        .slice(0, 10);

      onSuccess({
        ...post,
        caption,
        tags: newTags,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Terjadi kesalahan yang tidak terduga.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-card w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden z-[71] border border-border/50 flex flex-col">
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <h2 className="font-bold text-lg">Edit Postingan</h2>
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

          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Caption</label>
            <textarea
              rows={4}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full bg-black/30 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary transition-colors resize-none"
              placeholder="Ceritakan tentang foto Anda..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Tags (Opsional)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full bg-black/30 border border-border/50 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary transition-colors"
              placeholder="Contoh: ets2 scania convoy (pisahkan dengan spasi)"
            />
            <p className="text-xs text-muted-foreground mt-2">Maksimal 10 tags. Gunakan spasi atau koma untuk memisahkan antar tag.</p>
          </div>
        </div>

        <div className="p-4 border-t border-border/50 bg-black/20 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            disabled={isSubmitting}
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Menyimpan...</> : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}
