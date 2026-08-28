"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { updatePopupConfig } from "@/app/actions/popupActions";
import { compressImageToWebP } from "@/lib/imageUtils";
import { showAlert } from "@/lib/dialog";
import { Save, Image as ImageIcon, ToggleLeft, ToggleRight, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PopupManageClient({ initialConfig }: { initialConfig: any }) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    isActive: initialConfig?.isActive || false,
    title: initialConfig?.title || "",
    description: initialConfig?.description || "",
    imageUrl: initialConfig?.imageUrl || "",
    actionLink: initialConfig?.actionLink || "",
    actionText: initialConfig?.actionText || "",
    cooldownHours: initialConfig?.cooldownHours || 3,
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showAlert("Format tidak didukung! Harap unggah gambar.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      showAlert("Maksimal ukuran file adalah 3MB.");
      return;
    }

    setFormData({ ...formData, imageUrl: URL.createObjectURL(file) });
    setImageFile(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalImageUrl = formData.imageUrl;

      if (imageFile) {
        setIsUploading(true);
        const compressed = await compressImageToWebP(imageFile, 3, 1920);
        
        const resUpload = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: compressed.name,
            fileType: compressed.type,
            fileSize: compressed.size,
            folder: "system/popup",
          }),
        });
        const uploadData = await resUpload.json();
        if (!resUpload.ok) throw new Error(uploadData.error || "Gagal mendapatkan URL upload");

        const s3Res = await fetch(uploadData.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": compressed.type },
          body: compressed,
        });
        if (!s3Res.ok) throw new Error("Gagal mengupload file ke server");
        
        finalImageUrl = uploadData.publicUrl;
        setFormData({ ...formData, imageUrl: finalImageUrl });
        setIsUploading(false);
      }

      const res = await updatePopupConfig({
        ...formData,
        imageUrl: finalImageUrl,
      });

      if (res.success) {
        await showAlert("Konfigurasi Popup berhasil disimpan!");
      } else {
        throw new Error(res.error || "Gagal menyimpan konfigurasi.");
      }
    } catch (err: any) {
      console.error(err);
      showAlert(err.message || "Terjadi kesalahan saat menyimpan.");
    } finally {
      setLoading(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase italic">
            Global Popup
          </h1>
          <p className="text-foreground/50 font-bold uppercase text-[10px] tracking-[0.2em]">
            System Advertisement & Announcement Overlay
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6 bg-card border border-border p-8 rounded-[2.5rem] shadow-xl">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-xl font-black uppercase italic flex items-center gap-2">
              <LayoutTemplate className="text-primary" /> Configuration
            </h2>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
              className={`flex items-center gap-2 text-xs font-bold uppercase px-4 py-2 rounded-xl transition-all ${
                formData.isActive ? "bg-emerald-500/20 text-emerald-500" : "bg-foreground/10 text-foreground/50"
              }`}
            >
              {formData.isActive ? (
                <><ToggleRight size={18} /> Active</>
              ) : (
                <><ToggleLeft size={18} /> Disabled</>
              )}
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-primary uppercase ml-2">Image Banner (3MB Max)</label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isUploading || loading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                />
                <div className={`w-full bg-foreground/5 border ${formData.imageUrl ? "border-emerald-500/50" : "border-border"} rounded-2xl p-4 flex items-center justify-center gap-2 transition-colors`}>
                  {isUploading ? (
                    <span className="text-sm font-bold text-foreground/50 animate-pulse">Uploading...</span>
                  ) : formData.imageUrl ? (
                    <span className="text-sm font-bold text-emerald-500 truncate">{imageFile ? imageFile.name : "Current Image Set"}</span>
                  ) : (
                    <>
                      <ImageIcon size={16} className="text-foreground/50" />
                      <span className="text-sm font-bold text-foreground/50">Click to upload image</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-primary uppercase ml-2">Title</label>
              <input
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-foreground/5 border border-border rounded-2xl p-4 text-foreground text-sm focus:border-primary outline-none transition-colors"
                placeholder="Ex: Diskon Merdeka Nismara+"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-primary uppercase ml-2">Description</label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-foreground/5 border border-border rounded-2xl p-4 text-foreground text-sm focus:border-primary outline-none transition-colors resize-none"
                placeholder="Tulis pesan iklan/pengumuman disini..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-primary uppercase ml-2">Action Text</label>
                <input
                  required
                  value={formData.actionText}
                  onChange={(e) => setFormData({ ...formData, actionText: e.target.value })}
                  className="w-full bg-foreground/5 border border-border rounded-2xl p-4 text-foreground text-sm focus:border-primary outline-none transition-colors"
                  placeholder="Ex: Beli Sekarang"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-primary uppercase ml-2">Cooldown (Hours)</label>
                <input
                  required
                  type="number"
                  min="1"
                  max="72"
                  value={formData.cooldownHours}
                  onChange={(e) => setFormData({ ...formData, cooldownHours: parseInt(e.target.value) || 1 })}
                  className="w-full bg-foreground/5 border border-border rounded-2xl p-4 text-foreground text-sm focus:border-primary outline-none transition-colors"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-black text-primary uppercase ml-2">Target URL</label>
              <input
                required
                value={formData.actionLink}
                onChange={(e) => setFormData({ ...formData, actionLink: e.target.value })}
                className="w-full bg-foreground/5 border border-border rounded-2xl p-4 text-foreground text-sm focus:border-primary outline-none transition-colors"
                placeholder="Ex: /dashboard/nismaraplus"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 mt-4"
            >
              <Save size={18} />
              {loading ? "Saving..." : "Save Configuration"}
            </Button>
          </form>
        </div>

        {/* Live Preview */}
        <div className="space-y-6 flex flex-col items-center">
          <h2 className="text-xl font-black text-foreground uppercase italic self-start w-full border-b border-border pb-4">
            Live Preview
          </h2>
          <div className="w-full max-w-[400px] border border-border bg-background rounded-3xl overflow-hidden shadow-2xl relative">
            {!formData.isActive && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-center p-6">
                <ToggleLeft size={48} className="text-foreground/30 mb-2" />
                <p className="font-bold text-foreground/50">Popup is Currently Disabled</p>
                <p className="text-xs text-foreground/40 mt-1">Users will not see this popup.</p>
              </div>
            )}
            {formData.imageUrl ? (
              <div className="w-full h-48 bg-muted relative">
                <img src={formData.imageUrl} alt="Cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-linear-to-t from-background to-transparent" />
              </div>
            ) : (
              <div className="w-full h-48 bg-muted flex items-center justify-center">
                <ImageIcon className="text-foreground/20 w-12 h-12" />
              </div>
            )}
            <div className="p-6 text-center space-y-4 relative z-10 -mt-6">
              <h2 className="text-2xl font-black text-foreground uppercase tracking-tight leading-none">
                {formData.title || "TITLE HERE"}
              </h2>
              <p className="text-sm text-foreground/70 leading-relaxed font-medium">
                {formData.description || "Description goes here. This text will be shown to all drivers upon login."}
              </p>
              <Button className="w-full rounded-xl font-bold h-12 mt-2">
                {formData.actionText || "Action Text"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
