"use client";

import { useState } from "react";
import { fetchJobs } from "./actions";
import { useRouter } from "next/navigation";
import {
  Truck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Route,
  Clock,
  Loader2,
  Radio,
  Calendar,
} from "lucide-react";

// Helper Format Waktu WIB
function formatWIB(dateInput: string | Date | undefined) {
  if (!dateInput) return "-";
  const d = new Date(dateInput);
  return d.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export default function JobList({
  initialJobs,
  tab,
}: {
  initialJobs: any[];
  tab: "ongoing" | "completed" | "canceled";
}) {
  const [jobs, setJobs] = useState(initialJobs);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialJobs.length === 12);
  const router = useRouter();

  const loadMore = async () => {
    setIsLoading(true);
    const nextJobs = await fetchJobs(tab, jobs.length, 12);
    if (nextJobs.length < 12) setHasMore(false);
    setJobs((prev) => [...prev, ...nextJobs]);
    setIsLoading(false);
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return "-";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="w-full glass-panel rounded-2xl overflow-hidden border border-border/50 mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-card/50 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4">Pengemudi</th>
                <th className="px-6 py-4">Game</th>
                <th className="px-6 py-4">Detail Perjalanan</th>
                <th className="px-6 py-4">Performa / Tanggal</th>
                <th className="px-6 py-4 text-right">NC Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {jobs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-16 text-center text-gray-500"
                  >
                    <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    Belum ada riwayat pengiriman di kategori ini.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const totalDmg =
                    (job.damage?.vehicle || 0) +
                    (job.damage?.trailer || 0) +
                    (job.damage?.cargo || 0);

                  // Penentuan Tanggal berdasarkan tab
                  const displayDate =
                    tab === "ongoing"
                      ? job.createdAt
                      : job.completedAt || job.updatedAt;

                  return (
                    <tr
                      key={job._id}
                      onClick={() =>
                        router.push(`/jobs/${job.jobId || job._id}`)
                      }
                      className="hover:bg-card/30 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          {tab === "canceled" ? (
                            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 px-3 py-1 rounded-full text-xs font-bold border border-red-500/20">
                              <XCircle className="w-4 h-4" /> Batal
                            </div>
                          ) : tab === "ongoing" ? (
                            <div className="flex items-center gap-2 text-accent-sky bg-accent-sky/10 px-3 py-1 rounded-full text-xs font-bold border border-accent-sky/20">
                              <Radio className="w-4 h-4 animate-pulse" /> Live
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-3 py-1 rounded-full text-xs font-bold border border-green-500/20">
                              <CheckCircle className="w-4 h-4" /> Selesai
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full border border-primary/30 overflow-hidden bg-card shrink-0">
                            {job.avatarUrl ? (
                              <img
                                src={job.avatarUrl}
                                alt={job.driverName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary font-bold text-lg">
                                {job.driverName?.charAt(0) || "?"}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                              {job.driverName}
                            </div>
                            <div className="text-[10px] text-gray-500 font-mono">
                              ID: {job.truckyId}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-gray-400 bg-card/50 px-2 py-1 rounded border border-border/50">
                          {job.game?.includes("Euro") ? "ETS2" : "ATS"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-300 flex items-center gap-2 mb-1">
                          <Route className="w-4 h-4 text-accent-sky shrink-0" />
                          <span className="truncate max-w-[150px]">
                            {job.distanceKm?.toLocaleString("id-ID") || 0} km
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <Clock className="w-3 h-3 shrink-0" />{" "}
                          {formatDuration(job.durationSeconds)}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div
                            className={`text-xs font-medium flex items-center gap-1.5 ${
                              totalDmg > 5
                                ? "text-red-400"
                                : totalDmg > 0
                                  ? "text-yellow-400"
                                  : "text-green-400"
                            }`}
                          >
                            {totalDmg > 5 ? (
                              <AlertTriangle className="w-3 h-3" />
                            ) : (
                              <CheckCircle className="w-3 h-3" />
                            )}
                            {totalDmg.toFixed(1)}% Damage
                          </div>

                          <div className="text-[10px] text-gray-500 flex items-center gap-1.5 font-mono">
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span className="truncate whitespace-nowrap">
                              {displayDate
                                ? formatWIB(displayDate)
                                : "Waktu tidak dicatat"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        {(() => {
                          const netRevenue =
                            typeof job.revenue === "number"
                              ? job.revenue
                              : (job.nc?.total ?? 0);
                          const grossNC =
                            typeof job.nc === "object" && job.nc !== null
                              ? (job.nc.total ?? 0)
                              : typeof job.nc === "number"
                                ? job.nc
                                : 0;
                          const isPositive = netRevenue > 0;
                          const isNegative = netRevenue < 0;

                          return (
                            <div>
                              <div
                                className={`font-bold text-sm ${
                                  isNegative
                                    ? "text-red-400"
                                    : isPositive
                                      ? "text-yellow-500"
                                      : "text-muted-foreground"
                                }`}
                              >
                                {isPositive ? "+" : ""}
                                {netRevenue.toLocaleString("id-ID")} NC
                              </div>
                              <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                                {grossNC !== netRevenue ? (
                                  <span>
                                    Kotor: {grossNC > 0 ? "+" : ""}
                                    {grossNC.toLocaleString("id-ID")} NC
                                  </span>
                                ) : (
                                  <span>Pendapatan Bersih</span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={isLoading}
          className="px-8 py-3 bg-card border border-border text-foreground rounded-xl hover:bg-card/80 transition-all flex items-center gap-2 text-sm font-semibold"
        >
          {isLoading && (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          )}
          {isLoading ? "Sedang Memuat..." : "Tampilkan Lebih Banyak"}
        </button>
      )}
    </div>
  );
}
