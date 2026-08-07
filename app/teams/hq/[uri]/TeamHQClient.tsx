"use client";

import { useState } from "react";
import {
  updateTeamSettingsAction,
  manageMemberAction,
  deleteTeamAction,
} from "@/app/actions/teamHqActions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { compressImageToWebP } from "@/lib/imageUtils";
import { showAlert, showConfirm } from "@/lib/dialog";


export default function TeamHQClient({ team, members, pending, isNismaraPlus }: any) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"settings" | "members" | "danger">(
    "settings",
  );
  const [form, setForm] = useState(team);
  const [isSaving, setIsSaving] = useState(false);
  const [uriPreview, setUriPreview] = useState(team.uri);
  const [confirmDelete, setConfirmDelete] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const handleUriChange = (val: string) => {
    const slug = val
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "");
    setUriPreview(slug);
    setForm({ ...form, uri: slug });
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

  const handleSave = async (e: any) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const maxSizeMB = isNismaraPlus ? 5 : 3;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;

      const validateFile = (file: File, fieldName: string) => {
        if (!isNismaraPlus && file.type === "image/gif") {
          throw new Error(`Fitur upload GIF pada ${fieldName} hanya untuk pengguna Nismara+.`);
        }
        if (file.size > maxSizeBytes) {
          throw new Error(`Ukuran ${fieldName} maksimal ${maxSizeMB}MB.`);
        }
      };

      if (logoFile) validateFile(logoFile, "Logo");
      if (bannerFile) validateFile(bannerFile, "Banner");

      let finalLogoUrl = form.logoUrl;
      let finalBannerUrl = form.bannerUrl;

      if (logoFile) {
        const compressed = await compressImageToWebP(logoFile);
        finalLogoUrl = await uploadToR2(compressed, "teams/logos");
      }
      
      if (bannerFile) {
        const compressed = await compressImageToWebP(bannerFile);
        finalBannerUrl = await uploadToR2(compressed, "teams/banners");
      }

      const updatedForm = { ...form, logoUrl: finalLogoUrl, bannerUrl: finalBannerUrl };

      const res = await updateTeamSettingsAction(team._id, updatedForm);
      if (res.success) {
        await showAlert("Pengaturan disimpan!");
        if (res.newUri !== team.uri) router.push(`/teams/hq/${res.newUri}`);
      } else {
        await showAlert(res.message || "Berhasil!");
      }
    } catch (error: any) {
      await showAlert((error as any).message || "Gagal menyimpan pengaturan.");
    }

    setIsSaving(false);
  };

  const handleDeleteTeam = async () => {
    if (confirmDelete !== team.name) {
      return await showAlert("Nama tim yang kamu masukkan tidak sesuai.");
    }

    if (
      await showConfirm(
        "Apakah kamu benar-benar yakin? Tindakan ini tidak bisa dibatalkan.",
      )
    ) {
      const res = await deleteTeamAction(team._id);
      if (res.success) {
        await showAlert("Tim berhasil dihapus.");
        router.push("/teams");
      } else {
        await showAlert(res.message || "Berhasil!");
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black text-gradient">HQ: {team.name}</h1>
        <Link
          href={`/teams/${team.uri}`}
          className="text-sm text-accent-sky hover:underline font-bold uppercase tracking-widest"
        >
          ← Profil Publik
        </Link>
      </div>

      <div className="flex gap-6 border-b border-border mb-8">
        <button
          onClick={() => setActiveTab("settings")}
          className={`pb-4 font-bold transition-all ${activeTab === "settings" ? "border-b-2 border-primary text-primary" : "text-foreground/40"}`}
        >
          PENGATURAN TIM
        </button>
        <button
          onClick={() => setActiveTab("members")}
          className={`pb-4 font-bold transition-all ${activeTab === "members" ? "border-b-2 border-accent-lilac text-accent-lilac" : "text-foreground/40"}`}
        >
          ANGGOTA & REQUEST ({pending.length})
        </button>
        <button
          onClick={() => setActiveTab("danger")}
          className={`pb-4 font-bold ${activeTab === "danger" ? "border-b-2 border-red-500 text-red-500" : "text-foreground/40"}`}
        >
          DANGER ZONE
        </button>
      </div>

      {activeTab === "settings" && (
        <form
          onSubmit={handleSave}
          className="glass-panel p-8 rounded-2xl space-y-6 animate-in fade-in zoom-in-95"
        >
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-black uppercase opacity-40 mb-2 block">
                Nama Tim
              </label>
              <input
                className="w-full bg-background/50 border border-border p-3 rounded-xl focus:border-primary outline-none"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase opacity-40 mb-2 block">
                Tag
              </label>
              <input
                className="w-full bg-background/50 border border-border p-3 rounded-xl focus:border-primary outline-none"
                value={form.tag}
                maxLength={5}
                onChange={(e) =>
                  setForm({ ...form, tag: e.target.value.toUpperCase() })
                }
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-black uppercase opacity-40 mb-1 block">
              Custom URI
            </label>
            <input
              className="w-full bg-background/50 border border-border p-3 rounded-xl focus:border-primary outline-none font-mono text-sm"
              value={uriPreview}
              onChange={(e) => handleUriChange(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-border/20">
            <div>
              <label className="text-xs font-black uppercase opacity-40 mb-2 block">
                Ganti Logo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setLogoFile(e.target.files?.[0] || null);
                }}
                className="text-xs text-foreground/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-primary/20 file:text-primary font-bold cursor-pointer"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase opacity-40 mb-2 block">
                Ganti Banner
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setBannerFile(e.target.files?.[0] || null);
                }}
                className="text-xs text-foreground/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-accent-sky/20 file:text-accent-sky font-bold cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-black uppercase opacity-40 mb-2 block">
              Bio / Deskripsi (Markdown Support)
            </label>
            <textarea
              rows={5}
              className="w-full bg-background/50 border border-border p-4 rounded-xl focus:border-primary outline-none text-sm resize-none"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-primary text-white p-4 rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-[1.01] transition-all disabled:opacity-50"
          >
            {isSaving ? "MENYIMPAN..." : "UPDATE PENGATURAN"}
          </button>
        </form>
      )}

      {activeTab === "members" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <section>
            <h2 className="text-xs font-black text-accent-sky uppercase tracking-widest mb-4">
              Permintaan Bergabung
            </h2>
            <div className="space-y-3">
              {pending.map((m: any) => (
                <div
                  key={m._id}
                  className="glass-panel p-4 flex justify-between items-center rounded-xl border border-border/50"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={m.image}
                      className="w-10 h-10 rounded-full border border-border"
                    />
                    <span className="font-bold text-foreground">{m.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        manageMemberAction(team._id, m._id, "ACCEPT")
                      }
                      className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                    >
                      TERIMA
                    </button>
                    <button
                      onClick={() =>
                        manageMemberAction(team._id, m._id, "REJECT")
                      }
                      className="bg-red-600/20 text-red-500 px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                    >
                      TOLAK
                    </button>
                  </div>
                </div>
              ))}
              {pending.length === 0 && (
                <p className="text-foreground/30 italic text-sm">
                  Tidak ada permintaan pending.
                </p>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-black text-primary uppercase tracking-widest mb-4">
              Anggota Aktif
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {members.map((m: any) => (
                <div
                  key={m._id}
                  className="glass-panel p-4 flex justify-between items-center rounded-xl border border-border/50"
                >
                  <div className="flex items-center gap-4">
                    <img src={m.image} className="w-10 h-10 rounded-full" />
                    <div>
                      <p className="font-bold text-sm leading-none mb-1">
                        {m.name}
                      </p>
                      <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-tighter">
                        ID: #{m.truckyId || "N/A"}
                      </p>
                    </div>
                  </div>
                  {team.owner.toString() !== m._id && (
                    <button
                      onClick={() =>
                        manageMemberAction(team._id, m._id, "KICK")
                      }
                      className="text-red-500 text-[10px] font-black hover:underline uppercase tracking-widest"
                    >
                      KICK
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* TAB: DANGER ZONE */}
      {activeTab === "danger" && (
        <div className="animate-in fade-in slide-in-from-top-4">
          <div className="glass-panel p-8 rounded-2xl border border-red-500/20 bg-red-500/5">
            <h2 className="text-xl font-black text-red-500 mb-2 uppercase tracking-tight">
              Hapus Tim Permanen
            </h2>
            <p className="text-sm text-foreground/60 mb-6">
              Tindakan ini akan menghapus semua data tim **{team.name}**,
              riwayat progres, dan mengeluarkan semua anggota secara permanen.
            </p>

            <div className="space-y-4">
              <label className="text-xs font-bold text-foreground/40 uppercase">
                Ketik nama tim{" "}
                <span className="text-foreground">"{team.name}"</span> untuk
                konfirmasi:
              </label>
              <input
                type="text"
                className="w-full bg-background/50 border border-red-500/30 p-4 rounded-xl outline-none focus:border-red-500 transition-all font-bold"
                placeholder="Masukkan nama tim..."
                value={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.value)}
              />

              <button
                onClick={handleDeleteTeam}
                disabled={confirmDelete !== team.name}
                className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-white p-4 rounded-xl font-black shadow-lg shadow-red-900/20 transition-all uppercase tracking-widest"
              >
                HAPUS TIM SEKARANG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
