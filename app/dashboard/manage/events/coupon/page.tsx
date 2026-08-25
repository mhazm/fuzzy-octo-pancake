"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Ticket, Coins, ShieldAlert, Calendar, Image as ImageIcon, CheckCircle, Loader2, X, Clock } from "lucide-react";
import Link from "next/link";
import { compressImageToWebP } from "@/lib/imageUtils";

export default function CreateCouponPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  
  // Helper for WIB default datetime-local value
  const getWIBDateTimeLocal = (date: Date) => {
    const wibDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const year = wibDate.getFullYear();
    const month = String(wibDate.getMonth() + 1).padStart(2, "0");
    const day = String(wibDate.getDate()).padStart(2, "0");
    const hours = String(wibDate.getHours()).padStart(2, "0");
    const minutes = String(wibDate.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 7);
  const defaultDateString = getWIBDateTimeLocal(defaultDate);

  const defaultStartDate = new Date();
  defaultStartDate.setHours(defaultStartDate.getHours() + 1);
  const defaultStartDateString = getWIBDateTimeLocal(defaultStartDate);

  const [formData, setFormData] = useState({
    nameCoupon: "",
    codeCoupon: "",
    type: "NC", // 'NC' or 'PENALTY_TICKET'
    minAmount: 0,
    maxAmount: 0,
    isScheduled: false,
    startDate: defaultStartDateString,
    endDate: defaultDateString,
  });

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name.includes("Amount") ? Number(value) : value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        setError("Maksimal ukuran gambar adalah 3MB");
        return;
      }
      setBannerFile(file);
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    if (formData.minAmount > formData.maxAmount) {
      setError("Min Amount tidak boleh lebih besar dari Max Amount.");
      setIsSubmitting(false);
      return;
    }

    try {
      let finalImageUrl = "";
      if (bannerFile) {
        const compressed = await compressImageToWebP(bannerFile);
        finalImageUrl = await uploadToR2(compressed, "coupons");
      }

      const payload = {
        ...formData,
        startDate: formData.isScheduled ? `${formData.startDate}+07:00` : new Date().toISOString(),
        endDate: `${formData.endDate}+07:00`,
        imageUrl: finalImageUrl,
      };

      const res = await fetch("/api/manage/coupons/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/dashboard/manage"); // Redirect back to manage or keep them here
        }, 3000);
      } else {
        setError(data.error || "Terjadi kesalahan saat membuat kupon.");
      }
    } catch (err: any) {
      setError("Kesalahan koneksi atau server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-4">
          <CheckCircle size={48} />
        </div>
        <h2 className="text-3xl font-black uppercase tracking-widest text-foreground text-center">
          Kupon Berhasil Dibuat!
        </h2>
        <p className="text-muted-foreground text-center max-w-md">
          Kupon telah disimpan di database, Notifikasi global telah dikirim, dan pesan Discord telah diteruskan.
        </p>
        <Link 
          href="/dashboard/manage"
          className="mt-6 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/80 transition-colors"
        >
          Kembali ke Dasbor Manajer
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Ticket className="text-primary w-8 h-8" /> Buat Kupon Event
        </h2>
      </div>

      <p className="text-muted-foreground">
        Gunakan form ini untuk membuat kupon hadiah. Kupon akan otomatis dipublikasikan ke Website dan Discord.
      </p>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 bg-card border border-border/50 p-6 sm:p-8 rounded-2xl shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">Nama Kupon</label>
            <input
              type="text"
              name="nameCoupon"
              required
              placeholder="Contoh: Kupon Ramadhan"
              value={formData.nameCoupon}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-background border border-border/50 rounded-xl focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          {/* Code */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">Kode Kupon</label>
            <input
              type="text"
              name="codeCoupon"
              required
              placeholder="Contoh: Ramadhan2026"
              value={formData.codeCoupon}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-background border border-border/50 rounded-xl focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          {/* Type */}
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-bold text-foreground">Tipe Kupon</label>
            <div className="grid grid-cols-2 gap-4">
              <label className={`flex items-center justify-center gap-2 p-4 border rounded-xl cursor-pointer transition-all ${
                formData.type === "NC" ? "border-yellow-500 bg-yellow-500/10 text-yellow-500 font-bold" : "border-border/50 bg-background text-muted-foreground hover:bg-muted"
              }`}>
                <input 
                  type="radio" 
                  name="type" 
                  value="NC" 
                  checked={formData.type === "NC"} 
                  onChange={handleChange} 
                  className="hidden" 
                />
                <Coins size={20} /> Nismara Coin (NC)
              </label>
              
              <label className={`flex items-center justify-center gap-2 p-4 border rounded-xl cursor-pointer transition-all ${
                formData.type === "PENALTY_TICKET" ? "border-red-500 bg-red-500/10 text-red-500 font-bold" : "border-border/50 bg-background text-muted-foreground hover:bg-muted"
              }`}>
                <input 
                  type="radio" 
                  name="type" 
                  value="PENALTY_TICKET" 
                  checked={formData.type === "PENALTY_TICKET"} 
                  onChange={handleChange} 
                  className="hidden" 
                />
                <ShieldAlert size={20} /> Tiket Hapus Penalti
              </label>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {formData.type === "NC" 
                ? "Sistem akan mengacak nominal (ribuan) dari Min hingga Max." 
                : "Sistem akan mengacak jumlah tiket yang didapat (contoh: 1 sampai 5)."}
            </p>
          </div>

          {/* Min Amount */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">
              Min {formData.type === "NC" ? "Amount (NC)" : "Tiket"}
            </label>
            <input
              type="number"
              name="minAmount"
              required
              min={1}
              value={formData.minAmount || ""}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-background border border-border/50 rounded-xl focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          {/* Max Amount */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">
              Max {formData.type === "NC" ? "Amount (NC)" : "Tiket"}
            </label>
            <input
              type="number"
              name="maxAmount"
              required
              min={1}
              value={formData.maxAmount || ""}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-background border border-border/50 rounded-xl focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          {/* Schedule Toggle */}
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-bold text-foreground">Jadwal Kupon</label>
            <div className="grid grid-cols-2 gap-4">
              <label className={`flex items-center justify-center gap-2 p-4 border rounded-xl cursor-pointer transition-all ${
                !formData.isScheduled ? "border-primary bg-primary/10 text-primary font-bold" : "border-border/50 bg-background text-muted-foreground hover:bg-muted"
              }`}>
                <input 
                  type="radio" 
                  name="isScheduled" 
                  value="false" 
                  checked={!formData.isScheduled} 
                  onChange={() => setFormData(prev => ({ ...prev, isScheduled: false }))} 
                  className="hidden" 
                />
                Berlaku Sekarang
              </label>
              
              <label className={`flex items-center justify-center gap-2 p-4 border rounded-xl cursor-pointer transition-all ${
                formData.isScheduled ? "border-primary bg-primary/10 text-primary font-bold" : "border-border/50 bg-background text-muted-foreground hover:bg-muted"
              }`}>
                <input 
                  type="radio" 
                  name="isScheduled" 
                  value="true" 
                  checked={formData.isScheduled} 
                  onChange={() => setFormData(prev => ({ ...prev, isScheduled: true }))} 
                  className="hidden" 
                />
                <Clock size={20} /> Terjadwal
              </label>
            </div>
          </div>

          {/* Start Date */}
          {formData.isScheduled && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground flex items-center gap-2">
                <Calendar size={16} /> Waktu Dimulai
              </label>
              <input
                type="datetime-local"
                name="startDate"
                required={formData.isScheduled}
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-background border border-border/50 rounded-xl focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          )}

          {/* Duration */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground flex items-center gap-2">
              <Calendar size={16} /> Waktu Kedaluwarsa
            </label>
            <input
              type="datetime-local"
              name="endDate"
              required
              value={formData.endDate}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-background border border-border/50 rounded-xl focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          {/* Image Banner */}
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-bold text-foreground flex items-center gap-2">
              <ImageIcon size={16} /> Upload Banner Kupon (Opsional)
            </label>
            {bannerFile ? (
              <div className="relative w-full max-w-sm rounded-xl overflow-hidden border border-border/50 bg-background group">
                <img src={URL.createObjectURL(bannerFile)} alt="Preview" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={() => setBannerFile(null)}
                  className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-red-500 rounded-full text-white backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full max-w-sm h-48 bg-background border-2 border-dashed border-border/50 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <ImageIcon className="w-10 h-10 text-muted-foreground group-hover:text-primary mb-3 transition-colors" />
                  <p className="mb-2 text-sm text-foreground font-medium">Klik untuk upload gambar banner</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG (Max 3MB)</p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
              </label>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white rounded-xl font-bold uppercase tracking-widest hover:bg-primary/80 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={20} /> Memproses...
            </>
          ) : (
            "Publikasikan Kupon"
          )}
        </button>
      </form>
    </div>
  );
}
