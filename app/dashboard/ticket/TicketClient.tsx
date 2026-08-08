"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Ticket, Plus, Star, CheckCircle, XCircle, AlertCircle, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { showAlert } from "@/lib/dialog";


export default function TicketPage() {
  const { data: session } = useSession();
  const [tickets, setTickets] = useState<any[]>([]);
  const [stats, setStats] = useState({ opened: 0, resolved: 0, rejected: 0 });
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [discordGuildId, setDiscordGuildId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [pageLoading, setPageLoading] = useState(false);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Dynamic Fields
  const [dynamicJobId, setDynamicJobId] = useState("");
  const [dynamicReportUser, setDynamicReportUser] = useState("");
  const [selectedCategoryName, setSelectedCategoryName] = useState("");

  // Rating State
  const [ratingData, setRatingData] = useState<{ id: string; rating: number; tip: number } | null>(null);

  const fetchData = async (page = 1, status = filterStatus) => {
    try {
      setPageLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        ...(status !== "all" && { status }),
      });
      const [ticketsRes, catsRes] = await Promise.all([
        fetch(`/api/tickets?${params}`),
        fetch("/api/manage/tickets/category")
      ]);
      const ticketsData = await ticketsRes.json();
      const catsData = await catsRes.json();

      if (ticketsData.success) {
        setTickets(ticketsData.tickets);
        setStats(ticketsData.stats);
        if (ticketsData.discordGuildId) {
          setDiscordGuildId(ticketsData.discordGuildId);
        }
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
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  useEffect(() => {
    if (categories.length > 0) {
      const searchParams = new URLSearchParams(window.location.search);
      const prefillJobId = searchParams.get("jobId");
      const prefillCommentId = searchParams.get("commentId");
      const prefillPostId = searchParams.get("postId");
      const prefillReportedUser = searchParams.get("reportedUser");
      const prefillCommentText = searchParams.get("commentText");

      if (prefillJobId) {
        const bandingCat = categories.find((c) => c.name.toLowerCase().includes("banding"));
        if (bandingCat) {
          setCategoryId(bandingCat._id);
          setSelectedCategoryName(bandingCat.name);
          setShowForm(true);
          setDynamicJobId(prefillJobId);
        }
      } else if (prefillCommentId && prefillPostId) {
        const reportCat = categories.find((c) => c.name.toLowerCase().includes("report komentar")) || categories.find((c) => c.name.toLowerCase().includes("report"));
        if (reportCat) {
          setCategoryId(reportCat._id);
          setSelectedCategoryName(reportCat.name);
          setShowForm(true);
          setSubject(`Report Komentar Galeri`);
          setDynamicReportUser(prefillReportedUser ? prefillReportedUser : `Komentar ID: ${prefillCommentId}`); // Use real user name if available
          
          let prefillDescription = `Saya ingin melaporkan sebuah komentar di Galeri.\n\nLink Postingan: ${window.location.origin}/p/${prefillPostId}\n`;
          if (prefillCommentText) {
             prefillDescription += `\nKomentar asli:\n"${prefillCommentText}"\n`;
          }
          prefillDescription += `\nAlasan pelaporan:\n`;
          setDescription(prefillDescription);
        }
      }
    }
  }, [categories]);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const categoryName = categories.find((c) => c._id === categoryId)?.name || "Lainnya";
      
      let finalSubject = subject;
      if (categoryName.toLowerCase().includes("banding")) {
        if (!dynamicJobId) { await showAlert("Isi Job ID"); setSubmitting(false); return; }
        finalSubject = `Banding Job: ${dynamicJobId}`;
      } else if (categoryName.toLowerCase().includes("report")) {
        if (!dynamicReportUser) { await showAlert("Isi nama user"); setSubmitting(false); return; }
        finalSubject = `Report User: ${dynamicReportUser}`;
      } else {
        if (!subject) { await showAlert("Isi subjek"); setSubmitting(false); return; }
      }

      if (!categoryId || !description) { await showAlert("Isi semua field"); setSubmitting(false); return; }

      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, categoryName, subject: finalSubject, description })
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setCategoryId("");
        setSelectedCategoryName("");
        setSubject("");
        setDynamicJobId("");
        setDynamicReportUser("");
        setDescription("");
        fetchData(1, filterStatus);
      } else {
        await showAlert(data.error);
      }
    } catch (error) {
      await showAlert("Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRate = async () => {
    if (!ratingData || ratingData.rating < 1) return;
    try {
      const res = await fetch(`/api/tickets/${ratingData.id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: ratingData.rating, tipAmount: ratingData.tip })
      });
      const data = await res.json();
      if (data.success) {
        setRatingData(null);
        fetchData(currentPage, filterStatus);
      } else {
        await showAlert(data.error);
      }
    } catch (error) {
      await showAlert("Terjadi kesalahan");
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
          <h1 className="text-3xl font-black text-white mb-2">Pusat Bantuan (Tiket)</h1>
          <p className="text-gray-400 text-sm">Buka tiket untuk melaporkan masalah, saran, atau bantuan.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-accent-lilac text-white font-bold rounded-xl hover:bg-accent-lilac/80 transition-colors shadow-lg shadow-accent-lilac/20"
        >
          {showForm ? <XCircle className="w-5 h-5" /> : <Plus className="w-5 h-5" />} 
          {showForm ? "Batal Buka Tiket" : "Buka Tiket Baru"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card/50 border border-border/50 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
              <Ticket className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-400">Tiket Dibuka</h3>
          </div>
          <p className="text-3xl font-black text-white">{stats.opened}</p>
        </div>
        <div className="bg-card/50 border border-border/50 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-400">Tiket Selesai</h3>
          </div>
          <p className="text-3xl font-black text-white">{stats.resolved}</p>
        </div>
        <div className="bg-card/50 border border-border/50 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-400">Tiket Ditolak</h3>
          </div>
          <p className="text-3xl font-black text-white">{stats.rejected}</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-card/50 border border-border/50 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-6">Form Tiket Baru</h2>
          <form onSubmit={handleSubmitTicket} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Kategori</label>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  const selectedName = e.target.options[e.target.selectedIndex].text;
                  setSelectedCategoryName(selectedName === "Pilih Kategori" ? "" : selectedName);
                }}
                className="w-full bg-black/50 border border-border/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-lilac"
                required
              >
                <option value="">Pilih Kategori</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            
            {selectedCategoryName.toLowerCase().includes("banding") ? (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Job ID</label>
                <input
                  type="text"
                  value={dynamicJobId}
                  onChange={(e) => setDynamicJobId(e.target.value)}
                  className="w-full bg-black/50 border border-border/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-lilac"
                  placeholder="Contoh: 123456"
                  required
                />
              </div>
            ) : selectedCategoryName.toLowerCase().includes("report") ? (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nama User yang Dilaporkan</label>
                <input
                  type="text"
                  value={dynamicReportUser}
                  onChange={(e) => setDynamicReportUser(e.target.value)}
                  className="w-full bg-black/50 border border-border/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-lilac"
                  placeholder="Contoh: BudiTrucker"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Subjek</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-black/50 border border-border/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-lilac"
                  placeholder="Contoh: Akun saya bermasalah"
                  required
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Deskripsi Lengkap</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-black/50 border border-border/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-lilac min-h-[150px]"
                placeholder="Jelaskan detail masalah atau kebutuhan Anda..."
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-accent-lilac text-white font-bold rounded-xl hover:bg-accent-lilac/80 transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Mengirim..." : "Kirim Tiket"}
            </button>
          </form>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 mt-8">
        <h2 className="text-2xl font-bold text-white">Riwayat Tiket</h2>
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setCurrentPage(1);
            fetchData(1, e.target.value);
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
      
      {pageLoading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-accent-lilac/20 border-t-accent-lilac rounded-full"></div>
        </div>
      ) : tickets.length > 0 ? (
        <div className="space-y-4">
          {tickets.map((t) => (
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
                  
                  {t.managerInfo && (
                    <div className="bg-black/30 p-4 rounded-xl border border-border/30 mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {t.managerInfo.image ? (
                          <img src={t.managerInfo.image} alt="Manager Avatar" className="w-10 h-10 rounded-full border-2 border-accent-lilac/30" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center font-bold text-white border-2 border-accent-lilac/30">?</div>
                        )}
                        <div>
                          <div className="text-xs text-gray-500 font-bold mb-0.5">Diurus oleh:</div>
                          <span className="text-sm text-white font-bold">{t.managerInfo.name || t.managerId}</span>
                        </div>
                      </div>
                      
                      {t.managerInfo.stats && (
                        <div className="flex gap-4 text-right">
                          <div>
                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Total Tiket</div>
                            <div className="text-sm font-black text-white">{t.managerInfo.stats.totalHandled}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Rating</div>
                            <div className="text-sm font-black text-yellow-400 flex items-center justify-end gap-1">
                              <Star className="w-3 h-3 fill-yellow-400" /> {t.managerInfo.stats.avgRating}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {t.closingReason && (
                    <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 mb-4">
                      <div className="text-xs text-red-400 font-bold mb-1 uppercase tracking-widest">Alasan Penutupan:</div>
                      <p className="text-sm text-gray-300 italic">"{t.closingReason}"</p>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="text-xs text-gray-500">
                      Dibuat: {new Date(t.createdAt).toLocaleString("id-ID")}
                    </div>
                    
                    {(t.status === "open" || t.status === "claimed") && t.discordChannelId && discordGuildId && (
                      <a 
                        href={`https://discord.com/channels/${discordGuildId}/${t.discordChannelId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#5865F2]/20 text-[#5865F2] hover:bg-[#5865F2]/30 border border-[#5865F2]/30 rounded-lg text-xs font-bold transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" /> Buka di Discord
                      </a>
                    )}
                  </div>
                </div>

                {(t.status === "resolved" || t.status === "rejected") && !t.hasTipped && (
                  <div className="md:w-64 bg-black/30 rounded-xl p-4 border border-border/30 self-start">
                    <h4 className="font-bold text-sm text-white mb-2">Beri Penilaian</h4>
                    <p className="text-xs text-gray-400 mb-3">Nilai pelayanan manager dan beri tip (opsional).</p>
                    
                    {ratingData?.id === t.ticketId ? (
                      <div className="space-y-3">
                        <div className="flex gap-1 justify-center mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-6 h-6 cursor-pointer ${ratingData!.rating >= star ? "text-yellow-400 fill-yellow-400" : "text-gray-600"}`}
                              onClick={() => setRatingData(prev => prev ? { ...prev, rating: star } : null)}
                            />
                          ))}
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Tip (NC)</label>
                          <input
                            type="number"
                            min="0"
                            value={ratingData!.tip}
                            onChange={(e) => setRatingData(prev => prev ? { ...prev, tip: parseInt(e.target.value) || 0 } : null)}
                            className="w-full bg-black/50 border border-border/50 rounded-lg px-3 py-2 text-white text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setRatingData(null)}
                            className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg text-sm"
                          >
                            Batal
                          </button>
                          <button
                            onClick={handleRate}
                            className="flex-1 px-3 py-2 bg-accent-lilac text-white rounded-lg text-sm"
                          >
                            Kirim
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setRatingData({ id: t.ticketId, rating: 0, tip: 0 })}
                        className="w-full px-4 py-2 bg-accent-lilac/20 text-accent-lilac hover:bg-accent-lilac/30 rounded-lg text-sm font-bold transition-colors"
                      >
                        Beri Nilai & Tip
                      </button>
                    )}
                  </div>
                )}
                
                {t.hasTipped && (
                  <div className="md:w-64 bg-black/30 rounded-xl p-4 border border-border/30 self-start text-center">
                    <div className="flex justify-center mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${t.rating >= star ? "text-yellow-400 fill-yellow-400" : "text-gray-600"}`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">
                      Anda memberikan {t.rating} bintang{t.tipAmount > 0 ? ` dan tip ${t.tipAmount} NC` : ""}.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}

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
                  onClick={() => { const p = currentPage - 1; setCurrentPage(p); fetchData(p, filterStatus); }}
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
                        onClick={() => { setCurrentPage(p); fetchData(p, filterStatus); }}
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
                  onClick={() => { const p = currentPage + 1; setCurrentPage(p); fetchData(p, filterStatus); }}
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
          <p className="text-gray-500">Anda belum pernah membuka tiket bantuan.</p>
        </div>
      )}
    </main>
  );
}
