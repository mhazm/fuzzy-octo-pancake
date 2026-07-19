"use client";

import { useState } from "react";
import { Search, UserX, Coins, ChevronRight, AlertCircle } from "lucide-react";
import { dropCurrencyDataAction } from "@/app/actions/currencyActions";
import Link from "next/link";

export default function CurrencyDataUI({
  initialData,
}: {
  initialData: any[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const filtered = initialData
    .filter(
      (d) =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.truckyId?.toString().includes(searchTerm) ||
        d.discordId.includes(searchTerm),
    )
    .sort((a, b) => b.totalNC - a.totalNC);

  const handleDrop = async (
    truckyId: number | null,
    discordId: string,
    name: string,
  ) => {
    const confirm = window.confirm(
      `Peringatan: Hapus data SALDO N¢ untuk ${name}? Driver mungkin sudah keluar VTC. Tindakan ini permanen.`,
    );
    if (!confirm) return;

    setIsProcessing(discordId);
    try {
      await dropCurrencyDataAction(truckyId, discordId);
      alert("Saldo berhasil dibersihkan dari sistem.");
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
          placeholder="Cari Driver, Trucky ID, atau Discord ID..."
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
              <th className="px-8 py-6">Identity</th>
              <th className="px-8 py-6">Wealth Status</th>
              <th className="px-8 py-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((cur) => (
              <tr
                key={cur.discordId}
                className={`hover:bg-white/[0.02] transition-all ${cur.isOrphaned ? "bg-red-500/[0.03]" : ""}`}
              >
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <img
                      src={
                        cur.image ||
                        `https://ui-avatars.com/api/?name=${cur.name}&background=6D28D9&color=fff`
                      }
                      className="w-12 h-12 rounded-full border border-white/10 object-cover"
                      alt=""
                    />
                    <div>
                      <p className="font-black text-(-primary-foreground) uppercase tracking-tight flex items-center gap-2">
                        {cur.name}
                        {cur.isOrphaned && (
                          <span className="text-[8px] bg-red-600 text-white px-2 py-0.5 rounded italic font-black">
                            ORPHANED
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] font-bold text-(-primary-foreground)/30 uppercase">
                        {cur.truckyId
                          ? `#${cur.truckyId}`
                          : "DRIVER LINK DELETED"}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-8 py-5">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                      <Coins size={14} />
                    </div>
                    <span className="text-xl font-black tabular-nums text-emerald-500">
                      N¢ {cur.totalNC.toLocaleString("id-ID")}
                    </span>
                  </div>
                </td>

                <td className="px-8 py-5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {cur.truckyId && (
                      <Link
                        href={`/dashboard/manage/users/${cur.truckyId}`}
                        className="p-3 bg-white/5 rounded-xl text-white/20 hover:text-white hover:bg-white/10 transition-all"
                      >
                        <ChevronRight size={18} />
                      </Link>
                    )}
                    <button
                      disabled={isProcessing === cur.discordId}
                      onClick={() =>
                        handleDrop(cur.truckyId, cur.discordId, cur.name)
                      }
                      className="p-3 bg-red-500/10 rounded-xl text-red-500/40 hover:text-red-500 hover:bg-red-500/20 transition-all disabled:opacity-50"
                      title="Clear Currency Data"
                    >
                      {isProcessing === cur.discordId ? (
                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
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
            No economy records found
          </div>
        )}
      </div>
    </div>
  );
}
