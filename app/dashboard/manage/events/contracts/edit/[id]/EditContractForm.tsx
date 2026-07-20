"use client";

import { useState } from "react";
import { updateContractAction } from "@/app/actions/contractActions";
import Link from "next/link";
import { Briefcase, Save, ArrowLeft, Loader2 } from "lucide-react";

export default function EditContractForm({ contract }: { contract: any }) {
  const [loading, setLoading] = useState(false);

  // Format tanggal ISO ke YYYY-MM-DD untuk default value input type="date"
  const initialDate = contract.endAt
    ? new Date(contract.endAt).toISOString().split("T")[0]
    : "";

  const [formData, setFormData] = useState({
    contractName: contract.contractName || "",
    companyName: contract.companyName || "",
    imageUrl: contract.imageUrl || "",
    gameId: contract.gameId || "1",
    endAt: initialDate,
  });

  return (
    <div className="glass-panel p-8 md:p-10 rounded-[3rem] border-border/50 shadow-2xl relative overflow-hidden">
      {/* Background Icon Decoration */}
      <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12 pointer-events-none">
        <Briefcase size={200} className="text-primary" />
      </div>

      <form
        action={async (data) => {
          setLoading(true);
          await updateContractAction(contract._id, data);
        }}
        className="relative z-10 space-y-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-accent-lilac uppercase tracking-widest ml-2">
              Target Game
            </label>
            <select
              name="gameId"
              value={formData.gameId}
              onChange={(e) =>
                setFormData({ ...formData, gameId: e.target.value })
              }
              className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-foreground font-bold text-sm outline-none focus:border-accent-lilac transition-all"
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
            <label className="text-xs font-black text-accent-lilac uppercase tracking-widest ml-2">
              Deadline Kontrak
            </label>
            <input
              type="date"
              name="endAt"
              required
              value={formData.endAt}
              onChange={(e) =>
                setFormData({ ...formData, endAt: e.target.value })
              }
              className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-foreground text-sm outline-none focus:border-accent-lilac transition-all [color-scheme:dark]"
            />
          </div>
        </div>

        <div className="space-y-6 bg-black/10 p-6 rounded-[2rem] border border-white/5">
          <div className="space-y-2">
            <label className="text-xs font-black text-accent-lilac uppercase tracking-widest ml-2">
              Nama Kontrak
            </label>
            <input
              name="contractName"
              required
              value={formData.contractName}
              onChange={(e) =>
                setFormData({ ...formData, contractName: e.target.value })
              }
              className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-foreground text-sm outline-none focus:border-accent-lilac transition-all"
              placeholder="Contoh: Mudik Lebaran 2026"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-accent-lilac uppercase tracking-widest ml-2">
              Perusahaan Klien
            </label>
            <input
              name="companyName"
              required
              value={formData.companyName}
              onChange={(e) =>
                setFormData({ ...formData, companyName: e.target.value })
              }
              className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-foreground text-sm outline-none focus:border-accent-lilac transition-all"
              placeholder="Nama Perusahaan (Client)"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-accent-lilac uppercase tracking-widest ml-2">
            Cover Image URL
          </label>
          <input
            name="imageUrl"
            value={formData.imageUrl}
            onChange={(e) =>
              setFormData({ ...formData, imageUrl: e.target.value })
            }
            className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-foreground text-sm outline-none focus:border-accent-lilac transition-all"
            placeholder="Link gambar (opsional)"
          />
          {formData.imageUrl && (
            <div className="mt-4 w-full h-40 rounded-2xl overflow-hidden border border-white/10">
              <img
                src={formData.imageUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-6 border-t border-border/50">
          <Link
            href="/dashboard/manage/events/contracts"
            className="w-full sm:w-auto px-8 py-4 bg-transparent border border-border hover:border-foreground/50 text-foreground/70 hover:text-foreground rounded-[2rem] font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} /> Batal
          </Link>
          <button
            disabled={loading}
            type="submit"
            className="w-full sm:flex-1 bg-primary text-primary-foreground py-4 rounded-[2rem] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {loading ? "Menyimpan Data..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
}
