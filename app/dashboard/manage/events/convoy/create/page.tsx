"use client";

import { useState } from "react";
import { createConvoy } from "@/app/actions/convoyActions";
import {
  Image as ImageIcon,
  MapPin,
  Truck,
  CalendarClock,
  Settings,
  Loader2,
  Save,
} from "lucide-react";

export default function CreateConvoyPage() {
  const [convoyName, setConvoyName] = useState("");
  const [convoyUri, setConvoyUri] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auto-fill URI dari Nama Convoy
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setConvoyName(name);
    const generatedUri = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    setConvoyUri(generatedUri);
  };

  // Logika Upload ke R2 Cloudflare yang diadaptasi dari SettingsClient
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Format gambar tidak didukung!");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      alert("Maksimal ukuran gambar adalah 4MB.");
      return;
    }

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

      if (uploadRes.ok) {
        setImageUrl(publicUrl);
      } else {
        alert("Gagal mengunggah gambar ke R2.");
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan sistem saat unggah.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-gradient uppercase tracking-tighter">
          Buat Convoy Baru
        </h1>
        <p className="text-foreground/60 mt-2 font-medium">
          Persiapkan jadwal mabar, rute pengiriman, dan muatan secara detail.
        </p>
      </div>

      <form
        action={async (formData) => {
          setLoading(true);
          await createConvoy(formData);
        }}
        className="space-y-6"
      >
        {/* SECTION 1: MEDIA & INFORMASI UMUM */}
        <div className="glass-panel p-6 md:p-8 rounded-[2rem] border-border/50 shadow-xl">
          <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2 border-b border-border/40 pb-4">
            <Settings className="text-primary w-5 h-5" /> Informasi Dasar &
            Banner
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Banner Upload */}
            <div className="lg:col-span-1 space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> Banner Event
              </label>
              <div className="w-full aspect-video rounded-2xl border-2 border-dashed border-border/50 overflow-hidden bg-black/20 flex flex-col items-center justify-center relative group">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Convoy Banner"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-500 text-xs flex flex-col items-center gap-2">
                    <ImageIcon className="w-8 h-8 opacity-50" />
                    <span>Upload Banner (Max 4MB)</span>
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
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    "Pilih Gambar"
                  )}
                </label>
              </div>
              <input type="hidden" name="imageUrl" value={imageUrl} />
            </div>

            {/* General Info */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Nama Convoy
                </label>
                <input
                  name="convoyName"
                  value={convoyName}
                  onChange={handleNameChange}
                  required
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary transition-colors"
                  placeholder="Contoh: Nismara Weekend Convoy"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  URL Slug
                </label>
                <input
                  name="convoyUri"
                  value={convoyUri}
                  onChange={(e) => setConvoyUri(e.target.value)}
                  required
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-foreground/60 focus:outline-none focus:border-primary transition-colors"
                  placeholder="nismara-weekend"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Game Simulasi
                </label>
                <select
                  name="gameId"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary transition-colors appearance-none"
                >
                  <option value="1" className="bg-card">
                    Euro Truck Simulator 2
                  </option>
                  <option value="2" className="bg-card">
                    American Truck Simulator
                  </option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Sifat Event
                </label>
                <select
                  name="typeConvoy"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary transition-colors appearance-none"
                >
                  <option value="Mingguan" className="bg-card">
                    Mingguan
                  </option>
                  <option value="Bulanan" className="bg-card">
                    Bulanan
                  </option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Deskripsi Detail
                </label>
                <textarea
                  name="description"
                  rows={3}
                  required
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary transition-colors"
                  placeholder="Sertakan informasi server, DLC yang dibutuhkan, peraturan barisan..."
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: JADWAL & PASSWORD */}
        <div className="glass-panel p-6 md:p-8 rounded-[2rem] border-border/50 shadow-xl">
          <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2 border-b border-border/40 pb-4">
            <CalendarClock className="text-accent-sky w-5 h-5" /> Penjadwalan &
            Akses
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Waktu Meetup (Kumpul)
              </label>
              <div className="flex gap-2">
                <input
                  name="meetupDate"
                  type="date"
                  required
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-3 text-foreground focus:outline-none focus:border-primary [color-scheme:dark]"
                />
                <input
                  name="meetupTime"
                  type="time"
                  required
                  className="w-24 bg-black/20 border border-white/10 rounded-xl px-3 py-3 text-foreground focus:outline-none focus:border-primary [color-scheme:dark]"
                />
              </div>
              <p className="text-[10px] text-foreground/40 mt-1">
                Gunakan format 24 Jam.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Waktu Start (Jalan)
              </label>
              <div className="flex gap-2">
                <input
                  name="startDate"
                  type="date"
                  required
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-3 text-foreground focus:outline-none focus:border-primary [color-scheme:dark]"
                />
                <input
                  name="startTime"
                  type="time"
                  required
                  className="w-24 bg-black/20 border border-white/10 rounded-xl px-3 py-3 text-foreground focus:outline-none focus:border-primary [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Password Lobby In-Game
              </label>
              <input
                name="password"
                type="text"
                required
                className="w-full bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-red-500 transition-colors"
                placeholder="Kunci rahasia lobby..."
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: RUTE & KARGO */}
        <div className="glass-panel p-6 md:p-8 rounded-[2rem] border-border/50 shadow-xl">
          <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2 border-b border-border/40 pb-4">
            <MapPin className="text-accent-lilac w-5 h-5" /> Detail Rute &{" "}
            <Truck className="text-accent-lilac w-5 h-5 ml-2" /> Kargo
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-4 bg-black/10 p-5 rounded-2xl border border-white/5">
              <h3 className="text-sm font-bold text-foreground/70 uppercase tracking-widest border-b border-white/10 pb-2">
                Asal Keberangkatan
              </h3>
              <div className="space-y-2">
                <input
                  name="sourceCity"
                  required
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
                  placeholder="Kota Asal"
                />
                <input
                  name="sourceCompany"
                  required
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
                  placeholder="Perusahaan Asal"
                />
              </div>
            </div>

            <div className="space-y-4 bg-black/10 p-5 rounded-2xl border border-white/5">
              <h3 className="text-sm font-bold text-foreground/70 uppercase tracking-widest border-b border-white/10 pb-2">
                Tujuan Pengiriman
              </h3>
              <div className="space-y-2">
                <input
                  name="destinationCity"
                  required
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
                  placeholder="Kota Tujuan"
                />
                <input
                  name="destinationCompany"
                  required
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
                  placeholder="Perusahaan Tujuan"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Jenis Muatan / Kargo
              </label>
              <input
                name="cargoName"
                required
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary"
                placeholder="Contoh: Alat Berat / Logistik Makanan"
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
                  required
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="25000"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Jarak Tempuh (KM)
                </label>
                <input
                  name="plannedDistanceKm"
                  type="number"
                  required
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="1250"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading || isUploading}
            className="px-8 py-4 bg-primary text-white font-black uppercase tracking-wider rounded-2xl hover:bg-primary/80 transition-all flex items-center gap-3 disabled:opacity-50 shadow-xl shadow-primary/20"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {loading ? "Menyimpan Data..." : "Publikasikan Convoy"}
          </button>
        </div>
      </form>
    </div>
  );
}
