"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Gift,
  ArrowLeft,
  Calendar,
  Ticket,
  Users,
  Flame,
  Trophy,
  Play,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Award,
  Crown,
} from "lucide-react";
import { showAlert, showConfirm } from "@/lib/dialog";

interface GiveawayDetailClientProps {
  giveaway: any;
  tickets: any[];
}

export default function GiveawayDetailClient({
  giveaway,
  tickets,
}: GiveawayDetailClientProps) {
  const router = useRouter();
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentGiveaway, setCurrentGiveaway] = useState(giveaway);
  const [ticketSearch, setTicketSearch] = useState("");

  const handleManualDraw = async () => {
    if (tickets.length === 0) {
      await showAlert("Belum ada tiket peserta yang terdaftar pada giveaway ini.");
      return;
    }

    const confirmed = await showConfirm(
      `Apakah Anda yakin ingin mengundi pemenang "${currentGiveaway.title}" sekarang? Sistem akan memilih pemenang secara acak dan langsung menyalurkan hadiah ke akun para pemenang.`
    );
    if (!confirmed) return;

    setIsDrawing(true);
    try {
      const res = await fetch(`/api/manage/giveaways/${currentGiveaway._id}/draw`, {
        method: "POST",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        await showAlert(data.error || "Gagal mengundi giveaway.");
      } else {
        await showAlert(data.message || "Pengundian selesai! Hadiah telah berhasil disalurkan.");
        setCurrentGiveaway((prev: any) => ({
          ...prev,
          status: "completed",
          winners: data.winners,
        }));
        router.refresh();
      }
    } catch (err: any) {
      await showAlert("Terjadi gangguan jaringan saat pengundian.");
    } finally {
      setIsDrawing(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const search = ticketSearch.toLowerCase();
    return (
      t.ticketNumber?.toLowerCase().includes(search) ||
      t.user?.name?.toLowerCase().includes(search) ||
      t.discordId?.includes(search) ||
      t.sourceType?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-8">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/manage/giveaways"
            className="p-2.5 rounded-2xl bg-card border border-border hover:border-primary/50 text-foreground transition-all"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight line-clamp-1">
                {currentGiveaway.title}
              </h1>
              {currentGiveaway.status === "completed" ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Selesai
                </span>
              ) : currentGiveaway.status === "ongoing" ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse">
                  Sedang Berjalan
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/30">
                  {currentGiveaway.status}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
              <Calendar size={12} />
              {currentGiveaway.startDate
                ? new Date(currentGiveaway.startDate).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
                : "-"}{" "}
              WIB —{" "}
              {currentGiveaway.endDate
                ? new Date(currentGiveaway.endDate).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
                : "-"}{" "}
              WIB
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={`/giveaways/${currentGiveaway.slug}`}
            target="_blank"
            className="px-4 py-2.5 rounded-xl bg-card border border-border hover:border-primary/50 text-foreground font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all"
          >
            <ExternalLink size={14} /> Tampilan Publik
          </Link>

          {currentGiveaway.status !== "completed" && (
            <button
              onClick={handleManualDraw}
              disabled={isDrawing}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50"
            >
              <Trophy size={16} />
              {isDrawing ? "Sedang Mengundi..." : "Undi Pemenang Sekarang"}
            </button>
          )}
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-card/60 border border-border/60 shadow-md">
          <span className="text-[11px] font-bold text-sky-400 uppercase flex items-center gap-1.5">
            <Ticket size={14} /> Total Tiket
          </span>
          <p className="text-2xl md:text-3xl font-black text-foreground mt-1 tabular-nums">
            {tickets.length.toLocaleString("id-ID")}
          </p>
          <span className="text-[10px] text-muted-foreground">Lembar nomor undian</span>
        </div>

        <div className="p-5 rounded-3xl bg-card/60 border border-border/60 shadow-md">
          <span className="text-[11px] font-bold text-emerald-400 uppercase flex items-center gap-1.5">
            <Users size={14} /> Peserta Unik
          </span>
          <p className="text-2xl md:text-3xl font-black text-foreground mt-1 tabular-nums">
            {new Set(tickets.map((t) => t.discordId)).size.toLocaleString("id-ID")}
          </p>
          <span className="text-[10px] text-muted-foreground">Akun pengemudi</span>
        </div>

        <div className="p-5 rounded-3xl bg-card/60 border border-border/60 shadow-md">
          <span className="text-[11px] font-bold text-amber-400 uppercase flex items-center gap-1.5">
            <Flame size={14} /> NC Terbakar
          </span>
          <p className="text-2xl md:text-3xl font-black text-amber-400 mt-1 tabular-nums">
            {(currentGiveaway.stats?.totalNcBurned || 0).toLocaleString("id-ID")} NC
          </p>
          <span className="text-[10px] text-muted-foreground">Dari tiket ekstra</span>
        </div>

        <div className="p-5 rounded-3xl bg-card/60 border border-border/60 shadow-md">
          <span className="text-[11px] font-bold text-primary uppercase flex items-center gap-1.5">
            <ShieldCheck size={14} /> Aturan Undian
          </span>
          <p className="text-sm font-black text-foreground mt-2">
            {!currentGiveaway.allowMultipleWins ? "1 User 1 Hadiah" : "Multi-Win Diizinkan"}
          </p>
          <span className="text-[10px] text-muted-foreground">Distribusi juara merata</span>
        </div>
      </div>

      {/* Podium Pemenang (Jika Sudah Selesai) */}
      {currentGiveaway.winners && currentGiveaway.winners.length > 0 && (
        <div className="p-6 rounded-3xl bg-gradient-to-b from-amber-500/10 via-card/60 to-card/40 border border-amber-500/30 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Crown size={24} />
              </div>
              <div>
                <h2 className="text-lg font-black text-foreground uppercase tracking-tight">
                  Podium Juara Giveaway
                </h2>
                <p className="text-xs text-muted-foreground">
                  Daftar driver yang memenangkan undian dan telah menerima hadiah secara otomatis.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentGiveaway.winners.map((w: any, idx: number) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-black/40 border border-amber-500/20 flex flex-col justify-between space-y-3 relative overflow-hidden"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={w.avatarUrl || "/avatar-default.png"}
                      alt={w.name}
                      className="w-10 h-10 rounded-full border border-amber-500/40 object-cover"
                    />
                    <div>
                      <h4 className="text-sm font-black text-foreground">{w.name}</h4>
                      <span className="text-[11px] font-mono text-amber-400">
                        Tiket #{w.ticketNumber}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-400 font-black text-xs uppercase tracking-wider">
                    {w.tierTitle || `Tier ${w.tier}`}
                  </span>
                </div>

                <div className="pt-2 border-t border-white/5 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Hadiah Diperoleh:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {w.rewards?.map((r: any, rIdx: number) => (
                      <span
                        key={rIdx}
                        className="px-2 py-0.5 rounded-md bg-white/5 text-[11px] font-semibold text-white/90 border border-white/10"
                      >
                        {r.title}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daftar Tiket Peserta */}
      <div className="p-6 rounded-3xl bg-card/60 border border-border/60 shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-foreground uppercase tracking-wider flex items-center gap-2">
              <Ticket size={18} className="text-sky-400" /> Daftar Tiket Terbit ({tickets.length})
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Seluruh lembar tiket yang dimiliki oleh driver yang memenuhi syarat.
            </p>
          </div>

          <input
            type="text"
            placeholder="Cari nomor tiket atau nama driver..."
            value={ticketSearch}
            onChange={(e) => setTicketSearch(e.target.value)}
            className="px-4 py-2 rounded-xl bg-black/40 border border-border text-foreground text-xs font-semibold outline-none w-full sm:w-64"
          />
        </div>

        {filteredTickets.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-xs">
            Tidak ada tiket peserta yang cocok dengan pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground uppercase text-[10px] font-black tracking-wider">
                  <th className="pb-3">No. Tiket</th>
                  <th className="pb-3">Driver</th>
                  <th className="pb-3">Metode Tiket</th>
                  <th className="pb-3">Biaya NC</th>
                  <th className="pb-3 text-right">Waktu Terbit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-medium">
                {filteredTickets.map((t) => (
                  <tr key={t._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 font-mono font-black text-sky-400">#{t.ticketNumber}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        {t.user?.image ? (
                          <img
                            src={t.user.image}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                            {t.user?.name?.slice(0, 1) || "D"}
                          </div>
                        )}
                        <span className="font-bold text-foreground">{t.user?.name || `Driver #${t.discordId.slice(-4)}`}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      {t.sourceType === "QUEST" ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Misi Game (Gratis)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Beli NC Ekstra
                        </span>
                      )}
                    </td>
                    <td className="py-3 font-mono text-muted-foreground">
                      {t.costNC ? `${t.costNC.toLocaleString("id-ID")} NC` : "-"}
                    </td>
                    <td className="py-3 text-right text-muted-foreground">
                      {t.createdAt
                        ? new Date(t.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
