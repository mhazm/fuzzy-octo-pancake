"use client";

import { useState } from "react";
import { Search, Trash2, UserX, ShieldAlert, ChevronRight } from "lucide-react";
import { dropDriverDataAction } from "@/app/actions/pointActions";
import Link from "next/link";

export default function PointDataUI({ initialData }: { initialData: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const filtered = initialData
    .filter(
      (d) =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.truckyId?.toString().includes(searchTerm) ||
        d.discordId?.includes(searchTerm),
    )
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const handleDrop = async (
    truckyId: number,
    discordId: string,
    name: string,
  ) => {
    const confirm = window.confirm(
      `PERINGATAN: Hapus semua data poin dan link untuk ${name}? Tindakan ini tidak bisa dibatalkan.`,
    );
    if (!confirm) return;

    setIsProcessing(discordId);
    try {
      await dropDriverDataAction(truckyId, discordId);
      alert("Data berhasil dibersihkan dari sistem.");
    } catch (err) {
      alert("Gagal menghapus data.");
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* SEARCH BAR */}
      <div className="relative group">
        <Search
          className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-accent-lilac transition-colors"
          size={20}
        />
        <input
          type="text"
          placeholder="Cari Nama Driver atau Trucky ID..."
          className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 pl-14 pr-6 text-(-primary-foreground) font-bold focus:outline-none focus:border-accent-lilac transition-all shadow-inner"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* DATA TABLE */}
      <div className="glass-panel rounded-[2.5rem] border border-white/5 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-(-primary-foreground)/30 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
            <tr>
              <th className="px-8 py-6">Driver Identity</th>
              <th className="px-8 py-6">Infraction Status</th>
              <th className="px-8 py-6 text-right">Administrative Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((driver) => (
              <tr
                key={driver.discordId}
                className="hover:bg-white/[0.02] group transition-all"
              >
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <img
                      src={
                        driver.image ||
                        `https://ui-avatars.com/api/?name=${driver.name}&background=6D28D9&color=fff`
                      }
                      className="w-12 h-12 rounded-full border border-white/10 object-cover"
                      alt=""
                    />
                    <div>
                      <p className="font-black text-(-primary-foreground) uppercase tracking-tight">
                        {driver.name}
                        {driver.isOrphaned && (
                          <span className="ml-2 text-[8px] bg-red-500 text-white px-2 py-0.5 rounded italic">
                            ORPHANED
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] font-bold text-(-primary-foreground)/30 uppercase">
                        {driver.truckyId
                          ? `ID: #${driver.truckyId}`
                          : "DRIVER LINK NOT FOUND"}
                      </p>
                      <p className="text-[8px] font-mono text-(-primary-foreground)/10 mt-0.5">
                        {driver.discordId}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 max-w-[100px] h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div
                        className={`h-full transition-all ${driver.totalPoints >= 50 ? "bg-red-500" : driver.totalPoints >= 25 ? "bg-orange-500" : "bg-accent-lilac"}`}
                        style={{
                          width: `${Math.min((driver.totalPoints / 50) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <span
                      className={`text-sm font-black italic tabular-nums ${driver.totalPoints >= 50 ? "text-red-500" : driver.totalPoints >= 10 ? "text-orange-400" : "text-accent-lilac"}`}
                    >
                      {driver.totalPoints} PTS
                    </span>
                  </div>
                </td>

                <td className="px-8 py-5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/dashboard/manage/users/${driver.truckyId}`}
                      className="p-3 bg-white/5 rounded-xl text-white/20 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <ChevronRight size={18} />
                    </Link>
                    <button
                      disabled={isProcessing === driver.discordId}
                      onClick={() =>
                        handleDrop(
                          driver.truckyId,
                          driver.discordId,
                          driver.name,
                        )
                      }
                      className="p-3 bg-red-500/10 rounded-xl text-red-500/40 hover:text-red-500 hover:bg-red-500/20 transition-all disabled:opacity-50"
                    >
                      {isProcessing === driver.discordId ? (
                        <span className="animate-spin block">●</span>
                      ) : (
                        <UserX size={18} />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-20 text-center text-(-primary-foreground)/10 font-black uppercase tracking-widest italic">
            No matching drivers found
          </div>
        )}
      </div>
    </div>
  );
}
