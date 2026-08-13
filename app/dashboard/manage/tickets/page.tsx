"use client";

import { useState, useEffect } from "react";
import { Ticket, Settings, CheckCircle, AlertCircle, Play, UserCheck, MessageSquare, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { showAlert, showConfirm } from "@/lib/dialog";


export default function ManageTicketsPage() {
  const { data: session } = useSession();
  const [tickets, setTickets] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalHandled: 0, resolved: 0, rejected: 0 });
  const [globalStats, setGlobalStats] = useState({ totalTickets: 0, unhandled: 0, handled: 0, resolved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterManager, setFilterManager] = useState("all");
  const [staffList, setStaffList] = useState<{id: string, name: string}[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [pageLoading, setPageLoading] = useState(false);
  
  // Category Management
  const [categories, setCategories] = useState<any[]>([]);
  const [showCategorySettings, setShowCategorySettings] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Close Action State
  const [closeTicketId, setCloseTicketId] = useState<string | null>(null);
  const [closeStatus, setCloseStatus] = useState<"resolved" | "rejected">("resolved");
  const [closeReason, setCloseReason] = useState("");
  const [isClosing, setIsClosing] = useState(false);

  const fetchData = async (page = 1, status = filterStatus, manager = filterManager) => {
    try {
      setPageLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        ...(status !== "all" && { status }),
        ...(manager !== "all" && { managerId: manager }),
      });
      const [ticketsRes, catsRes] = await Promise.all([
        fetch(`/api/manage/tickets?${params}`),
        fetch("/api/manage/tickets/category")
      ]);
      const ticketsData = await ticketsRes.json();
      const catsData = await catsRes.json();

      if (ticketsData.success) {
        setTickets(ticketsData.tickets);
        setStats(ticketsData.stats);
        if (ticketsData.globalStats) setGlobalStats(ticketsData.globalStats);
        if (ticketsData.staffList) setStaffList(ticketsData.staffList);
        if (ticketsData.pagination) {
          setCurrentPage(ticketsData.pagination.currentPage);
          setTotalPages(ticketsData.pagination.totalPages);
          setTotalTickets(ticketsData.pagination.totalTickets);
        }
      }
      if (catsData.success) {
        setCategories(catsData.categories);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === "manager") {
      fetchData();
    }
  }, [session]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName) return;
    try {
      const res = await fetch("/api/manage/tickets/category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName })
      });
      const data = await res.json();
      if (data.success) {
        setNewCategoryName("");
        fetchData(1, filterStatus, filterManager);
      } else {
        await showAlert(data.error);
      }
    } catch (error) {
      await showAlert("Terjadi kesalahan");
    }
  };

  const handleClaim = async (ticketId: string, isRetake = false) => {
    const msg = isRetake 
      ? "Apakah Anda yakin ingin mengambil alih (retake) tiket ini dari manager sebelumnya?" 
      : "Apakah Anda yakin ingin mengurus tiket ini?";
    if (!await showConfirm(msg)) return;
    try {
      const res = await fetch(`/api/manage/tickets/${ticketId}/claim`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        fetchData(currentPage, filterStatus, filterManager);
      } else {
        await showAlert(data.error);
      }
    } catch (error) {
      await showAlert("Terjadi kesalahan");
    }
  };

  const handleCloseTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeTicketId || !closeReason) return await showAlert("Alasan penutupan harus diisi");
    setIsClosing(true);
    try {
      const res = await fetch(`/api/manage/tickets/${closeTicketId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: closeStatus, closingReason: closeReason })
      });
      const data = await res.json();
      if (data.success) {
        setCloseTicketId(null);
        setCloseReason("");
        setCloseStatus("resolved");
        fetchData(currentPage, filterStatus, filterManager);
        await showAlert("Tiket berhasil ditutup! Anda mendapatkan 500 NC.");
      } else {
        await showAlert(data.error);
      }
    } catch (error) {
      await showAlert("Terjadi kesalahan");
    } finally {
      setIsClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin w-10 h-10 border-4 border-accent-lilac/20 border-t-accent-lilac rounded-full"></div>
      </div>
    );
  }

  return (
    <main className="p-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white mb-2">Manajemen Tiket</h1>
          <p className="text-gray-400 text-sm">Kelola tiket bantuan dari anggota dan dapatkan reward NC.</p>
        </div>
        <button
          onClick={() => setShowCategorySettings(!showCategorySettings)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors"
        >
          <Settings className="w-5 h-5" />
          Kategori
        </button>
      </div>

      {/* GLOBAL STATS */}
      <h2 className="text-xl font-bold text-white mb-4">Statistik Global (Semua Tiket)</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-card/30 border border-border/30 rounded-2xl p-4">
          <h3 className="font-bold text-gray-500 text-xs uppercase tracking-widest mb-1">Total Tiket</h3>
          <p className="text-2xl font-black text-white">{globalStats.totalTickets}</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
          <h3 className="font-bold text-blue-400 text-xs uppercase tracking-widest mb-1">Belum Diurus</h3>
          <p className="text-2xl font-black text-blue-400">{globalStats.unhandled}</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
          <h3 className="font-bold text-yellow-400 text-xs uppercase tracking-widest mb-1">Telah Diurus</h3>
          <p className="text-2xl font-black text-yellow-400">{globalStats.handled}</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
          <h3 className="font-bold text-green-400 text-xs uppercase tracking-widest mb-1">Disetujui</h3>
          <p className="text-2xl font-black text-green-400">{globalStats.resolved}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
          <h3 className="font-bold text-red-400 text-xs uppercase tracking-widest mb-1">Ditolak</h3>
          <p className="text-2xl font-black text-red-400">{globalStats.rejected}</p>
        </div>
      </div>

      <h2 className="text-xl font-bold text-white mb-4 mt-8">Performa Pribadi (Anda)</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card/50 border border-border/50 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-400">Total Diurus (Anda)</h3>
          </div>
          <p className="text-3xl font-black text-white">{stats.totalHandled}</p>
        </div>
        <div className="bg-card/50 border border-border/50 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-400">Terselesaikan (Anda)</h3>
          </div>
          <p className="text-3xl font-black text-white">{stats.resolved}</p>
        </div>
        <div className="bg-card/50 border border-border/50 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-400">Ditolak (Anda)</h3>
          </div>
          <p className="text-3xl font-black text-white">{stats.rejected}</p>
        </div>
      </div>

      {showCategorySettings && (
        <div className="bg-card/50 border border-border/50 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Kelola Kategori Tiket</h2>
          <form onSubmit={handleAddCategory} className="flex gap-4 mb-6">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1 bg-black/50 border border-border/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-lilac"
              placeholder="Nama Kategori Baru"
              required
            />
            <button
              type="submit"
              className="px-6 py-3 bg-accent-lilac text-white font-bold rounded-xl hover:bg-accent-lilac/80 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> Tambah
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <span key={c._id} className="bg-white/10 px-3 py-1.5 rounded-full text-sm text-gray-300 border border-white/10">
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {closeTicketId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Tutup Tiket</h2>
            <form onSubmit={handleCloseTicket} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Status Penutupan</label>
                <select
                  value={closeStatus}
                  onChange={(e) => setCloseStatus(e.target.value as any)}
                  className="w-full bg-black/50 border border-border/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-lilac"
                >
                  <option value="resolved">Selesai (Resolved)</option>
                  <option value="rejected">Ditolak (Rejected)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Alasan / Pesan untuk Pengguna</label>
                <textarea
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                  className="w-full bg-black/50 border border-border/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-lilac min-h-[100px]"
                  placeholder="Jelaskan alasan penutupan..."
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCloseTicketId(null)}
                  className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isClosing}
                  className="flex-1 px-4 py-3 bg-accent-lilac hover:bg-accent-lilac/80 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {isClosing ? "Menyimpan..." : "Tutup & Klaim 500 NC"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 mt-8">
        <h2 className="text-2xl font-bold text-white">Daftar Tiket</h2>
        <div className="flex gap-3">
          <select
            value={filterManager}
            onChange={(e) => {
              setFilterManager(e.target.value);
              setCurrentPage(1);
              fetchData(1, filterStatus, e.target.value);
            }}
            className="bg-black/50 border border-border/50 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-accent-lilac text-sm"
          >
            <option value="all">Semua Staff</option>
            {staffList.map(staff => (
              <option key={staff.id} value={staff.id}>{staff.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
              fetchData(1, e.target.value, filterManager);
            }}
            className="bg-black/50 border border-border/50 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-accent-lilac text-sm"
          >
            <option value="all">Semua Status</option>
            <option value="open">Open</option>
            <option value="claimed">Claimed</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {pageLoading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-accent-lilac/20 border-t-accent-lilac rounded-full"></div>
        </div>
      ) : tickets.length > 0 ? (
        <div className="space-y-4">
          {tickets.map((t) => {
            const isMine = t.managerId === session?.user?.discordId;
            return (
              <div key={t._id} className="bg-card/50 border border-border/50 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-mono text-gray-500">{t.ticketId}</span>
                      <span className="text-xs bg-white/5 border border-white/10 px-2 py-1 rounded">{t.categoryName}</span>
                      <span className={`text-xs px-2 py-1 rounded font-bold ${
                        t.status === "open" ? "bg-blue-500/20 text-blue-400" :
                        t.status === "claimed" ? "bg-yellow-500/20 text-yellow-400" :
                        t.status === "resolved" ? "bg-green-500/20 text-green-400" :
                        "bg-red-500/20 text-red-400"
                      }`}>
                        {t.status.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{t.subject}</h3>
                    <p className="text-sm text-gray-400 mb-4 whitespace-pre-wrap">{t.description}</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                      <div>
                        <span className="text-gray-500 block mb-1">Pembuat:</span>
                        <div className="flex items-center gap-2">
                          {t.creatorInfo?.image ? (
                            <img src={t.creatorInfo.image} alt="User Avatar" className="w-6 h-6 rounded-full" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">?</div>
                          )}
                          <span className="text-gray-300 font-bold">{t.creatorInfo?.name || t.discordId}</span>
                        </div>
                      </div>
                      {t.managerId && (
                        <div>
                          <span className="text-gray-500 block mb-1">Diurus oleh:</span>
                          <div className="flex items-center gap-2">
                            {t.managerInfo?.image ? (
                              <img src={t.managerInfo.image} alt="Manager Avatar" className="w-6 h-6 rounded-full" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">?</div>
                            )}
                            <span className="text-gray-300 font-bold">{t.managerInfo?.name || t.managerId}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-gray-500">
                      Dibuat: {new Date(t.createdAt).toLocaleString("id-ID")}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[150px]">
                    {t.status === "open" && (
                      <button
                        onClick={() => handleClaim(t.ticketId, false)}
                        className="w-full py-3 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 font-bold rounded-xl transition-colors border border-blue-500/30 flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" /> Klaim
                      </button>
                    )}

                    {t.status === "claimed" && !isMine && (
                      <button
                        onClick={() => handleClaim(t.ticketId, true)}
                        className="w-full py-3 bg-orange-600/20 text-orange-400 hover:bg-orange-600/30 font-bold rounded-xl transition-colors border border-orange-500/30 flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" /> Retake
                      </button>
                    )}
                    
                    {t.status === "claimed" && isMine && (
                      <button
                        onClick={() => setCloseTicketId(t.ticketId)}
                        className="w-full py-3 bg-accent-lilac/20 text-accent-lilac hover:bg-accent-lilac/30 font-bold rounded-xl transition-colors border border-accent-lilac/30 flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" /> Selesaikan
                      </button>
                    )}

                    {(t.status === "resolved" || t.status === "rejected") && t.rating > 0 && isMine && (
                      <div className="bg-black/30 rounded-xl p-3 border border-border/30 text-center">
                        <div className="text-xs text-gray-500 mb-1">Rating Diterima:</div>
                        <div className="text-yellow-400 font-bold flex justify-center items-center gap-1">
                          <Ticket className="w-4 h-4" /> {t.rating} Bintang
                        </div>
                        {t.tipAmount > 0 && (
                          <div className="text-green-400 text-xs font-bold mt-1">
                            +{t.tipAmount} NC Tip!
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 bg-card/30 border border-border/50 rounded-2xl p-4">
              <p className="text-sm text-gray-400">
                Menampilkan halaman <span className="font-bold text-white">{currentPage}</span> dari{" "}
                <span className="font-bold text-white">{totalPages}</span>
                <span className="text-gray-500 ml-1">({totalTickets} tiket)</span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { const p = currentPage - 1; setCurrentPage(p); fetchData(p, filterStatus, filterManager); }}
                  disabled={currentPage <= 1}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                  .reduce((acc: (number | string)[], p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    typeof p === "string" ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-gray-500">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => { setCurrentPage(p); fetchData(p, filterStatus, filterManager); }}
                        className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors ${
                          currentPage === p
                            ? "bg-accent-lilac text-white shadow-lg shadow-accent-lilac/30"
                            : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => { const p = currentPage + 1; setCurrentPage(p); fetchData(p, filterStatus, filterManager); }}
                  disabled={currentPage >= totalPages}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 bg-card/30 border border-border/50 rounded-2xl">
          <MessageSquare className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-300">Belum Ada Tiket</h3>
          <p className="text-gray-500">Saat ini tidak ada tiket yang terbuka atau riwayat tiket.</p>
        </div>
      )}
    </main>
  );
}
