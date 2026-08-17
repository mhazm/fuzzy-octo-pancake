"use client";

import { useState, useEffect } from "react";
import { createNCEventAction } from "@/app/actions/eventActions";
import { showAlert } from "@/lib/dialog";
import {
  Plus,
  Zap,
  Calendar,
  History,
  TrendingUp,
  Timer,
  ShieldCheck,
  Image as ImageIcon,
  Upload,
} from "lucide-react";
import { compressImageToWebP } from "@/lib/imageUtils";

export default function EventManageUI({ active, history, manager }: any) {
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    nameEvent: "",
    slug: "",
    type: "all",
    gameId: "all",
    multiplier: "1.5",
    endAt: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatDate = (dateString: string) => {
    if (!mounted || !dateString) return "";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showAlert("File harus berupa gambar.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showAlert("Maksimal ukuran gambar adalah 5MB");
      return;
    }
    setImageFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalImageUrl = "";

      if (imageFile) {
        let fileToUpload = imageFile;
        if (imageFile.type !== "image/gif") {
          fileToUpload = await compressImageToWebP(imageFile, 1, 1920);
        }

        const reqData = {
          fileName: fileToUpload.name,
          fileType: fileToUpload.type,
          folder: "events",
          fileSize: fileToUpload.size,
        };

        const presignRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reqData),
        });

        if (presignRes.ok) {
          const { signedUrl, publicUrl } = await presignRes.json();
          const s3Res = await fetch(signedUrl, {
            method: "PUT",
            headers: { "Content-Type": fileToUpload.type },
            body: fileToUpload,
          });

          if (s3Res.ok) {
            finalImageUrl = publicUrl;
          } else {
            throw new Error("Gagal mengunggah gambar ke R2");
          }
        } else {
          throw new Error("Gagal mendapatkan presigned URL");
        }
      }

      await createNCEventAction({
        ...formData,
        imageUrl: finalImageUrl,
        setBy: manager.discordId,
        guildId: process.env.DISCORD_GUILD_ID || "863959415702028318",
      });
      
      setIsModalOpen(false);
      setImageFile(null);
      await showAlert("NC Boost Event berhasil diaktifkan!");
    } catch (err) {
      await showAlert("Gagal membuat event.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-(-primary-foreground) tracking-tighter uppercase">
            NC Boost Events
          </h1>
          <p className="text-(-primary-foreground)/50 font-bold uppercase text-[10px] tracking-[0.2em]">
            Economy Surge Control • Management Dashboard
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground px-8 py-4 rounded-[2rem] font-black uppercase tracking-tighter transition-all flex items-center gap-3 shadow-xl hover:scale-105 active:scale-95"
        >
          <Plus size={20} /> Create New Boost
        </button>
      </div>

      {/* ACTIVE EVENTS */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-(-primary-foreground) uppercase flex items-center gap-2">
          <Zap className="text-yellow-500 fill-yellow-500" size={20} /> Active
          Boosts
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {active.map((ev: any) => (
            <div
              key={ev._id}
              className="bg-card border border-border rounded-[2.5rem] overflow-hidden relative group shadow-2xl"
            >
              <div className="absolute top-6 right-6 z-20">
                <div className="bg-yellow-500 text-black px-4 py-2 rounded-2xl font-black text-xl shadow-lg">
                  {ev.multiplier}x
                </div>
              </div>
              <div className="relative h-48">
                <img
                  src={ev.imageUrl || "https://i.imgur.com/8Q0Zp0C.png"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  alt=""
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
              </div>
              <div className="p-8 space-y-4 relative z-10">
                <div>
                  <h3 className="text-2xl font-black text-(-primary-foreground) uppercase leading-none mb-1">
                    {ev.nameEvent}
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-2 mt-2">
                    <span className="text-[9px] font-black uppercase bg-primary/20 text-primary px-2 py-1 rounded-full">
                      {ev.type === "all" ? "Semua Tipe" : ev.type}
                    </span>
                    <span className="text-[9px] font-black uppercase bg-accent-lilac/20 text-accent-lilac px-2 py-1 rounded-full">
                      {ev.gameId === "all" ? "Semua Game" : ev.gameId === "1" ? "ETS2" : "ATS"}
                    </span>
                  </div>
                  <p className="text-accent-lilac font-bold text-[10px] uppercase tracking-widest flex items-center gap-1">
                    <ShieldCheck size={12} /> Authorized by Manager
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                  <div>
                    <p className="text-[10px] font-black text-(-primary-foreground)/30 uppercase tracking-widest">
                      Active From
                    </p>
                    <p className="text-xs font-bold text-(-primary-foreground)">
                      {formatDate(ev.setAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-(-primary-foreground)/30 uppercase tracking-widest">
                      Ends At
                    </p>
                    <p className="text-xs font-bold text-red-500">
                      {formatDate(ev.endAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {active.length === 0 && (
            <div className="col-span-full py-16 bg-card/30 border border-dashed border-border rounded-[2.5rem] text-center text-(-primary-foreground)/20 font-black uppercase tracking-widest">
              No active NC boosts at the moment
            </div>
          )}
        </div>
      </div>

      {/* EVENT HISTORY */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-(-primary-foreground) uppercase flex items-center gap-2">
          <History className="text-(-primary-foreground)/20" size={20} /> Past
          Boost Events
        </h2>
        <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-foreground/5 text-(-primary-foreground)/30 text-[10px] font-black uppercase tracking-widest border-b border-border">
              <tr>
                <th className="px-8 py-5">Event Name</th>
                <th className="px-8 py-5">Multiplier</th>
                <th className="px-8 py-5">Duration</th>
                <th className="px-8 py-5 text-right">Finished</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.map((h: any) => (
                <tr
                  key={h._id}
                  className="hover:bg-foreground/[0.02] transition-all"
                >
                  <td className="px-8 py-5">
                    <p className="font-black text-(-primary-foreground) uppercase tracking-tight leading-none mb-1">
                      {h.nameEvent}
                    </p>
                    <p className="text-[10px] font-bold text-accent-lilac uppercase">
                      By: {h.setBy}
                    </p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 rounded-lg font-black text-xs">
                      {h.multiplier}x Boost
                    </span>
                  </td>
                  <td className="px-8 py-5 text-xs font-bold text-(-primary-foreground)/50">
                    {(() => {
                      if (h.durationDays) return `${h.durationDays} Days`;
                      if (h.setAt && (h.realEndAt || h.endAt)) {
                        const diffTime = Math.abs(new Date(h.realEndAt || h.endAt).getTime() - new Date(h.setAt).getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return `${diffDays} Days`;
                      }
                      return "-";
                    })()}
                  </td>
                  <td className="px-8 py-5 text-right text-(-primary-foreground)/40 font-mono text-[10px] font-black">
                    {formatDate(h.realEndAt || h.endAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CREATE BOOST EVENT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
          <form
            onSubmit={handleSubmit}
            className="bg-card border border-border p-10 rounded-[3rem] w-full max-w-lg shadow-2xl space-y-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12">
              <Zap size={150} />
            </div>

            <div className="text-center relative z-10">
              <h3 className="text-3xl font-black text-(-primary-foreground) uppercase tracking-tighter">
                New Boost Event
              </h3>
              <p className="text-(-primary-foreground)/30 text-[10px] font-black uppercase tracking-[0.3em]">
                Configure Economy Multiplier
              </p>
            </div>

            <div className="space-y-4 relative z-10 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-accent-lilac uppercase ml-2">
                    Event Name
                  </label>
                  <input
                    placeholder="Contoh: Weekend Double NC"
                    required
                    value={formData.nameEvent}
                    className="w-full bg-foreground/5 border border-border rounded-2xl p-4 text-(-primary-foreground) text-sm font-bold"
                    onChange={(e) => {
                      const name = e.target.value;
                      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                      setFormData({ ...formData, nameEvent: name, slug });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-accent-lilac uppercase ml-2">
                    Slug / URI
                  </label>
                  <input
                    placeholder="weekend-double-nc"
                    required
                    value={formData.slug}
                    className="w-full bg-foreground/5 border border-border rounded-2xl p-4 text-(-primary-foreground) text-sm"
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-accent-lilac uppercase ml-2">
                    Tipe Event
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-foreground/5 border border-border rounded-2xl p-4 text-(-primary-foreground) text-sm font-bold"
                  >
                    <option value="all">Semua Tipe</option>
                    <option value="Singleplayer">Singleplayer</option>
                    <option value="TruckersMP">TruckersMP</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-accent-lilac uppercase ml-2">
                    Game
                  </label>
                  <select
                    value={formData.gameId}
                    onChange={(e) => setFormData({ ...formData, gameId: e.target.value })}
                    className="w-full bg-foreground/5 border border-border rounded-2xl p-4 text-(-primary-foreground) text-sm font-bold"
                  >
                    <option value="all">Semua Game</option>
                    <option value="1">Euro Truck Simulator 2</option>
                    <option value="2">American Truck Simulator</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-accent-lilac uppercase ml-2">
                    Multiplier
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="1.5"
                    required
                    value={formData.multiplier}
                    className="w-full bg-foreground/5 border border-border rounded-2xl p-4 text-(-primary-foreground) font-bold text-sm"
                    onChange={(e) =>
                      setFormData({ ...formData, multiplier: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-accent-lilac uppercase ml-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endAt}
                    className="w-full bg-foreground/5 border border-border rounded-2xl p-4 text-(-primary-foreground) text-sm"
                    onChange={(e) =>
                      setFormData({ ...formData, endAt: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-accent-lilac uppercase ml-2">
                  Event Banner Image
                </label>
                {imageFile ? (
                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-border group">
                    <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImageFile(null)}
                      className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center p-6 text-center hover:border-accent-lilac/50 transition-colors bg-foreground/5 h-32">
                    <input
                      type="file"
                      accept="image/*"
                      id="event-image-upload"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                    <label htmlFor="event-image-upload" className="cursor-pointer flex flex-col items-center w-full h-full justify-center">
                      <Upload className="w-6 h-6 text-(-primary-foreground)/50 mb-2" />
                      <span className="text-accent-lilac font-bold mb-1 text-sm">Upload Banner</span>
                      <span className="text-(-primary-foreground)/40 text-[10px]">PNG, JPG (Max 5MB)</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 relative z-10 pt-4">
              <button
                disabled={loading}
                type="submit"
                className="w-full bg-primary text-primary-foreground py-5 rounded-[2rem] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-primary/20"
              >
                {loading ? "Activating Boost..." : "Authorize Boost Event"}
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-full py-2 text-(-primary-foreground)/20 font-black uppercase text-[10px] tracking-widest"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
