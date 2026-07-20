"use client";

import { useState } from "react";
import { updateConvoy } from "@/app/actions/convoyActions";
import { useRouter } from "next/navigation";
import {
  Image as ImageIcon,
  MapPin,
  Truck,
  CalendarClock,
  Settings,
  Loader2,
  Save,
  Lock as LockIcon,
} from "lucide-react";

export default function EditConvoyForm({ convoy }: { convoy: any }) {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState(convoy.imageUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Helper untuk formatting date/time input agar sesuai dengan value yang diterima
  const toDate = (d: any) => (d ? new Date(d).toISOString().split("T")[0] : "");
  const toTime = (d: any) =>
    d ? new Date(d).toTimeString().substring(0, 5) : "";

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          folder: "convoys",
        }),
      });
      const { signedUrl, publicUrl } = await res.json();
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (uploadRes.ok) setImageUrl(publicUrl);
    } catch (error) {
      alert("Gagal mengunggah gambar.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form
      action={async (formData) => {
        setLoading(true);
        await updateConvoy(convoy._id.toString(), formData);
        router.push("/dashboard/manage/events/convoy");
      }}
      className="space-y-6"
    >
      <input type="hidden" name="imageUrl" value={imageUrl} />

      <div className="glass-panel p-6 md:p-8 rounded-[2rem] border-border/50 shadow-xl">
        <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2 border-b border-border/40 pb-4">
          <Settings className="text-primary w-5 h-5" /> Edit Informasi & Banner
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Banner Event
            </label>
            <div className="w-full aspect-video rounded-2xl border-2 border-dashed border-border/50 overflow-hidden bg-black/20 flex flex-col items-center justify-center relative group">
              {imageUrl ? (
                <img src={imageUrl} className="w-full h-full object-cover" />
              ) : (
                <div className="text-gray-500 text-xs flex flex-col items-center gap-2">
                  <ImageIcon className="w-8 h-8 opacity-50" />
                  <span>Update Banner</span>
                </div>
              )}
              <input
                type="file"
                id="bannerUpload"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <label
                htmlFor="bannerUpload"
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-sm font-bold"
              >
                {isUploading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Pilih Gambar"
                )}
              </label>
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">
                Nama Convoy
              </label>
              <input
                name="convoyName"
                defaultValue={convoy.convoyName}
                required
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">
                URL Slug (Readonly)
              </label>
              <input
                name="convoyUri"
                defaultValue={convoy.convoyUri}
                readOnly
                className="w-full bg-black/10 border border-white/5 rounded-xl px-4 py-3 text-foreground/50 cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">
                Game Simulasi
              </label>
              <select
                name="gameId"
                defaultValue={convoy.gameId}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-foreground"
              >
                <option value="1">Euro Truck Simulator 2</option>
                <option value="2">American Truck Simulator</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">
                Sifat Event
              </label>
              <select
                name="typeConvoy"
                defaultValue={convoy.typeConvoy}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-foreground"
              >
                <option value="Mingguan">Mingguan</option>
                <option value="Bulanan">Bulanan</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase">
                Deskripsi Detail
              </label>
              <textarea
                name="description"
                defaultValue={convoy.description}
                rows={3}
                required
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-foreground"
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6 md:p-8 rounded-[2rem] border-border/50 shadow-xl">
        <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2 border-b border-border/40 pb-4">
          <CalendarClock className="text-accent-sky w-5 h-5" /> Penjadwalan &
          Akses
        </h2>

        {/* Ubah md:grid-cols-3 menjadi lg:grid-cols-3 agar layout lebih lega di desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Meetup Date & Time */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Waktu Meetup (Kumpul)
            </label>
            <div className="flex flex-row gap-2">
              <input
                name="meetupDate"
                type="date"
                defaultValue={toDate(convoy.meetupDate)}
                required
                className="w-full min-w-0 bg-black/20 border border-white/10 rounded-xl px-3 py-3 text-foreground [color-scheme:dark]"
              />
              <input
                name="meetupTime"
                type="time"
                defaultValue={toTime(convoy.meetupDate)}
                required
                className="w-28 flex-shrink-0 bg-black/20 border border-white/10 rounded-xl px-3 py-3 text-foreground [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Start Date & Time */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Waktu Start (Jalan)
            </label>
            <div className="flex flex-row gap-2">
              <input
                name="startDate"
                type="date"
                defaultValue={toDate(convoy.startDate)}
                required
                className="w-full min-w-0 bg-black/20 border border-white/10 rounded-xl px-3 py-3 text-foreground [color-scheme:dark]"
              />
              <input
                name="startTime"
                type="time"
                defaultValue={toTime(convoy.startDate)}
                required
                className="w-28 flex-shrink-0 bg-black/20 border border-white/10 rounded-xl px-3 py-3 text-foreground [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
              <LockIcon size={14} className="text-red-500" /> Password Lobby
            </label>
            <input
              name="password"
              type="text"
              defaultValue={convoy.password}
              required
              className="w-full bg-red-950/20 border-2 border-red-500/50 rounded-xl px-4 py-3 text-red-100 placeholder:text-red-500/30 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
              placeholder="Kunci rahasia lobby..."
            />
          </div>
        </div>
      </div>

      <div className="glass-panel p-6 md:p-8 rounded-[2rem] border-border/50 shadow-xl">
        <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2 border-b border-border/40 pb-4">
          <MapPin className="text-accent-lilac w-5 h-5" /> Detail Rute &{" "}
          <Truck className="text-accent-lilac w-5 h-5 ml-2" /> Kargo
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <div className="space-y-4 bg-black/10 p-5 rounded-2xl border border-white/5">
            <h3 className="text-sm font-bold text-foreground/70 uppercase tracking-widest border-b border-white/10 pb-2">
              Asal
            </h3>
            <input
              name="sourceCity"
              defaultValue={convoy.sourceCity}
              required
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-foreground"
              placeholder="Kota Asal"
            />
            <input
              name="sourceCompany"
              defaultValue={convoy.sourceCompany}
              required
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-foreground"
              placeholder="Perusahaan Asal"
            />
          </div>
          <div className="space-y-4 bg-black/10 p-5 rounded-2xl border border-white/5">
            <h3 className="text-sm font-bold text-foreground/70 uppercase tracking-widest border-b border-white/10 pb-2">
              Tujuan
            </h3>
            <input
              name="destinationCity"
              defaultValue={convoy.destinationCity}
              required
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-foreground"
              placeholder="Kota Tujuan"
            />
            <input
              name="destinationCompany"
              defaultValue={convoy.destinationCompany}
              required
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-foreground"
              placeholder="Perusahaan Tujuan"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Jenis Muatan
            </label>
            <input
              name="cargoName"
              defaultValue={convoy.cargoName}
              required
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-foreground"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Bobot (Ton)
              </label>
              <input
                name="cargoMass"
                type="number"
                defaultValue={convoy.cargoMass}
                required
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Jarak (KM)
              </label>
              <input
                name="plannedDistanceKm"
                type="number"
                defaultValue={convoy.plannedDistanceKm}
                required
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-foreground"
              />
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || isUploading}
        className="w-full py-4 bg-primary text-white font-black uppercase tracking-wider rounded-2xl hover:bg-primary/80 transition-all flex items-center justify-center gap-3"
      >
        {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}{" "}
        Simpan Perubahan
      </button>
    </form>
  );
}
