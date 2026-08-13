"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Ticket, Coins, ShieldAlert, Calendar, Image as ImageIcon, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function CreateCouponPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    nameCoupon: "",
    codeCoupon: "",
    type: "NC", // 'NC' or 'PENALTY_TICKET'
    minAmount: 0,
    maxAmount: 0,
    durationDays: 7,
    imageUrl: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name.includes("Amount") || name === "durationDays" ? Number(value) : value,
    }));
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
      const res = await fetch("/api/manage/coupons/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
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
              placeholder="Contoh: RAMADHAN2026"
              value={formData.codeCoupon}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-background border border-border/50 rounded-xl focus:ring-2 focus:ring-primary outline-none uppercase"
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

          {/* Duration */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground flex items-center gap-2">
              <Calendar size={16} /> Durasi (Hari)
            </label>
            <input
              type="number"
              name="durationDays"
              required
              min={1}
              value={formData.durationDays || ""}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-background border border-border/50 rounded-xl focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground flex items-center gap-2">
              <ImageIcon size={16} /> URL Banner Kupon (Opsional)
            </label>
            <input
              type="url"
              name="imageUrl"
              placeholder="https://example.com/image.png"
              value={formData.imageUrl}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-background border border-border/50 rounded-xl focus:ring-2 focus:ring-primary outline-none"
            />
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
