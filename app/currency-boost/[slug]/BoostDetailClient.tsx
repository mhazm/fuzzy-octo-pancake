"use client";

import {
  ArrowLeft,
  Trophy,
  Calendar,
  Gamepad2,
  Users,
  Zap,
  ShieldCheck,
  Truck,
  SignalHigh,
  CheckCircle,
  XCircle,
  Coins,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import UserBadges from "@/components/icons/UserBadges";

export default function BoostDetailClient({ event }: { event: any }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!mounted || !dateString) return "-";
    return (
      new Date(dateString).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      }) + " WIB"
    );
  };

  const getGameName = (id: string) => {
    if (id === "1") return "Euro Truck Simulator 2";
    if (id === "2") return "American Truck Simulator";
    return "Semua Game";
  };

  const getTypeName = (type: string) => {
    if (type === "Singleplayer") return "Singleplayer";
    if (type === "TruckersMP") return "TruckersMP";
    return "Semua Mode";
  };

  const isExpired = event.endAt ? new Date() > new Date(event.endAt) : false;
  const statusActive = event.isActive && !isExpired;

  const totalEventBonus = event.participants.reduce(
    (sum: number, p: any) => sum + (p.totalEarned || 0),
    0,
  );

  return (
    <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Navigation */}
      <Link
        href="/currency-boost"
        className="inline-flex items-center gap-2 text-accent-lilac hover:text-white transition-colors font-bold text-sm uppercase tracking-widest"
      >
        <ArrowLeft size={16} /> Kembali ke Currency Boost
      </Link>

      {/* Hero Header Section */}
      <div className="relative rounded-[3rem] overflow-hidden bg-card border border-border shadow-2xl group">
        <div className="absolute inset-0 z-0">
          <img
            src={event.imageUrl || "https://i.imgur.com/8Q0Zp0C.png"}
            alt={event.nameEvent}
            className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />
        </div>

        <div className="relative z-10 p-8 md:p-12 lg:p-16 flex flex-col md:flex-row gap-8 items-start md:items-end justify-between">
          <div className="space-y-4 max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              {statusActive ? (
                <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                  <CheckCircle size={14} /> Berjalan
                </span>
              ) : (
                <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <XCircle size={14} /> Berakhir
                </span>
              )}
              <span className="bg-accent-lilac/20 text-accent-lilac border border-accent-lilac/30 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={14} /> Official Event
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter drop-shadow-2xl">
              {event.nameEvent}
            </h1>

            <div className="flex flex-wrap gap-4 text-sm font-bold text-gray-300">
              <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-2xl backdrop-blur-sm border border-white/10">
                <Gamepad2 className="text-accent-lilac" size={18} />
                <span>{getGameName(event.gameId)}</span>
              </div>
              <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-2xl backdrop-blur-sm border border-white/10">
                <SignalHigh className="text-accent-lilac" size={18} />
                <span>{getTypeName(event.type)}</span>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 text-center bg-black/60 backdrop-blur-md border border-yellow-500/30 p-6 rounded-[2rem] shadow-[0_0_30px_rgba(234,179,8,0.2)]">
            <p className="text-yellow-500 font-black uppercase tracking-widest text-[10px] mb-2">
              Economy Surge
            </p>
            <div className="text-6xl font-black text-white drop-shadow-[0_0_15px_rgba(234,179,8,0.5)] flex items-center justify-center gap-2">
              <Zap className="text-yellow-500 fill-yellow-500" size={40} />
              {event.multiplier}x
            </div>
            <p className="text-gray-400 text-xs font-bold mt-2 uppercase tracking-wider">
              Bonus Penghasilan
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Info & Details Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 text-border opacity-20 pointer-events-none">
              <Calendar size={150} />
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-6">
              Detail Waktu
            </h3>

            <div className="space-y-6 relative z-10">
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                  Dimulai Pada
                </p>
                <p className="font-bold text-gray-200">
                  {formatDate(event.setAt)}
                </p>
              </div>
              <div className="h-px w-full bg-border" />
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                  Berakhir Pada
                </p>
                <p className="font-bold text-red-400">
                  {formatDate(event.endAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-accent-lilac/10 border border-accent-lilac/20 p-8 rounded-[2.5rem] shadow-xl text-center">
            <h3 className="text-xl font-black text-accent-lilac uppercase tracking-tight mb-4">
              Cara Berpartisipasi
            </h3>
            <p className="text-sm font-medium text-gray-300 leading-relaxed">
              Mainkan{" "}
              <strong className="text-white">
                {getGameName(event.gameId)}
              </strong>{" "}
              pada mode{" "}
              <strong className="text-white">{getTypeName(event.type)}</strong>{" "}
              selama periode event berlangsung. Semua penyelesaian job yang
              valid secara otomatis akan dikalikan dengan {event.multiplier}x!
            </p>
          </div>
        </div>

        {/* Leaderboard Panel */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border p-6 md:p-8 rounded-[2.5rem] shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                <Trophy className="text-yellow-500" size={28} /> Leaderboard
                Partisipan
              </h3>
              <div className="flex items-center gap-2">
                <div className="bg-black/50 px-4 py-2 rounded-2xl flex items-center gap-2 border border-border">
                  <Coins className="text-yellow-500" size={16} />
                  <span className="text-sm font-bold text-green-400">
                    + {totalEventBonus.toLocaleString("id-ID")} NC
                  </span>
                </div>
                <div className="bg-black/50 px-4 py-2 rounded-2xl flex items-center gap-2 border border-border">
                  <Users className="text-gray-400" size={16} />
                  <span className="text-sm font-bold text-gray-200">
                    {event.participants.length} Driver
                  </span>
                </div>
              </div>
            </div>

            {event.participants.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-border rounded-3xl">
                <Truck className="mx-auto text-gray-600 mb-4" size={48} />
                <p className="text-gray-400 font-bold uppercase tracking-widest">
                  Belum ada data partisipan
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  Selesaikan job untuk mulai muncul di leaderboard ini.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {event.participants.map((p: any, idx: number) => (
                  <div
                    key={p.discordId}
                    className={`flex items-center gap-4 p-4 rounded-2xl transition-colors ${idx < 3 ? "bg-gradient-to-r from-accent-lilac/10 to-transparent border border-accent-lilac/20" : "bg-black/20 hover:bg-black/40 border border-transparent"}`}
                  >
                    {/* Rank Number */}
                    <div
                      className={`w-8 font-black text-xl text-center ${idx === 0 ? "text-yellow-400" : idx === 1 ? "text-gray-300" : idx === 2 ? "text-amber-600" : "text-gray-600"}`}
                    >
                      #{idx + 1}
                    </div>

                    {/* Avatar & Info */}
                    <div className="flex-1 flex items-center gap-3">
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.avatarUrl}
                          alt={p.name}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-background"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm">
                            {p.name}
                          </h4>
                          <UserBadges
                            role={p.role}
                            isBooster={p.isBooster}
                            isNismaraPlus={p.isNismaraPlus}
                            nismaraPlusStartedAt={p.nismaraPlusStartedAt}
                            truckyRank={p.truckyRank}
                            className="w-4 h-4"
                          />
                        </div>
                        <p className="text-xs text-gray-500">
                          Bergabung: {formatDate(p.joinedAt)}
                        </p>
                      </div>
                    </div>

                    {/* Earnings */}
                    <div className="text-right">
                      <p className="text-green-400 font-black flex items-center justify-end gap-1">
                        +{" "}
                        {p.totalEarned.toLocaleString("id-ID", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}{" "}
                        NC
                      </p>
                      <p className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">
                        Total Bonus
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
