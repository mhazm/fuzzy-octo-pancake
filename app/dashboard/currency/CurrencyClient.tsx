"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
} from "lucide-react";

interface HistoryItem {
  _id: string;
  amount: number;
  type: "earn" | "spend";
  reason: string;
  createdAt: string;
}

export default function CurrencyClient({
  initialHistory,
}: {
  initialHistory: HistoryItem[];
}) {
  const [filterType, setFilterType] = useState<"all" | "earn" | "spend">("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filteredHistory = initialHistory.filter((item) => {
    const matchesFilter = filterType === "all" || item.type === filterType;
    const matchesSearch = item.reason
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / itemsPerPage));
  const currentData = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleFilterChange = (type: "all" | "earn" | "spend") => {
    setFilterType(type);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Kontrol: Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Cari transaksi..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-card/50 border border-border/50 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-accent-lilac outline-none transition-all"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "earn", "spend"] as const).map((type) => (
            <button
              key={type}
              onClick={() => handleFilterChange(type)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                filterType === type
                  ? "bg-accent-lilac border-accent-lilac text-foreground"
                  : "bg-card/50 border-border/50 text-gray-400 hover:border-accent-lilac"
              }`}
            >
              {type === "all" ? "Semua" : type === "earn" ? "Earn" : "Spend"}
            </button>
          ))}
        </div>
      </div>

      {/* Tabel Riwayat */}
      <div className="glass-panel rounded-2xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-card/80 border-b border-border/50 text-xs uppercase text-gray-400">
              <tr>
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4">Keterangan</th>
                <th className="px-6 py-4">Tipe</th>
                <th className="px-6 py-4 text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {currentData.length > 0 ? (
                currentData.map((item) => (
                  <tr
                    key={item._id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {new Date(item.createdAt).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-foreground">
                        {item.reason}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.type === "earn" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 text-green-400 text-[10px] font-bold uppercase border border-green-500/20">
                          <ArrowDownLeft className="w-3 h-3" /> Earn
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/10 text-red-400 text-[10px] font-bold uppercase border border-red-500/20">
                          <ArrowUpRight className="w-3 h-3" /> Spend
                        </span>
                      )}
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-bold ${item.type === "earn" ? "text-green-400" : "text-red-400"}`}
                    >
                      {item.type === "earn" ? "+" : ""}
                      {item.amount.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-gray-500 italic"
                  >
                    Data transaksi tidak ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
          <p className="text-sm text-muted-foreground">
            Menampilkan <span className="font-bold text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> hingga <span className="font-bold text-foreground">{Math.min(currentPage * itemsPerPage, filteredHistory.length)}</span> dari <span className="font-bold text-foreground">{filteredHistory.length}</span> transaksi
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-border/50 bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Sebelumnya
            </button>
            <div className="px-4 py-2 rounded-xl text-sm font-bold bg-accent-lilac/10 text-accent-lilac border border-accent-lilac/20">
              {currentPage} / {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-border/50 bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
