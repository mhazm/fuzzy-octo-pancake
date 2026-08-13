"use client";

import { useState, useEffect } from "react";
import {
  Users, Search, Briefcase, Coins, Trophy, Car, ShoppingBag, Ticket,
  Dices, Target, Clock, ChevronDown, ChevronUp, MapPin, Zap, TrendingUp,
  User, AlertTriangle, Star, ShieldCheck, Flag, CheckCircle2, Flame, ArrowRight
} from "lucide-react";
import Swal from "sweetalert2";

export default function InternMonitorClient() {
  const [interns, setInterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchInterns();
  }, []);

  const fetchInterns = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/manage/interns");
      const data = await res.json();
      if (data.success) {
        setInterns(data.interns);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = interns.filter(
    (i) =>
      search === "" ||
      i.name?.toLowerCase().includes(search.toLowerCase()) ||
      i.discordId?.includes(search)
  );

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleInterview = async (intern: any) => {
    const confirm = await Swal.fire({
      title: "Mulai Interview?",
      text: `Sistem akan membuat channel Discord dan mengundang ${intern.name} untuk ujian.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Mulai!",
      cancelButtonText: "Batal",
      background: "#1e1e2d",
      color: "#ffffff"
    });

    if (!confirm.isConfirmed) return;

    setActionLoading(intern._id);
    try {
      const res = await fetch(`/api/manage/interns/${intern.discordId}/interview`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        Swal.fire({ icon: "success", title: "Berhasil", text: data.message, background: "#1e1e2d", color: "#ffffff" });
      } else {
        Swal.fire({ icon: "error", title: "Gagal", text: data.error, background: "#1e1e2d", color: "#ffffff" });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: "error", title: "Error", text: "Terjadi kesalahan sistem", background: "#1e1e2d", color: "#ffffff" });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePromote = async (intern: any) => {
    const confirm = await Swal.fire({
      title: "Promosikan ke Sopir?",
      text: `Role ${intern.name} di Discord akan diubah dari Intern menjadi Driver.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      confirmButtonText: "Ya, Promosikan!",
      cancelButtonText: "Batal",
      background: "#1e1e2d",
      color: "#ffffff"
    });

    if (!confirm.isConfirmed) return;

    setActionLoading(intern._id);
    try {
      const res = await fetch(`/api/manage/interns/${intern.discordId}/promote`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        Swal.fire({ icon: "success", title: "LULUS!", text: data.message, background: "#1e1e2d", color: "#ffffff" });
        fetchInterns();
      } else {
        Swal.fire({ icon: "error", title: "Gagal", text: data.error, background: "#1e1e2d", color: "#ffffff" });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: "error", title: "Error", text: "Terjadi kesalahan sistem", background: "#1e1e2d", color: "#ffffff" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetQuiz = async (intern: any) => {
    const confirm = await Swal.fire({
      title: "Reset Kesempatan Ujian?",
      text: `Intern ${intern.name} sudah gagal 2 kali. Anda akan menghapus riwayat ujiannya agar dia bisa mengulang ujian lagi.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f59e0b",
      confirmButtonText: "Ya, Reset!",
      cancelButtonText: "Batal",
      background: "#1e1e2d",
      color: "#ffffff"
    });

    if (!confirm.isConfirmed) return;

    setActionLoading(intern._id);
    try {
      const res = await fetch(`/api/manage/interns/${intern.discordId}/reset-quiz`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        Swal.fire({ icon: "success", title: "Berhasil", text: data.message, background: "#1e1e2d", color: "#ffffff" });
        fetchInterns();
      } else {
        Swal.fire({ icon: "error", title: "Gagal", text: data.error, background: "#1e1e2d", color: "#ffffff" });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: "error", title: "Error", text: "Terjadi kesalahan sistem", background: "#1e1e2d", color: "#ffffff" });
    } finally {
      setActionLoading(null);
    }
  };

  const StatCard = ({ icon: Icon, label, value, sub, color = "text-white" }: any) => (
    <div className="bg-black/30 border border-border/30 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{label}</span>
      </div>
      <div className={`text-lg font-black ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <main className="p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white mb-2">Pemantauan Intern</h1>
          <p className="text-gray-400 text-sm">
            Monitor progres dan aktivitas sopir magang untuk evaluasi kelayakan promosi.
          </p>
        </div>
        <div className="bg-accent-lilac/20 border border-accent-lilac/30 text-accent-lilac text-sm font-bold px-4 py-2 rounded-xl">
          {interns.length} Intern Aktif
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama atau Discord ID..."
          className="pl-10 pr-4 py-3 bg-black/50 border border-border/50 rounded-xl text-white text-sm focus:outline-none focus:border-accent-lilac w-full"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-accent-lilac/20 border-t-accent-lilac rounded-full"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card/30 border border-border/50 rounded-2xl">
          <Users className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-300">
            {search ? "Tidak ditemukan" : "Tidak Ada Intern"}
          </h3>
          <p className="text-gray-500">
            {search ? "Coba kata kunci lain." : "Saat ini tidak ada sopir dengan status Intern."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((intern) => (
            <div
              key={intern._id}
              className="bg-card/50 border border-border/50 rounded-2xl overflow-hidden transition-all"
            >
              {/* Summary Row */}
              <button
                onClick={() => toggleExpand(intern._id)}
                className="w-full p-5 flex items-center gap-4 hover:bg-white/[0.02] transition-colors text-left"
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full overflow-hidden bg-black/50 border border-border/50 flex-shrink-0">
                  {intern.image ? (
                    <img src={intern.image} alt={intern.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-full h-full p-2 text-gray-500" />
                  )}
                </div>

                {/* Name & Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-white truncate">{intern.name}</h3>
                    {intern.isOnLeave && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full">
                        CUTI
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {intern.daysSinceJoin} hari magang
                    </span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {intern.jobs.total} pekerjaan
                    </span>
                    <span className="flex items-center gap-1">
                      <Coins className="w-3 h-3" />
                      {intern.jobs.netIncome.toLocaleString()} NC
                    </span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="hidden md:flex items-center gap-6 text-xs">
                  <div className="text-center">
                    <div className="text-gray-500 mb-0.5">Level</div>
                    <div className="font-black text-accent-lilac text-base">{intern.level}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-500 mb-0.5">XP</div>
                    <div className="font-bold text-white">{intern.xp.toLocaleString()}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-500 mb-0.5">Fleet</div>
                    <div className={`font-bold ${intern.fleet.hasFleet ? "text-green-400" : "text-red-400"}`}>
                      {intern.fleet.hasFleet ? `${intern.fleet.count} unit` : "Belum"}
                    </div>
                  </div>
                </div>

                {/* Expand Toggle */}
                {expandedId === intern._id ? (
                  <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                )}
              </button>

              {/* Expanded Detail */}
              {expandedId === intern._id && (
                <div className="px-5 pb-5 border-t border-border/30 pt-5 space-y-6">
                  {/* Info Dasar */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Informasi Dasar</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <StatCard icon={Clock} label="Mulai Magang" value={intern.joinedAt ? new Date(intern.joinedAt).toLocaleDateString("id-ID") : "-"} sub={`${intern.daysSinceJoin} hari yang lalu`} color="text-blue-400" />
                      <StatCard icon={Zap} label="Level / XP" value={`Lv.${intern.level}`} sub={`${intern.xp.toLocaleString()} XP`} color="text-accent-lilac" />
                      <StatCard icon={Car} label="Fleet" value={intern.fleet.hasFleet ? `${intern.fleet.count} Unit` : "Belum Punya"} color={intern.fleet.hasFleet ? "text-green-400" : "text-red-400"} />
                      <StatCard icon={Ticket} label="Tiket Support" value={intern.tickets.total} color="text-gray-300" />
                    </div>
                  </div>

                  {/* Pekerjaan */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">📦 Pekerjaan & Keuangan</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <StatCard icon={Briefcase} label="Total Pekerjaan" value={intern.jobs.total} color="text-blue-400" />
                      <StatCard icon={MapPin} label="Jarak Tempuh" value={`${intern.jobs.distanceKm.toLocaleString()} km`} color="text-cyan-400" />
                      <StatCard icon={TrendingUp} label="NC Diperoleh" value={`${intern.jobs.ncEarned.toLocaleString()} NC`} color="text-green-400" />
                      <StatCard icon={Coins} label="NC Pengeluaran" value={`${intern.jobs.ncCost.toLocaleString()} NC`} color="text-red-400" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                      <StatCard icon={Coins} label="Pendapatan Bersih" value={`${intern.jobs.netIncome.toLocaleString()} NC`} color={intern.jobs.netIncome >= 0 ? "text-green-400" : "text-red-400"} />
                      <StatCard icon={Zap} label="XP dari Kerja" value={intern.jobs.xpEarned.toLocaleString()} color="text-purple-400" />
                      <StatCard icon={CheckCircle2} label="Job Divalidasi" value={intern.jobs.validatedJobs} color="text-emerald-400" />
                      <StatCard icon={AlertTriangle} label="Total Poin Penalti" value={intern.jobs.totalPenalty} color="text-yellow-400" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      {/* Special Contract */}
                      <div className="bg-black/30 border border-border/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-bold text-white">Special Contract</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Diselesaikan</div>
                            <div className="text-lg font-bold text-white">{intern.jobs.specialContractJobs} <span className="text-xs text-gray-500 font-normal">job</span></div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Total Pendapatan</div>
                            <div className="text-lg font-bold text-green-400">{intern.jobs.specialContractIncome.toLocaleString()} <span className="text-xs text-gray-500 font-normal">NC</span></div>
                          </div>
                        </div>
                      </div>

                      {/* Hardcore Mode */}
                      <div className="bg-black/30 border border-border/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Flame className="w-4 h-4 text-orange-500" />
                          <span className="text-sm font-bold text-white">Hardcore Mode</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Diselesaikan</div>
                            <div className="text-lg font-bold text-white">{intern.jobs.hardcoreJobs} <span className="text-xs text-gray-500 font-normal">job</span></div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Rata-rata Rating</div>
                            <div className="text-lg font-bold text-orange-400 flex items-center gap-1">
                              {intern.jobs.hardcoreRatingAvg} <Star className="w-4 h-4 fill-orange-400" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Komunitas & Event */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">👥 Komunitas & Pencapaian</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Convoy */}
                      <div className="bg-black/30 border border-border/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Flag className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-bold text-white">Partisipasi Convoy</span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between"><span className="text-gray-500">Tertarik (Interested)</span><span className="text-white font-bold">{intern.convoy.interested}x</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Hadir & Selesai</span><span className="text-green-400 font-bold">{intern.convoy.joined}x</span></div>
                        </div>
                      </div>

                      {/* Achievements */}
                      <div className="bg-black/30 border border-border/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Star className="w-4 h-4 text-yellow-400" />
                          <span className="text-sm font-bold text-white">Achievement</span>
                        </div>
                        <div className="flex flex-col justify-center h-[46px]">
                          <div className="text-2xl font-black text-yellow-400">
                            {intern.achievements.total} <span className="text-xs text-gray-500 font-normal uppercase tracking-wider">Badge Diperoleh</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Aktivitas Hiburan */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">🎰 Aktivitas Hiburan</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Lotto */}
                      <div className="bg-black/30 border border-border/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Dices className="w-4 h-4 text-purple-400" />
                          <span className="text-sm font-bold text-white">Lotto</span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between"><span className="text-gray-500">Tiket Dibeli</span><span className="text-white font-bold">{intern.lotto.tickets}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Menang</span><span className="text-green-400 font-bold">{intern.lotto.wins}x</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Total Hadiah</span><span className="text-yellow-400 font-bold">{intern.lotto.won.toLocaleString()} NC</span></div>
                        </div>
                      </div>

                      {/* Scratch */}
                      <div className="bg-black/30 border border-border/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Target className="w-4 h-4 text-amber-400" />
                          <span className="text-sm font-bold text-white">Scratch Card</span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between"><span className="text-gray-500">Tiket Dibeli</span><span className="text-white font-bold">{intern.scratch.tickets}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Uang Dihabiskan</span><span className="text-red-400 font-bold">{intern.scratch.spent.toLocaleString()} NC</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Menang</span><span className="text-green-400 font-bold">{intern.scratch.wins}x ({intern.scratch.won.toLocaleString()} NC)</span></div>
                        </div>
                      </div>

                      {/* Racing */}
                      <div className="bg-black/30 border border-border/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Trophy className="w-4 h-4 text-rose-400" />
                          <span className="text-sm font-bold text-white">Pacuan Truk</span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between"><span className="text-gray-500">Total Taruhan</span><span className="text-white font-bold">{intern.racing.bets}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">NC Ditaruhkan</span><span className="text-red-400 font-bold">{intern.racing.betAmount.toLocaleString()} NC</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Menang</span><span className="text-green-400 font-bold">{intern.racing.wins}x ({intern.racing.won.toLocaleString()} NC)</span></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Market */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">🛒 Aktivitas Market</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <StatCard icon={ShoppingBag} label="Mod Dibeli" value={intern.market.purchases} color="text-cyan-400" />
                      <StatCard icon={Coins} label="NC Dibelanjakan" value={`${intern.market.spent.toLocaleString()} NC`} color="text-amber-400" />
                    </div>
                  </div>

                  {/* Interview Action */}
                  <div className="border-t border-border/30 pt-6 mt-4 flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1">Evaluasi & Promosi</h4>
                      <div className="text-xs text-gray-500">
                        {intern.quiz ? (
                          <div className="flex items-center gap-2 mt-1">
                            Status Ujian: 
                            <span className={`font-bold px-2 py-0.5 rounded-full ${intern.quiz.passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {intern.quiz.passed ? 'LULUS' : 'GAGAL'}
                            </span>
                            | Skor: <span className="font-bold text-white">{intern.quiz.latestScore}</span> 
                            | Percobaan: <span className="font-bold text-white">{intern.quiz.attemptCount}x</span>
                          </div>
                        ) : (
                          "Belum ada data ujian kelayakan."
                        )}
                      </div>
                    </div>
                    
                    {intern.quiz?.passed ? (
                      <button 
                        onClick={() => handlePromote(intern)}
                        disabled={actionLoading === intern._id}
                        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                      >
                        {actionLoading === intern._id ? "Memproses..." : "Luluskan (Promosi)"} <CheckCircle2 className="w-4 h-4" />
                      </button>
                    ) : intern.quiz?.attemptCount >= 2 ? (
                      <button 
                        onClick={() => handleResetQuiz(intern)}
                        disabled={actionLoading === intern._id}
                        className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                      >
                        {actionLoading === intern._id ? "Memproses..." : "Reset Ujian"} <AlertTriangle className="w-4 h-4" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleInterview(intern)}
                        disabled={actionLoading === intern._id}
                        className="flex items-center gap-2 bg-accent-lilac hover:bg-accent-lilac/80 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                      >
                        {actionLoading === intern._id ? "Memproses..." : "Mulai Interview"} <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
