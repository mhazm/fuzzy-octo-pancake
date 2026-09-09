"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Ticket,
  Settings,
  CheckCircle,
  AlertCircle,
  Play,
  UserCheck,
  MessageSquare,
  Plus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Trophy,
  Award,
  Calendar,
  Clock,
  Coins,
  Search,
  Users,
  ShieldCheck,
  Crown,
  Medal,
  CheckCircle2,
  XCircle,
  X,
  Star,
  CornerDownRight,
  ExternalLink,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { showAlert, showConfirm } from "@/lib/dialog";

export default function ManageTicketsPage() {
  const { data: session } = useSession();

  // Active View Tab: 'queue' (Ticket Cards) vs 'audit' (Staff Performance & Leaderboard)
  const [activeTab, setActiveTab] = useState<"queue" | "audit">("queue");

  // Time Period State
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [availableMonths, setAvailableMonths] = useState<
    { value: string; label: string; isCurrent?: boolean }[]
  >([]);

  // Tickets & Stats State
  const [tickets, setTickets] = useState<any[]>([]);
  const [personalStats, setPersonalStats] = useState({
    totalHandled: 0,
    resolved: 0,
    rejected: 0,
    claimed: 0,
    ncEarned: 0,
    resolutionRate: 0,
    avgRating: "0.0",
    ratedCount: 0,
    totalTips: 0,
  });
  const [globalStats, setGlobalStats] = useState({
    totalTickets: 0,
    unhandled: 0,
    claimed: 0,
    handled: 0,
    resolved: 0,
    rejected: 0,
  });
  const [staffLeaderboard, setStaffLeaderboard] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);

  // Filter & Pagination State
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterManager, setFilterManager] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);

  // Category Settings Modal
  const [categories, setCategories] = useState<any[]>([]);
  const [showCategorySettings, setShowCategorySettings] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Close Action State
  const [closeTicketId, setCloseTicketId] = useState<string | null>(null);
  const [closeStatus, setCloseStatus] = useState<"resolved" | "rejected">("resolved");
  const [closeReason, setCloseReason] = useState("");
  const [isClosing, setIsClosing] = useState(false);

  const fetchData = async (
    page = currentPage,
    status = filterStatus,
    manager = filterManager,
    month = selectedMonth
  ) => {
    try {
      setPageLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        month,
        ...(status !== "all" && { status }),
        ...(manager !== "all" && { managerId: manager }),
      });

      const [ticketsRes, catsRes] = await Promise.all([
        fetch(`/api/manage/tickets?${params}`, { cache: "no-store" }),
        fetch("/api/manage/tickets/category", { cache: "no-store" }),
      ]);

      const ticketsData = await ticketsRes.json();
      const catsData = await catsRes.json();

      if (ticketsData.success) {
        setTickets(ticketsData.tickets || []);
        if (ticketsData.stats) setPersonalStats(ticketsData.stats);
        if (ticketsData.globalStats) setGlobalStats(ticketsData.globalStats);
        if (ticketsData.staffLeaderboard) setStaffLeaderboard(ticketsData.staffLeaderboard);
        if (ticketsData.staffList) setStaffList(ticketsData.staffList);
        if (ticketsData.availableMonths) setAvailableMonths(ticketsData.availableMonths);

        if (ticketsData.pagination) {
          setCurrentPage(ticketsData.pagination.currentPage);
          setTotalPages(ticketsData.pagination.totalPages);
          setTotalTickets(ticketsData.pagination.totalTickets);
        }
      }

      if (catsData.success) {
        setCategories(catsData.categories || []);
      }
    } catch (error) {
      console.error("Error fetching tickets data:", error);
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === "manager" || session?.user?.role === "admin") {
      fetchData(1, filterStatus, filterManager, selectedMonth);
    }
  }, [session, selectedMonth, filterStatus, filterManager]);

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return "-";
    return (
      new Date(dateString).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      }) + " WIB"
    );
  };

  // Month Navigation Helper
  const currentMonthIndex = availableMonths.findIndex((m) => m.value === selectedMonth);

  const handlePrevMonth = () => {
    if (selectedMonth === "all") {
      if (availableMonths.length > 0) setSelectedMonth(availableMonths[0].value);
    } else if (currentMonthIndex < availableMonths.length - 1 && currentMonthIndex !== -1) {
      setSelectedMonth(availableMonths[currentMonthIndex + 1].value);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth !== "all" && currentMonthIndex > 0) {
      setSelectedMonth(availableMonths[currentMonthIndex - 1].value);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName) return;
    try {
      const res = await fetch("/api/manage/tickets/category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName }),
      });
      const data = await res.json();
      if (data.success) {
        setNewCategoryName("");
        fetchData(1, filterStatus, filterManager, selectedMonth);
        await showAlert("Kategori baru berhasil ditambahkan!");
      } else {
        await showAlert(data.error || "Gagal menambah kategori.");
      }
    } catch {
      await showAlert("Terjadi kesalahan pada sistem.");
    }
  };

  const handleClaim = async (ticketId: string, isRetake = false) => {
    const msg = isRetake
      ? "Apakah Anda yakin ingin mengambil alih (retake) tiket ini dari manager sebelumnya?"
      : "Apakah Anda yakin ingin mengurus tiket ini?";
    if (!(await showConfirm(msg))) return;

    try {
      const res = await fetch(`/api/manage/tickets/${ticketId}/claim`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        fetchData(currentPage, filterStatus, filterManager, selectedMonth);
        await showAlert("Tiket berhasil diklaim ke antrean Anda!");
      } else {
        await showAlert(data.error || "Gagal mengklaim tiket.");
      }
    } catch {
      await showAlert("Terjadi kesalahan pada sistem.");
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
        body: JSON.stringify({ status: closeStatus, closingReason: closeReason }),
      });
      const data = await res.json();
      if (data.success) {
        setCloseTicketId(null);
        setCloseReason("");
        setCloseStatus("resolved");
        fetchData(currentPage, filterStatus, filterManager, selectedMonth);
        await showAlert("Tiket berhasil ditutup! Anda memperoleh insentif 500 NC.");
      } else {
        await showAlert(data.error || "Gagal menutup tiket.");
      }
    } catch {
      await showAlert("Terjadi kesalahan pada sistem.");
    } finally {
      setIsClosing(false);
    }
  };

  const filteredTickets = useMemo(() => {
    if (!searchQuery) return tickets;
    const q = searchQuery.toLowerCase();
    return tickets.filter(
      (t) =>
        t.ticketId?.toLowerCase().includes(q) ||
        t.subject?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.categoryName?.toLowerCase().includes(q) ||
        t.creatorInfo?.name?.toLowerCase().includes(q)
    );
  }, [tickets, searchQuery]);

  const selectedMonthLabel = useMemo(() => {
    if (selectedMonth === "all") return "Semua Waktu (All-Time)";
    const found = availableMonths.find((m) => m.value === selectedMonth);
    return found ? found.label : selectedMonth;
  }, [selectedMonth, availableMonths]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Memuat Sistem Helpdesk Tiket...
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* 1. HEADER SECTION & PERIOD CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-accent-lilac/10 text-accent-lilac">
              <ShieldCheck size={18} />
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-accent-lilac">
              Helpdesk & Staff Audit
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-foreground uppercase tracking-tight">
            Manajemen Tiket
          </h1>
        </div>

        {/* Month Selector & Category Action */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Backward / Forward Month Stepper */}
          <div className="flex items-center bg-card border border-border rounded-2xl p-1 shadow-sm">
            <button
              onClick={handlePrevMonth}
              disabled={currentMonthIndex === availableMonths.length - 1}
              title="Bulan Sebelumnya"
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <ChevronLeft size={16} />
            </button>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold uppercase text-foreground px-3 py-1.5 outline-none cursor-pointer tracking-wider [color-scheme:dark]"
            >
              <option value="all">Semua Waktu (All-Time)</option>
              {availableMonths.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} {m.isCurrent ? " (Bulan Ini)" : ""}
                </option>
              ))}
            </select>

            <button
              onClick={handleNextMonth}
              disabled={selectedMonth === "all" || currentMonthIndex <= 0}
              title="Bulan Berikutnya"
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={() => setShowCategorySettings(true)}
            className="px-4 py-2.5 rounded-2xl bg-card border border-border hover:border-primary/40 text-foreground font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
          >
            <Settings size={15} /> Kategori Tiket
          </button>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS (Month / All-Time Aware) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card/60 border border-border/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
              Ditangani Anda ({selectedMonth === "all" ? "All-Time" : selectedMonthLabel.split(" ")[0]})
            </span>
            <p className="text-2xl font-black text-foreground tabular-nums mt-0.5">
              {personalStats.totalHandled} Tiket
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-emerald-400 font-bold">
                {personalStats.resolved} Selesai • {personalStats.rejected} Ditolak
              </span>
              <span className="text-[10px] text-amber-400 font-bold flex items-center gap-0.5">
                <Star size={10} className="fill-amber-400" /> {personalStats.avgRating}
              </span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <UserCheck size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card/60 border border-border/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
              Insentif NC Anda
            </span>
            <p className="text-2xl font-black text-amber-400 tabular-nums mt-0.5">
              N¢ {personalStats.ncEarned.toLocaleString("id-ID")}
            </p>
            <span className="text-[10px] text-muted-foreground font-medium">
              500 NC per tiket ditutup {personalStats.totalTips > 0 ? `• +${personalStats.totalTips} NC Tip` : ""}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
            <Coins size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card/60 border border-border/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
              Antrean Masuk ({selectedMonth === "all" ? "All-Time" : selectedMonthLabel.split(" ")[0]})
            </span>
            <p className="text-2xl font-black text-foreground tabular-nums mt-0.5">
              {globalStats.totalTickets} Tiket
            </p>
            <span className="text-[10px] text-blue-400 font-bold">
              {globalStats.unhandled} Menunggu Staf
            </span>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
            <Ticket size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card/60 border border-border/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
              Sedang Diproses
            </span>
            <p className="text-2xl font-black text-amber-300 tabular-nums mt-0.5">
              {globalStats.claimed} Tiket
            </p>
            <span className="text-[10px] text-emerald-400 font-bold">
              {globalStats.resolved + globalStats.rejected} Ditutup Selesai
            </span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
            <Clock size={20} />
          </div>
        </div>
      </div>

      {/* 3. TABS NAVIGATION: DAFTAR TIKET vs LEADERBOARD AUDIT */}
      <div className="flex items-center gap-3 border-b border-border/60 pb-3">
        <button
          onClick={() => setActiveTab("queue")}
          className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "queue"
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          }`}
        >
          <Ticket size={15} /> Daftar Tiket ({totalTickets})
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "audit"
              ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          }`}
        >
          <Trophy size={15} /> Leaderboard & Audit Staf
        </button>
      </div>

      {/* 4. WORKSPACE TAB: RICH TICKET CARDS */}
      {activeTab === "queue" && (
        <div className="space-y-6">
          {/* Controls & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-card border border-border rounded-xl px-4 py-2.5 text-xs font-bold text-foreground outline-none cursor-pointer [color-scheme:dark]"
              >
                <option value="all">Semua Status</option>
                <option value="open">Open (Menunggu)</option>
                <option value="claimed">Claimed (Diproses)</option>
                <option value="resolved">Resolved (Selesai)</option>
                <option value="rejected">Rejected (Ditolak)</option>
              </select>

              <select
                value={filterManager}
                onChange={(e) => setFilterManager(e.target.value)}
                className="bg-card border border-border rounded-xl px-4 py-2.5 text-xs font-bold text-foreground outline-none cursor-pointer [color-scheme:dark]"
              >
                <option value="all">Semua Pengurus Staf</option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
              <input
                type="text"
                placeholder="Cari ID, subjek, isi pelaporan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-xs font-medium text-foreground outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Ticket Cards List */}
          {filteredTickets.length > 0 ? (
            <div className="space-y-4">
              {filteredTickets.map((t) => {
                const isMine = t.managerId === session?.user?.discordId;
                const isOpen = t.status === "open";
                const isClaimed = t.status === "claimed";
                const isResolved = t.status === "resolved";
                const isRejected = t.status === "rejected";

                return (
                  <div
                    key={t._id}
                    className="bg-card/70 border border-border/80 hover:border-border rounded-3xl p-6 md:p-8 space-y-5 transition-all shadow-md group"
                  >
                    {/* Top Row: Meta Tags & Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/50">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-white/5 border border-border text-foreground">
                          #{t.ticketId}
                        </span>
                        <span className="text-xs font-bold px-3 py-1 rounded-lg bg-accent-lilac/10 text-accent-lilac border border-accent-lilac/20 uppercase tracking-wider">
                          {t.categoryName || "Umum"}
                        </span>
                        <span
                          className={`text-xs px-3 py-1 rounded-lg font-black uppercase tracking-wider border ${
                            isOpen
                              ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                              : isClaimed
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                              : isResolved
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : "bg-red-500/15 text-red-400 border-red-500/30"
                          }`}
                        >
                          {t.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                        <Clock size={14} />
                        <span>Dibuat: {formatDate(t.createdAt)}</span>
                      </div>
                    </div>

                    {/* Middle Row: Full Subject & Description Content */}
                    <div className="space-y-3">
                      <h3 className="text-lg md:text-xl font-black text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">
                        {t.subject}
                      </h3>

                      {/* Full Report Details Box */}
                      <div className="p-4 rounded-2xl bg-black/30 border border-white/5 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed font-normal">
                        {t.description}
                      </div>

                      {/* Closing Reason if closed */}
                      {t.closingReason && (
                        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex items-start gap-2.5 text-xs text-muted-foreground">
                          <CornerDownRight size={16} className="text-accent-lilac shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-foreground block mb-0.5">
                              Catatan Penutupan ({t.status}):
                            </span>
                            <p className="italic text-foreground/80">{t.closingReason}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Row: Reporter Profile, Handler Profile, and Action Buttons */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-border/50">
                      {/* Profiles info */}
                      <div className="flex flex-wrap items-center gap-6 text-xs">
                        {/* Creator */}
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                            Pelapor:
                          </span>
                          <div className="flex items-center gap-2">
                            <img
                              src={
                                t.creatorInfo?.image ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(t.creatorInfo?.name || "Driver")}&background=6D28D9&color=fff`
                              }
                              alt={t.creatorInfo?.name}
                              className="w-7 h-7 rounded-full object-cover border border-border"
                            />
                            <div>
                              <span className="font-bold text-foreground block leading-none">
                                {t.creatorInfo?.name || t.discordId}
                              </span>
                              <span className="text-[9px] font-mono text-muted-foreground">
                                {t.discordId}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Manager Handler */}
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                            Diurus Oleh:
                          </span>
                          {t.managerId ? (
                            <div className="flex items-center gap-2">
                              <img
                                src={
                                  t.managerInfo?.image ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(t.managerInfo?.name || "Staff")}&background=6D28D9&color=fff`
                                }
                                alt={t.managerInfo?.name}
                                className="w-7 h-7 rounded-full object-cover border border-border"
                              />
                              <div>
                                <span className="font-bold text-foreground block leading-none">
                                  {t.managerInfo?.name || t.managerId}
                                </span>
                                <span className="text-[9px] font-mono text-muted-foreground">
                                  {t.managerId}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic font-mono">
                              Belum ada staf
                            </span>
                          )}
                        </div>

                        {/* Rating & Tip if given */}
                        {t.rating > 0 && (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                            <Star size={14} className="fill-amber-400" />
                            <span className="font-bold text-xs">{t.rating} / 5</span>
                            {t.tipAmount > 0 && (
                              <span className="text-emerald-400 font-bold text-xs ml-1">
                                (+{t.tipAmount} NC Tip)
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
                        {/* Discord Channel Link */}
                        {t.discordChannelId && (
                          <a
                            href={`https://discord.com/channels/${process.env.NEXT_PUBLIC_DISCORD_GUILD_ID || "863959415702028318"}/${t.discordChannelId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-accent-sky/20 text-muted-foreground hover:text-accent-sky border border-border text-xs font-bold transition-colors flex items-center gap-1.5"
                          >
                            <MessageSquare size={14} /> Buka Discord
                          </a>
                        )}

                        {/* Claim Button */}
                        {isOpen && (
                          <button
                            onClick={() => handleClaim(t.ticketId || t._id)}
                            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/20"
                          >
                            <Play size={14} /> Klaim Tiket
                          </button>
                        )}

                        {/* Resolve / Close Button */}
                        {isClaimed && isMine && (
                          <button
                            onClick={() => setCloseTicketId(t.ticketId || t._id)}
                            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                          >
                            <CheckCircle size={14} /> Selesaikan Tiket
                          </button>
                        )}

                        {/* Retake Button */}
                        {isClaimed && !isMine && (
                          <button
                            onClick={() => handleClaim(t.ticketId || t._id, true)}
                            className="px-4 py-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500 hover:text-black text-orange-400 border border-orange-500/20 text-xs font-bold transition-all"
                          >
                            Ambil Alih (Retake)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 bg-card/50 border border-border rounded-2xl">
                  <span className="text-xs text-muted-foreground">
                    Halaman <strong className="text-foreground">{currentPage}</strong> dari <strong className="text-foreground">{totalPages}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPage <= 1 || pageLoading}
                      onClick={() => fetchData(currentPage - 1, filterStatus, filterManager, selectedMonth)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-foreground disabled:opacity-30 transition-all border border-border"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      disabled={currentPage >= totalPages || pageLoading}
                      onClick={() => fetchData(currentPage + 1, filterStatus, filterManager, selectedMonth)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-foreground disabled:opacity-30 transition-all border border-border"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 bg-card/30 border border-border rounded-3xl space-y-3">
              <MessageSquare className="w-14 h-14 mx-auto text-muted-foreground/40" />
              <h3 className="text-lg font-bold text-foreground">Tidak Ada Tiket Ditemukan</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Saat ini tidak ada tiket yang sesuai dengan filter atau periode {selectedMonthLabel}.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 5. WORKSPACE TAB: STAFF LEADERBOARD & AUDIT */}
      {activeTab === "audit" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                <Trophy className="text-amber-400" size={24} />
                Papan Peringkat & Audit Kinerja Staf
              </h2>
              <p className="text-muted-foreground text-xs">
                Audit kontribusi staf dalam menangani tiket periode: <strong className="text-amber-300">{selectedMonthLabel}</strong>
              </p>
            </div>

            <span className="text-xs font-bold text-muted-foreground">
              Total Staf Berkontribusi: <strong className="text-foreground">{staffLeaderboard.length} Staf</strong>
            </span>
          </div>

          {/* Top 3 Podium Highlights */}
          {staffLeaderboard.length >= 1 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {staffLeaderboard.slice(0, 3).map((staff, idx) => {
                const isGold = idx === 0;
                const isSilver = idx === 1;

                const borderGlow = isGold
                  ? "border-amber-400 bg-gradient-to-b from-amber-500/15 via-card to-card shadow-amber-500/10"
                  : isSilver
                  ? "border-slate-300/60 bg-gradient-to-b from-slate-400/10 via-card to-card"
                  : "border-amber-700/60 bg-gradient-to-b from-amber-800/10 via-card to-card";

                const medalColor = isGold
                  ? "text-amber-400"
                  : isSilver
                  ? "text-slate-300"
                  : "text-amber-600";

                return (
                  <div
                    key={staff.managerId}
                    className={`p-6 rounded-3xl border ${borderGlow} flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isGold && <Crown size={22} className="text-amber-400" />}
                        {isSilver && <Medal size={22} className="text-slate-300" />}
                        {!isGold && !isSilver && <Award size={22} className="text-amber-600" />}
                        <span className={`text-xs font-black uppercase tracking-widest ${medalColor}`}>
                          Rank #{staff.rank}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Star size={10} className="fill-amber-400" /> {staff.avgRating} ({staff.ratedCount})
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-white/5 border border-border text-muted-foreground">
                          {staff.resolutionRate}% Rate
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <img
                        src={
                          staff.image ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.name)}&background=6D28D9&color=fff`
                        }
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-border shadow-lg"
                        alt={staff.name}
                      />
                      <div>
                        <h3 className="text-base font-black text-foreground uppercase leading-tight line-clamp-1">
                          {staff.name}
                        </h3>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          ID: {staff.managerId}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 p-3 rounded-2xl bg-black/20 border border-border text-center">
                      <div>
                        <span className="text-[8px] font-black text-muted-foreground uppercase block">Ditangani</span>
                        <p className="text-xs md:text-sm font-black text-foreground tabular-nums">{staff.totalHandled}</p>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-emerald-400 uppercase block">Resolved</span>
                        <p className="text-xs md:text-sm font-black text-emerald-400 tabular-nums">{staff.resolved}</p>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-amber-400 uppercase block">Rating</span>
                        <p className="text-xs md:text-sm font-black text-amber-400 tabular-nums flex items-center justify-center gap-0.5">
                          <Star size={10} className="fill-amber-400" /> {staff.avgRating}
                        </p>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-amber-400 uppercase block">Bonus NC</span>
                        <p className="text-xs md:text-sm font-black text-amber-400 tabular-nums">N¢ {staff.ncEarned.toLocaleString("id-ID")}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full Audit Table */}
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-border bg-foreground/[0.02] flex items-center justify-between">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary" /> Rincian Kinerja Seluruh Staf
              </h3>
              <span className="text-xs text-muted-foreground font-mono">
                {selectedMonthLabel}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-foreground/5 text-foreground/40 text-[10px] font-black uppercase tracking-widest border-b border-border">
                  <tr>
                    <th className="px-6 py-4">Rank</th>
                    <th className="px-6 py-4">Profil Staf</th>
                    <th className="px-6 py-4">Total Ditangani</th>
                    <th className="px-6 py-4">Resolusi Sukses</th>
                    <th className="px-6 py-4">Rating Driver</th>
                    <th className="px-6 py-4">Ditolak</th>
                    <th className="px-6 py-4">Insentif NC</th>
                    <th className="px-6 py-4 text-right">Terakhir Mengurus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {staffLeaderboard.length > 0 ? (
                    staffLeaderboard.map((s) => (
                      <tr key={s.managerId} className="hover:bg-foreground/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <span
                            className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center border ${
                              s.rank === 1
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                : s.rank === 2
                                ? "bg-slate-300/20 text-slate-200 border-slate-300/40"
                                : s.rank === 3
                                ? "bg-amber-800/20 text-amber-600 border-amber-800/40"
                                : "bg-black/30 text-muted-foreground border-border"
                            }`}
                          >
                            #{s.rank}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                s.image ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=6D28D9&color=fff`
                              }
                              className="w-8 h-8 rounded-full object-cover border border-border"
                              alt={s.name}
                            />
                            <div>
                              <p className="font-bold text-foreground group-hover:text-primary transition-colors leading-none">
                                {s.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                {s.managerId}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 tabular-nums font-black text-foreground text-sm">
                          {s.totalHandled} Tiket
                        </td>

                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-emerald-400 text-xs">{s.resolved} Tiket</span>
                              <span className="text-[10px] text-muted-foreground">({s.resolutionRate}%)</span>
                            </div>
                            <div className="w-24 h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${s.resolutionRate}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-amber-400 font-bold text-xs">
                            <Star size={13} className="fill-amber-400" />
                            <span>{s.avgRating}</span>
                            <span className="text-[10px] text-muted-foreground font-normal">
                              ({s.ratedCount})
                            </span>
                          </div>
                          {s.totalTips > 0 && (
                            <span className="text-[9px] text-emerald-400 font-bold block mt-0.5">
                              +{s.totalTips} NC Tip
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 tabular-nums text-xs font-bold text-red-400">
                          {s.rejected} Tiket
                        </td>

                        <td className="px-6 py-4 tabular-nums font-black text-amber-400 text-sm">
                          N¢ {s.ncEarned.toLocaleString("id-ID")}
                        </td>

                        <td className="px-6 py-4 text-right text-xs text-muted-foreground font-mono">
                          {formatDate(s.latestHandledAt)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground font-bold uppercase tracking-widest text-xs">
                        Tidak ada aktivitas staf yang terekam pada periode ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: CLOSE TICKET */}
      {closeTicketId && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <form
            onSubmit={handleCloseTicket}
            className="bg-card border border-border p-6 md:p-8 rounded-3xl w-full max-w-lg shadow-2xl space-y-5 relative overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">
                  Konfirmasi Penutupan
                </span>
                <h3 className="text-xl font-black text-foreground uppercase tracking-tight">
                  Selesaikan Tiket #{closeTicketId}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCloseTicketId(null)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-accent-lilac uppercase tracking-widest ml-1">
                  Status Hasil *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCloseStatus("resolved")}
                    className={`p-3 rounded-xl border text-center transition-all flex items-center justify-center gap-2 text-xs ${
                      closeStatus === "resolved"
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold shadow-sm"
                        : "bg-black/20 border-white/5 text-muted-foreground hover:border-white/20"
                    }`}
                  >
                    <CheckCircle2 size={16} /> Resolved (Selesai)
                  </button>

                  <button
                    type="button"
                    onClick={() => setCloseStatus("rejected")}
                    className={`p-3 rounded-xl border text-center transition-all flex items-center justify-center gap-2 text-xs ${
                      closeStatus === "rejected"
                        ? "bg-red-500/10 border-red-500 text-red-400 font-bold shadow-sm"
                        : "bg-black/20 border-white/5 text-muted-foreground hover:border-white/20"
                    }`}
                  >
                    <XCircle size={16} /> Rejected (Ditolak)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-accent-lilac uppercase tracking-widest ml-1">
                  Alasan Penutupan / Solusi *
                </label>
                <textarea
                  required
                  rows={4}
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                  placeholder="Tuliskan penjelasan solusi atau alasan penolakan tiket ini..."
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-foreground text-sm outline-none focus:border-accent-lilac transition-all resize-none"
                />
              </div>

              <p className="text-xs text-muted-foreground bg-white/[0.02] p-3 rounded-xl border border-white/5">
                💡 Anda akan mendapatkan <strong className="text-amber-400">+500 NC</strong> setelah menutup tiket ini.
              </p>
            </div>

            <div className="flex gap-3 pt-3 border-t border-border/50">
              <button
                type="button"
                onClick={() => setCloseTicketId(null)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-foreground font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                disabled={isClosing}
                type="submit"
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md disabled:opacity-50"
              >
                {isClosing ? "Menyimpan..." : "Tutup & Klaim 500 NC"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 7. MODAL: CATEGORY SETTINGS */}
      {showCategorySettings && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-card border border-border p-6 md:p-8 rounded-3xl w-full max-w-lg shadow-2xl space-y-5 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-primary tracking-widest">
                  Pengaturan
                </span>
                <h3 className="text-xl font-black text-foreground uppercase tracking-tight">
                  Kategori Tiket Bantuan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCategorySettings(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Existing Categories */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Daftar Kategori ({categories.length})
              </label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {categories.map((cat) => (
                  <div
                    key={cat._id}
                    className="p-2.5 bg-white/[0.02] border border-border rounded-xl flex items-center justify-between text-xs font-bold text-foreground"
                  >
                    <span>{cat.name}</span>
                    <span className="text-[9px] font-mono text-muted-foreground">
                      {cat._id.slice(-6)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Category */}
            <form onSubmit={handleAddCategory} className="space-y-2.5 pt-3 border-t border-border/50">
              <label className="text-[10px] font-black text-accent-lilac uppercase tracking-widest">
                Tambah Kategori Baru
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Contoh: Kendala Server / Mod"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 bg-black/20 border border-white/10 rounded-xl px-3.5 py-2.5 text-foreground text-xs outline-none focus:border-accent-lilac transition-all"
                />
                <button
                  type="submit"
                  className="px-4 bg-primary text-primary-foreground rounded-xl font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all flex items-center gap-1.5"
                >
                  <Plus size={15} /> Tambah
                </button>
              </div>
            </form>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowCategorySettings(false)}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-foreground font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
