"use client";

import { useState, useRef } from "react";
import { Upload, X, Truck, Loader2, Image as ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { showAlert, showConfirm } from "@/lib/dialog";
import { compressImageToWebP } from "@/lib/imageUtils";

export default function FleetImageEditorClient({
  fleetId,
  currentCustomImage,
  modelPhotoUrl,
  brandLogoUrl,
  brandName,
  modelName,
  isOwner,
  isNismaraPlus,
}: {
  fleetId: string;
  currentCustomImage: string | null;
  modelPhotoUrl: string | null;
  brandLogoUrl: string | null;
  brandName: string | null;
  modelName: string | null;
  isOwner: boolean;
  isNismaraPlus: boolean;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      await showAlert("Format tidak didukung! Harap unggah gambar.");
      return;
    }

    // Validasi Format
    if (!isNismaraPlus && file.type === "image/gif") {
      await showAlert("Hanya member Nismara+ yang diizinkan mengunggah GIF.");
      return;
    }

    // Validasi Ukuran
    const maxSizeMB = isNismaraPlus ? 5 : 3;
    if (file.size > maxSizeMB * 1024 * 1024) {
      await showAlert(`Maksimal ukuran file adalah ${maxSizeMB}MB.`);
      return;
    }

    await handleUpload(file);
  };

  const uploadToR2 = async (file: File, folder: string) => {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        folder,
      }),
    });
    const { signedUrl, publicUrl } = await res.json();
    await fetch(signedUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
    return publicUrl;
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      let finalUrl = "";
      if (file.type === "image/gif") {
         // GIF bypasses compression
         finalUrl = await uploadToR2(file, "fleets");
      } else {
         const compressed = await compressImageToWebP(file);
         finalUrl = await uploadToR2(compressed, "fleets");
      }

      // Save to fleet
      const res = await fetch(`/api/fleet/${fleetId}/custom-image`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customImage: finalUrl }),
      });

      const data = await res.json();
      if (res.ok) {
        router.refresh();
      } else {
        await showAlert(data.error || "Gagal menyimpan gambar truk");
      }
    } catch (error) {
      console.error(error);
      await showAlert("Terjadi kesalahan saat mengunggah gambar.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (await showConfirm("Anda yakin ingin menghapus foto kustom ini? Gambar truk akan kembali ke bawaan pabrik.")) {
        setIsUploading(true);
        try {
          const res = await fetch(`/api/fleet/${fleetId}/custom-image`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customImage: null }),
          });
    
          if (res.ok) {
            router.refresh();
          } else {
            const data = await res.json();
            await showAlert(data.error || "Gagal menghapus gambar");
          }
        } catch (error) {
          console.error(error);
          await showAlert("Terjadi kesalahan jaringan");
        } finally {
          setIsUploading(false);
        }
    }
  };

  const displayImage = currentCustomImage || modelPhotoUrl;

  return (
    <div className="aspect-[21/9] relative bg-card border border-border/50 rounded-2xl flex items-center justify-center p-6 shadow-lg overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent z-10" />
      
      {/* Gambar Truk */}
      {displayImage ? (
        <img
          src={displayImage}
          alt={modelName || "Truck"}
          className="w-full h-full object-contain drop-shadow-2xl z-20 transition-transform duration-700"
        />
      ) : (
        <Truck size={64} className="text-muted-foreground/30 z-20" />
      )}
      
      {/* Brand Logo Overlay */}
      {brandLogoUrl && (
        <div className="absolute top-6 left-6 p-2 bg-background/80 backdrop-blur-sm rounded-lg border border-border/50 z-20 pointer-events-none">
          <img
            src={brandLogoUrl}
            alt={brandName || "Brand"}
            className="h-6 w-auto object-contain"
          />
        </div>
      )}

      {/* Editor Controls Overlay */}
      {isOwner && (
        <div className="absolute inset-0 bg-background/40 backdrop-blur-sm z-30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept={isNismaraPlus ? "image/png, image/jpeg, image/webp, image/gif" : "image/png, image/jpeg, image/webp"} 
                className="hidden" 
            />
            
            {isUploading ? (
                <div className="flex flex-col items-center gap-2 text-primary bg-background/90 p-4 rounded-xl border border-primary/20 shadow-xl">
                    <Loader2 size={32} className="animate-spin" />
                    <span className="text-sm font-bold uppercase tracking-widest">Mengunggah...</span>
                </div>
            ) : (
                <>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center gap-2 bg-background p-4 rounded-xl border border-border hover:border-primary hover:text-primary transition-all shadow-xl hover:-translate-y-1"
                    >
                        <ImageIcon size={32} />
                        <span className="text-xs font-bold uppercase tracking-widest">Ganti Foto</span>
                    </button>
                    
                    {currentCustomImage && (
                        <button 
                            onClick={handleRemove}
                            className="flex flex-col items-center gap-2 bg-background p-4 rounded-xl border border-border hover:border-red-500 hover:text-red-500 transition-all shadow-xl hover:-translate-y-1"
                        >
                            <X size={32} />
                            <span className="text-xs font-bold uppercase tracking-widest">Hapus Foto</span>
                        </button>
                    )}
                </>
            )}
        </div>
      )}
    </div>
  );
}
