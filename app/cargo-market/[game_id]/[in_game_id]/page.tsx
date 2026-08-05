import React from "react";
import clientPromise from "@/lib/mongodb";
import { PackageOpen, Coins, ChevronLeft, AlertTriangle, ShieldAlert, Diamond, Scale, TrendingUp, TrendingDown, User as UserIcon, Truck, CheckCircle2, Clock, XCircle, Info } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import CargoMarketChart from "./CargoMarketChart";
import User from "@/lib/models/User";
import CargoMarketHistory from "@/lib/models/CargoMarketHistory.js";
import NismaraPlusBadge from "@/components/icons/NismaraPlusBadge";
import ServerBoosterBadge from "@/components/icons/ServerBoosterBadge";

export const metadata = {
  title: "Game_id Detail",
};



export const dynamic = "force-dynamic";

export default async function CargoDetailPage({
  params,
}: {
  params: Promise<{ game_id: string; in_game_id: string }>;
}) {
  const resolvedParams = await params;
  const gameId = parseInt(resolvedParams.game_id, 10);
  const inGameId = resolvedParams.in_game_id;

  if (isNaN(gameId) || !inGameId) {
    return notFound();
  }

  const client = await clientPromise;
  const db = client.db();

  // 1. Fetch Cargo Data
  const cargo = await db.collection("cargos").findOne({ game_id: gameId, in_game_id: inGameId });
  if (!cargo) {
    return notFound();
  }

  const isETS2 = cargo.game_id === 1;
  const themeColor = isETS2 ? "blue" : "red";
  const accentColor = isETS2 ? "text-blue-500" : "text-red-500";
  const bgAccent = isETS2 ? "bg-blue-500/10" : "bg-red-500/10";
  const badgeTheme = isETS2 ? "bg-blue-500 text-white" : "bg-red-500 text-white";
  const borderTheme = isETS2 ? "border-blue-500/30" : "border-red-500/30";

  // 2. Fetch CargoMarketHistory
  // Pastikan kita sudah register model jika belum
  const historyRecords = await db.collection("cargomarkethistories")
    .find({ cargo_id: cargo._id })
    .sort({ createdAt: 1 })
    .limit(100)
    .toArray();
    
  // Transform to plain objects for client component
  const historyData = historyRecords.map((record) => ({
    _id: record._id.toString(),
    new_market_demand: record.new_market_demand || 0,
    new_price: record.new_price || 0,
    createdAt: record.createdAt.toISOString(),
  }));

  // 3. Fetch Job History using this cargo
  const jobHistories = await db.collection("jobhistories")
    .find({ cargoId: inGameId })
    .sort({ startedAt: -1 })
    .limit(20)
    .toArray();

  // Populate driver names manually since we are using raw mongodb for raw query flexibility, 
  // or we can use mongoose but we'll fetch users manually to keep it fast.
  const driverIds = [...new Set(jobHistories.map((j) => j.driverId).filter(Boolean))];
  const users = await db.collection("users").find({ discordId: { $in: driverIds } }).toArray();
  const userMap = new Map(users.map((u) => [u.discordId, u]));

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "completed":
        return { icon: <CheckCircle2 size={16} />, color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20" };
      case "CANCELED":
      case "canceled":
      case "failed":
        return { icon: <XCircle size={16} />, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" };
      default:
        return { icon: <Clock size={16} />, color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20" };
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <div className={`w-full bg-card border-b border-border/50 py-12 relative overflow-hidden`}>
        <div className={`absolute inset-0 bg-gradient-to-r from-${themeColor}-500/10 via-background to-transparent z-0`} />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <Link href="/cargo-market" className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ChevronLeft size={16} /> Kembali ke Market
          </Link>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-6">
              <div className={`w-16 h-16 bg-background/80 backdrop-blur-md rounded-2xl border ${borderTheme} flex items-center justify-center shadow-xl`}>
                <PackageOpen size={32} className={accentColor} />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${badgeTheme}`}>
                    {isETS2 ? "ETS2" : "ATS"}
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter uppercase drop-shadow-lg">
                  {cargo.name}
                </h1>
                <p className="text-muted-foreground font-bold uppercase tracking-widest mt-2 text-xs">
                  Statistik & Pergerakan Harga Kargo
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8 animate-in fade-in duration-700">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: SUMMARY STATS */}
          <div className="flex flex-col gap-6">
            <div className={`glass-panel p-6 rounded-3xl border ${borderTheme} shadow-lg relative overflow-hidden`}>
              <div className={`absolute top-0 right-0 w-32 h-32 ${bgAccent} rounded-full blur-3xl -mr-10 -mt-10`} />
              
              <h2 className="text-xl font-black uppercase tracking-widest text-foreground mb-6 flex items-center gap-2">
                <Info className={accentColor} size={20} /> Informasi Kargo
              </h2>

              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-center pb-3 border-b border-border/40">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Berat Dasar</span>
                  <span className="font-black text-sm flex items-center gap-1.5"><Scale size={14} className="text-slate-400"/> {cargo.mass ? `${cargo.mass} kg` : "-"}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-border/40">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Market Demand</span>
                  <span className={`font-black text-sm flex items-center gap-1.5 ${cargo.market_demand < 0 ? 'text-red-500' : cargo.market_demand > 0 ? 'text-green-500' : 'text-slate-400'}`}>
                    {cargo.market_demand < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                    {cargo.market_demand > 0 ? `+${cargo.market_demand.toFixed(1)}%` : `${cargo.market_demand.toFixed(1)}%`}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-border/40">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Base Income</span>
                  <span className="font-black text-sm">
                    {cargo.price_per_km ? cargo.price_per_km.toLocaleString("id-ID") : "0"} NC
                  </span>
                </div>
                
                <div className={`mt-4 p-4 rounded-xl ${bgAccent} border border-border/10 flex justify-between items-center`}>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Income Final</span>
                  <div className={`flex items-center gap-1.5 font-black text-xl ${accentColor}`}>
                    <Coins size={18} /> 
                    {cargo.price_per_km_with_market_change ? cargo.price_per_km_with_market_change.toLocaleString("id-ID") : "0"} <span className="text-[10px] uppercase">NC/KM</span>
                  </div>
                </div>

                {/* BADGES */}
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/40">
                  {cargo.adr_class > 0 && (
                    <div className="flex items-center gap-1 bg-red-500/10 text-red-500 border border-red-500/20 px-2.5 py-1.5 rounded-md text-xs font-black uppercase">
                      <ShieldAlert size={14} /> ADR Class {cargo.adr_class}
                    </div>
                  )}
                  {(cargo.is_fragile || cargo.fragility > 0) && (
                    <div className="flex items-center gap-1 bg-orange-500/10 text-orange-500 border border-orange-500/20 px-2.5 py-1.5 rounded-md text-xs font-black uppercase">
                      <AlertTriangle size={14} /> Pecah Belah
                    </div>
                  )}
                  {cargo.valuable && (
                    <div className="flex items-center gap-1 bg-purple-500/10 text-purple-500 border border-purple-500/20 px-2.5 py-1.5 rounded-md text-xs font-black uppercase">
                      <Diamond size={14} /> Berharga
                    </div>
                  )}
                  {cargo.overweight && (
                    <div className="flex items-center gap-1 bg-pink-500/10 text-pink-500 border border-pink-500/20 px-2.5 py-1.5 rounded-md text-xs font-black uppercase">
                      <Scale size={14} /> Overweight
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: CHART */}
          <div className="lg:col-span-2">
            <div className="glass-panel p-6 rounded-3xl border-slate-200 dark:border-white/5 shadow-lg h-full flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                  <TrendingUp className={accentColor} size={20} /> Tren Pasar
                </h2>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Harga vs Waktu
                </div>
              </div>

              <div className="flex-1 min-h-[300px]">
                <CargoMarketChart historyData={historyData} themeColor={themeColor} />
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM: JOB HISTORY */}
        <div className="glass-panel p-6 rounded-3xl border-slate-200 dark:border-white/5 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black uppercase tracking-widest text-foreground flex items-center gap-2">
              <Truck className={accentColor} size={20} /> Riwayat Pekerjaan
            </h2>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Total: {jobHistories.length} Pekerjaan Terakhir
            </div>
          </div>

          {jobHistories.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border/50">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/50 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-4">Supir</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Rute</th>
                    <th className="px-6 py-4">Jarak</th>
                    <th className="px-6 py-4 text-right">NC Earned</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {jobHistories.map((job) => {
                    const statusConfig = getStatusConfig(job.jobStatus || job.status);
                    const isDone = job.jobStatus === "COMPLETED" || job.status === "completed";
                    const driverUser = userMap.get(job.driverId);
                    const ncValue = typeof job.nc === "object" && job.nc !== null ? job.nc.total : job.nc;
                    
                    return (
                      <tr key={job._id.toString()} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {driverUser?.image ? (
                              <img src={driverUser.image} alt="Avatar" className="w-8 h-8 rounded-full border border-border/50 object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border/50">
                                <UserIcon size={14} className="text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex flex-col">
                              <div className="flex items-center font-bold">
                                {driverUser?.name || job.driverId}
                                {driverUser?.isBooster && (
                                  <ServerBoosterBadge className="w-3.5 h-3.5" />
                                )}
                                {driverUser?.nismaraplus?.status && (
                                  <NismaraPlusBadge className="w-3.5 h-3.5" />
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                            {statusConfig.icon} {job.jobStatus || job.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-foreground/80">
                          {job.sourceCity} → {job.destinationCity}
                        </td>
                        <td className="px-6 py-4 font-bold text-muted-foreground">
                          {job.distanceKm || job.plannedDistanceKm || 0} km
                        </td>
                        <td className="px-6 py-4 text-right font-black">
                          {ncValue ? (
                            <span className="text-green-500">+{ncValue.toLocaleString("id-ID")} NC</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isDone ? (
                            <Link href={`/jobs/${job.jobId}`} className="text-xs font-bold uppercase tracking-widest text-primary hover:underline">
                              Detail
                            </Link>
                          ) : (
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Berjalan</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Truck size={48} className="text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-black uppercase tracking-widest text-foreground">Belum Ada Riwayat</h3>
              <p className="text-muted-foreground mt-1 text-sm font-medium">Belum ada supir yang mengambil pekerjaan dengan kargo ini.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
