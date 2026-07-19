"use client";

import { useState, useEffect } from "react";
import { submitLeaveRequest } from "@/app/actions/adminActions";
import {
  Clock,
  CheckCircle2,
  XCircle,
  List,
  User as UserIcon,
  Wallet,
  AlertTriangle,
  Briefcase,
  Calendar,
  MapPin,
  History,
  Info,
  TrendingDown,
  TrendingUp,
  Shield,
  Coins,
  Route,
  TriangleAlert,
} from "lucide-react";

export default function ManageUserUI({
  user,
  ncHistory,
  pointHistory,
  jobs,
  userNc,
  userPoint,
  leaveHistory,
  managerSession,
  memberData,
  driverLink,
}: any) {
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Mencegah Hydration Error
  useEffect(() => {
    setMounted(true);
  }, []);

  const formatDate = (dateString: string) => {
    if (!mounted || !dateString) return "";
    return new Date(dateString).toLocaleDateString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "numeric",
      month: "long",
      year: "numeric",
    }); // Format: DD/MM/YYYY[cite: 16]
  };

  const currentPoints = userPoint?.totalPoints || 0;
  const maxPoints = 50;
  const progress = Math.min((currentPoints / maxPoints) * 100, 100);

  const getStatusConfig = (status: string) => {
    switch (status?.toLowerCase()) {
      case "ongoing":
        return {
          color: "text-blue-400",
          bg: "bg-blue-500/10",
          icon: <Clock size={12} />,
          label: "Berjalan",
        };
      case "completed":
        return {
          color: "text-green-400",
          bg: "bg-green-500/10",
          icon: <CheckCircle2 size={12} />,
          label: "Selesai",
        };
      case "canceled":
        return {
          color: "text-red-400",
          bg: "bg-red-500/10",
          icon: <XCircle size={12} />,
          label: "Dibatalkan",
        };
      default:
        return {
          color: "text-gray-400",
          bg: "bg-gray-500/10",
          icon: <List size={12} />,
          label: status || "Unknown",
        };
    }
  };

  const handleLeaveSubmit = async (e: any) => {
    e.preventDefault();
    await submitLeaveRequest({
      ...formData,
      truckyId: user.truckyId,
      userId: user.discordId,
      managerId: managerSession.discordId,
      managerName: managerSession.name,
    });
    setIsModalOpen(false);
  };

  const joinDate = driverLink?.createdAt
    ? new Date(driverLink.createdAt).toLocaleDateString("id-ID")
    : "-";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
      {/* 1. HEADER PROFILE */}
      <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="flex items-center gap-6 relative z-10">
          <div className="relative group">
            <div className="absolute -inset-1 bg-linear-to-r from-accent-lilac to-blue-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <img
              src={
                user.image ||
                `https://ui-avatars.com/api/?name=${user.name}&background=6D28D9&color=fff`
              }
              alt={user.name}
              className="w-24 h-24 rounded-full border-2 border-white/10 object-cover relative"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-(-primary-foreground) tracking-tighter">
                {user.name}
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${user.isOnLeave ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}
              >
                {user.isOnLeave ? "On Leave" : "Active"}
              </span>
            </div>
            <p className="text-accent-lilac font-bold flex items-center gap-2 font-mono">
              <span
                className="px-3 py-1 rounded-full text-xs font-bold border"
                style={{
                  backgroundColor: `${memberData.rank.color}20`,
                  color: memberData.rank.color,
                  borderColor: `${memberData.rank.color}50`,
                }}
              >
                {memberData.rank.name}
              </span>
              ID: #{user.truckyId}
            </p>
            <p className="text-(-primary-foreground)/80 font-bold flex items-center gap-2">
              {memberData.role.name} Nismara Transport
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 justify-center relative z-10">
          <div className="px-6 py-4 bg-white/5 rounded-3xl border border-white/10 text-center min-w-[140px]">
            <p className="text-[10px] font-black text-(-primary-foreground)/40 uppercase flex items-center justify-center gap-1">
              <Wallet size={12} /> Gabung Nismara
            </p>
            <p className="text-2xl font-black text-(-primary-foreground)">
              {joinDate}
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-accent-lilac hover:bg-accent-lilac/80 text-(-primary-foreground) px-8 py-4 rounded-3xl font-black uppercase tracking-tighter transition-all flex items-center gap-2 shadow-xl shadow-accent-lilac/20"
          >
            <Calendar size={18} /> Manage Leave
          </button>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-(-primary-foreground)">
        <Shield className="text-accent-lilac" /> Statistik {user.name} di
        Nismara
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
          <Coins className="absolute top-4 right-4 w-12 h-12 text-yellow-500/20 group-hover:text-yellow-500/40 transition-colors" />
          <p className="text-sm text-gray-400 mb-1">Total Nismara Coins</p>
          <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-yellow-400 to-yellow-600">
            {userNc.totalNC?.toLocaleString("id-ID")}
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
          <Route className="absolute top-4 right-4 w-12 h-12 text-blue-500/20 group-hover:text-blue-500/40 transition-colors" />
          <p className="text-sm text-gray-400 mb-1">Total Jarak Tempuh</p>
          <p className="text-4xl font-bold text-(-primary-foreground)">
            {memberData.total_driven_distance_km?.toLocaleString("id-ID")} Km
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
          <TriangleAlert className="absolute top-4 right-4 w-12 h-12 text-red-500/20 group-hover:text-red-500/40 transition-colors" />
          <p className="text-sm text-gray-400 mb-1">Total Poin Penalty</p>
          <p className="text-4xl font-bold text-(-primary-foreground)">
            {currentPoints} Point
          </p>
        </div>
      </div>

      {/* 4. RECENT JOBS activity[cite: 16, 18] */}
      <div className="glass-panel rounded-[2rem] border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 bg-white/5 flex items-center gap-2">
          <Briefcase size={16} className="text-accent-lilac" />
          <h3 className="font-black text-(-primary-foreground)/50 uppercase tracking-widest text-xs">
            Job Records (Last Job : {memberData.last_job_days} Days)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-white/5">
              {jobs.map((job: any, i: number) => {
                const status = getStatusConfig(job.status);
                return (
                  <tr
                    key={i}
                    className="hover:bg-white/[0.02] group transition-all"
                  >
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/5 rounded-lg group-hover:bg-accent-lilac/10 transition-colors">
                          <MapPin
                            size={14}
                            className="text-(-primary-foreground)/40"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-(-primary-foreground) uppercase leading-none mb-1">
                            {job.cargoName || job.cargo}
                          </p>
                          <p className="text-[10px] text-(-primary-foreground)/20 uppercase font-bold tabular-nums">
                            {job.sourceCity} → {job.destinationCity}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4 font-black text-emerald-400 tabular-nums">
                      N¢{" "}
                      {job.income?.toLocaleString("id-ID") ||
                        job.nc?.total?.toLocaleString("id-ID") ||
                        0}
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase ${status.bg} ${status.color} border-white/5`}
                      >
                        {status.icon} {status.label}
                      </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase ${status.bg} ${status.color} border-white/5`}
                      >
                        {" "}
                        {new Date(job.updatedAt).toLocaleDateString("id-ID")}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-panel rounded-[2rem] border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 bg-white/5 flex items-center gap-2">
          <Info size={16} className="text-accent-lilac" />
          <h3 className="font-black text-(-primary-foreground)/50 uppercase tracking-widest text-xs">
            Absence History
          </h3>
        </div>
        <div className="overflow-x-auto">
          {/* Mengganti table & tbody dengan div agar valid secara HTML */}
          <div className="flex flex-col divide-y divide-white/5">
            {leaveHistory.slice(0, 3).map((l: any, i: number) => (
              <div
                key={i}
                className="p-6 space-y-3 hover:bg-white/[0.03] transition-colors group"
              >
                <div className="flex justify-between items-center text-[15px] font-black text-accent-lilac uppercase tracking-tight">
                  <span>{formatDate(l.startDate)}</span>
                  <span className="mx-2 opacity-30 text-(-primary-foreground)">
                    —
                  </span>
                  <span>{formatDate(l.endDate)}</span>
                </div>

                <p className="text-sm text-(-primary-foreground)/70 italic leading-relaxed">
                  "{l.reason}"
                </p>

                <div className="flex flex-col items-end gap-1 pt-2 border-t border-white/5">
                  <p className="text-[10px] font-black text-(-primary-foreground)/20 uppercase tracking-widest">
                    Auth: {l.managerName}
                  </p>
                  <p className="text-[9px] font-bold text-(-primary-foreground)/10 uppercase tabular-nums">
                    Processed: {formatDate(l.createdAt)}
                  </p>
                </div>
              </div>
            ))}

            {leaveHistory.length === 0 && (
              <div className="p-10 text-center text-(-primary-foreground)/10 font-black uppercase tracking-widest italic text-xs">
                No absence records found
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* 2. PENALTY MONITORING */}
          <div className="glass-panel p-8 rounded-[2rem] border border-white/5 bg-gradient-to-br from-white/5 to-transparent shadow-inner">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <AlertTriangle className="text-red-500" size={20} />
                </div>
                <h3 className="font-black text-lg text-(-primary-foreground) uppercase">
                  Penalty System
                </h3>
              </div>
              <p className="text-4xl font-black text-(-primary-foreground) italic tabular-nums">
                {currentPoints}
                <span className="text-sm text-(-primary-foreground)/20 not-italic ml-1">
                  /50
                </span>
              </p>
            </div>

            <div className="relative h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 mb-8">
              <div
                className={`h-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(0,0,0,0.4)] ${currentPoints >= 50 ? "bg-red-600" : currentPoints >= 25 ? "bg-orange-500" : "bg-accent-lilac"}`}
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              {["SP1", "SP2", "SP3"].map((sp, idx) => {
                const thresholds = [10, 25, 50]; //[cite: 16]
                const active = currentPoints >= thresholds[idx];
                return (
                  <div
                    key={sp}
                    className={`p-4 rounded-2xl border transition-all ${active ? "bg-white/5 border-white/20" : "opacity-20 border-transparent text-(-primary-foreground)/40"}`}
                  >
                    <p className="text-[10px] font-black uppercase tracking-widest">
                      {sp}
                    </p>
                    <p
                      className={`text-lg font-black ${active ? "text-(-primary-foreground)" : ""}`}
                    >
                      {thresholds[idx]} Poin
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. POINT INFRACTION LOGS (PENTING!) */}
          <div className="glass-panel rounded-[2rem] border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-white/5 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              <h3 className="font-black text-(-primary-foreground)/50 uppercase tracking-widest text-xs">
                Point Infraction History
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-white/5">
                  {pointHistory.map((p: any, i: number) => (
                    <tr
                      key={i}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-8 py-5">
                        <p className="font-bold text-(-primary-foreground) leading-tight">
                          {p.reason}
                        </p>
                        <p className="text-[10px] font-black text-(-primary-foreground)/20 uppercase mt-1 tabular-nums">
                          {formatDate(p.createdAt)}
                        </p>
                      </td>
                      <td
                        className={`px-8 py-5 text-right font-black tabular-nums italic text-lg flex items-center justify-end gap-2 ${p.type === "add" ? "text-red-500" : "text-emerald-500"}`}
                      >
                        {p.type === "add" ? (
                          <TrendingUp size={16} />
                        ) : (
                          <TrendingDown size={16} />
                        )}
                        {p.type === "add" ? "+" : "-"}
                        {p.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 5. RIGHT COLUMN */}
        <div className="space-y-6">
          {/* NC LOGS */}
          <div className="glass-panel rounded-[2rem] border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-white/5 flex items-center gap-2 font-black text-(-primary-foreground)/50 uppercase text-xs tracking-widest">
              <History size={14} className="text-accent-lilac" /> Financial Log
            </div>
            <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar">
              {ncHistory.map((tx: any, i: number) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex justify-between items-center hover:bg-white/[0.06] transition-all"
                >
                  <div className="space-y-1">
                    <p className="text-[11px] font-black text-(-primary-foreground) leading-none truncate w-32">
                      {tx.reason || "Job Income"}
                    </p>
                    <p className="text-[9px] font-bold text-(-primary-foreground)/20 uppercase tabular-nums">
                      {formatDate(tx.createdAt)}
                    </p>
                  </div>
                  <p
                    className={`font-black text-xs tabular-nums ${tx.type === "earn" ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {tx.type === "earn" ? "+" : "-"}
                    {tx.amount.toLocaleString("id-ID")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL MANAGE LEAVE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#161b22] w-full max-w-md border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent-lilac/10 rounded-lg text-accent-lilac">
                  <Calendar size={20} />
                </div>
                <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">
                  Manage Leave
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleLeaveSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">
                    Mulai Cuti
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-accent-lilac transition-all text-xs font-bold"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">
                    Selesai Cuti
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-accent-lilac transition-all text-xs font-bold"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">
                  Alasan Cuti
                </label>
                <textarea
                  required
                  placeholder="Contoh: Perbaikan PC atau urusan keluarga..."
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-accent-lilac transition-all resize-none text-sm font-medium"
                  rows={3}
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-4 bg-accent-lilac text-white font-black uppercase tracking-widest rounded-2xl hover:bg-accent-lilac/80 transition-all shadow-lg shadow-accent-lilac/20 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} /> Ajukan Cuti
                </button>
                <p className="text-center mt-4 text-[9px] font-bold text-gray-500 uppercase tracking-widest italic">
                  Data ini akan langsung diproses oleh sistem Nismara.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
