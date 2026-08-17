"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { Fuel, RefreshCw, ShoppingCart, User, ArrowUpCircle, ArrowDownCircle, Banknote, ShieldAlert, CheckCircle2, History, ChevronLeft, ChevronRight, Edit2, Trash2, Store, Clock, Info } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import UserBadges from "@/components/icons/UserBadges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Swal from "sweetalert2";

export default function FuelMarketPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("system");
  
  // States
  const [systemPrice, setSystemPrice] = useState(0);
  const [chartData, setChartData] = useState([]);
  const [chartRange, setChartRange] = useState(1);
  const [chartLoading, setChartLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<string>("");
  const [listings, setListings] = useState([]);
  const [garage, setGarage] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  
  // History States
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Loading States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Sort State
  const [sortBy, setSortBy] = useState("lowest_price");

  // Form States
  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [sellPrice, setSellPrice] = useState("");

  const fetchSystemMarket = async (range: number) => {
    setChartLoading(true);
    try {
      const sysRes = await fetch(`/api/fuel-market/system?range=${range}&t=${Date.now()}`);
      const sysData = await sysRes.json();
      if (sysData.success) {
        setSystemPrice(sysData.currentPrice);
        setChartData(sysData.chartData);
        setLastUpdate(new Date(sysData.lastUpdate));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChartLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch System Market Data
      await fetchSystemMarket(chartRange);

      // Fetch P2P Listings
      const p2pRes = await fetch(`/api/fuel-market/p2p?t=${Date.now()}`);
      const p2pData = await p2pRes.json();
      if (p2pData.success) {
        setListings(p2pData.listings);
      }

      // Fetch User Garage Data
      const garageRes = await fetch(`/api/garage/me?t=${Date.now()}`);
      const garageData = await garageRes.json();
      if (garageData.success) {
        setGarage(garageData.garage);
        setBalance(garageData.balance);
      }
      
      // Fetch initial history
      fetchHistory(1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (page: number) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/fuel-market/history?page=${page}&limit=10&t=${Date.now()}`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.history);
        setHistoryPage(data.pagination.page);
        setHistoryTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchSystemMarket(chartRange);
  }, [chartRange]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!lastUpdate) return;
    
    const interval = setInterval(() => {
      const nextUpdate = new Date(lastUpdate.getTime() + 60 * 60 * 1000); // +1 hour
      const now = new Date();
      const diff = nextUpdate.getTime() - now.getTime();
      
      if (diff <= 0) {
        setCountdown("Segera Diperbarui...");
      } else {
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(`${m}m ${s}s`);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [lastUpdate]);

  const handleAction = async (apiPath: string, body: any, confirmMessage?: string) => {
    if (confirmMessage) {
      const result = await Swal.fire({
        title: "Konfirmasi Transaksi",
        text: confirmMessage,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#10b981",
        cancelButtonColor: "#ef4444",
        confirmButtonText: "Ya, Lanjutkan!",
        cancelButtonText: "Batal",
        background: "hsl(var(--card))",
        color: "hsl(var(--foreground))",
      });

      if (!result.isConfirmed) return;
    }

    setActionLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        setMessage(data.message);
        if (apiPath === "/api/fuel-market/system/buy" || apiPath === "/api/fuel-market/p2p/buy") {
          setBuyAmount("");
        }
        if (apiPath === "/api/fuel-market/p2p") {
          setSellAmount("");
          setSellPrice("");
        }
        await fetchData(); // Refresh data
        if (activeTab === "history") fetchHistory(1);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditPrice = async (listingId: string, currentPrice: number) => {
    const { value: newPrice } = await Swal.fire({
      title: "Ubah Harga Jualan",
      input: "number",
      inputLabel: "Harga per Liter (NC)",
      inputValue: currentPrice,
      showCancelButton: true,
      confirmButtonText: "Simpan",
      cancelButtonText: "Batal",
      inputValidator: (value) => {
        if (!value || Number(value) <= 0) return "Harga harus lebih dari 0!";
      }
    });

    if (newPrice) {
      handleAction("/api/fuel-market/p2p", { listingId, action: "edit", newPrice }, `Yakin ingin mengubah harga menjadi ${newPrice} NC?`);
    }
  };

  const calculateOpCost = (startLevel: number, multiplier: number, isUpgrade: boolean) => {
    let cost = 0;
    if (isUpgrade) {
      for (let i = startLevel + 1; i <= startLevel + multiplier; i++) {
        const tier = Math.floor((i - 1) / 5);
        cost += (200 + (tier * 100));
      }
    } else {
      for (let i = startLevel; i > startLevel - multiplier; i--) {
        const tier = Math.floor((i - 1) / 5);
        cost += (200 + (tier * 100));
      }
    }
    return cost;
  };

  const handleBulkUpgrade = async (currentLevel: number) => {
    const { value: multiplierStr } = await Swal.fire({
      title: "Upgrade Kapasitas Tangki",
      html: "Berapa level yang ingin diupgrade?<br><span class='text-xs text-muted-foreground'>1 Level = +1.000L Kapasitas, 500 NC Biaya.<br>Biaya operasional bertambah progresif (+200 NC dasar, naik 100 NC tiap 5 level)</span>",
      input: "number",
      inputValue: 1,
      showCancelButton: true,
      confirmButtonText: "Upgrade",
      cancelButtonText: "Batal",
      background: "hsl(var(--card))",
      color: "hsl(var(--foreground))",
      inputValidator: (value) => {
        if (!value || Number(value) < 1) return "Minimal upgrade 1 level!";
      }
    });

    if (multiplierStr) {
      const multiplier = parseInt(multiplierStr);
      const addedOpCost = calculateOpCost(currentLevel, multiplier, true);
      handleAction("/api/garage/fuel-upgrade", { multiplier }, `Anda yakin ingin upgrade tangki sebanyak ${multiplier} level? Saldo Anda akan terpotong ${multiplier * 500} NC dan biaya operasional garasi bertambah ${addedOpCost} NC.`);
    }
  };

  const handleBulkDowngrade = async (currentLevel: number) => {
    const maxDowngrade = currentLevel - 1;
    if (maxDowngrade <= 0) return;

    const { value: multiplierStr } = await Swal.fire({
      title: "Downgrade Kapasitas Tangki",
      html: `Berapa level yang ingin didowngrade? (Maks: ${maxDowngrade})<br><span class='text-xs text-muted-foreground'>1 Level = -1.000L Kapasitas, Biaya: 250 NC.<br>Biaya operasional akan berkurang sesuai tier level.</span>`,
      input: "number",
      inputValue: 1,
      showCancelButton: true,
      confirmButtonText: "Downgrade",
      cancelButtonText: "Batal",
      background: "hsl(var(--card))",
      color: "hsl(var(--foreground))",
      inputValidator: (value) => {
        if (!value || Number(value) < 1 || Number(value) > maxDowngrade) return `Masukkan angka antara 1 sampai ${maxDowngrade}!`;
      }
    });

    if (multiplierStr) {
      const multiplier = parseInt(multiplierStr);
      const reducedOpCost = calculateOpCost(currentLevel, multiplier, false);
      handleAction("/api/garage/fuel-downgrade", { multiplier }, `Anda yakin ingin downgrade tangki sebanyak ${multiplier} level? Biaya Downgrade sebesar ${multiplier * 250} NC. Biaya operasional garasi akan berkurang ${reducedOpCost} NC. Pastikan kapasitas baru bisa menampung stok BBM saat ini.`);
    }
  };

  const handleCancelListing = (listingId: string) => {
    handleAction("/api/fuel-market/p2p/cancel", { listingId }, "Anda yakin ingin menarik BBM ini dari market? BBM akan utuh dikembalikan ke tangki garasi Anda.");
  };

  const getSortedListings = (list: any[]) => {
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "lowest_price":
          return a.pricePerLiter - b.pricePerLiter;
        case "highest_price":
          return b.pricePerLiter - a.pricePerLiter;
        case "most_amount":
          return b.amount - a.amount;
        case "least_amount":
          return a.amount - b.amount;
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        default:
          return 0;
      }
    });
  };

  if (!session) {
    return (
      <div className="flex h-[70vh] items-center justify-center text-center px-4">
        <div>
          <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Akses Terbatas</h2>
          <p className="text-muted-foreground">Silakan login terlebih dahulu untuk mengakses Fuel Market.</p>
        </div>
      </div>
    );
  }

  const renderMessage = () => {
    if (message) return <div className="p-4 mb-4 bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> {message}</div>;
    if (error) return <div className="p-4 mb-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2"><ShieldAlert className="w-5 h-5"/> {error}</div>;
    return null;
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-8 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Fuel className="w-8 h-8 text-primary" />
            Nismara Fuel Market
          </h1>
          <p className="text-muted-foreground mt-2">
            Pusat perdagangan bahan bakar terpusat. Harga sistem berfluktuasi setiap 1 jam.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-card border rounded-2xl p-4 shadow-sm">
          <div className="text-right">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Saldo NC Anda</p>
            <p className="text-xl font-bold text-emerald-500">{balance.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NC</p>
          </div>
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {renderMessage()}

      {/* SUSPENDED OVERLAY */}
      {garage?.status === "suspended" && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm rounded-3xl border border-red-500/50 p-8 text-center min-h-[60vh]">
          <div className="w-full max-w-lg space-y-6">
            <div className="w-24 h-24 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <ShieldAlert size={48} />
            </div>
            <h2 className="text-4xl font-black text-red-500 uppercase tracking-widest border-y border-red-500/30 py-4" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(239,68,68,0.1) 10px, rgba(239,68,68,0.1) 20px)" }}>
              AKSES DITOLAK
            </h2>
            <p className="text-foreground text-lg font-medium leading-relaxed">
              Anda tidak dapat mengakses pasar bahan bakar karena Garasi Anda sedang <strong>Disita</strong> akibat tunggakan tagihan operasional bulanan.
            </p>
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mt-6">
              <p className="text-sm text-red-400 font-bold uppercase tracking-wider mb-2">Langkah Penyelesaian:</p>
              <p className="text-xs text-muted-foreground mb-4">Buka tiket di Pusat Bantuan Nismara untuk melunasi tunggakan garasi Anda agar dapat kembali bertransaksi BBM.</p>
              <Link
                href="/dashboard/ticket"
                className="inline-flex items-center justify-center w-full py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors uppercase tracking-widest text-xs"
              >
                Buat Tiket Bantuan
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex bg-muted/50 p-1 rounded-xl w-full max-w-md mx-auto sm:mx-0">
        <button
          onClick={() => setActiveTab("system")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "system" ? "bg-background shadow-md text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          System Market
        </button>
        <button
          onClick={() => setActiveTab("driver")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "driver" ? "bg-background shadow-md text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Driver Market
        </button>
        <button
          onClick={() => setActiveTab("my-market")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "my-market" ? "bg-background shadow-md text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          My Market
        </button>
        <button
          onClick={() => setActiveTab("garage")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "garage" ? "bg-background shadow-md text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          My Garage
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "history" ? "bg-background shadow-md text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Riwayat
        </button>
      </div>

      {/* TABS CONTENT */}
      <div className="min-h-[400px]">
        {loading && !chartData.length ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* SYSTEM MARKET TAB */}
            {activeTab === "system" && (
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-card border shadow-sm rounded-2xl p-6 flex flex-col">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <RefreshCw className={`w-5 h-5 text-primary ${chartLoading ? "animate-spin" : ""}`} /> Histori Fluktuasi Harga
                    </h3>
                    <div className="flex bg-muted/50 p-1 rounded-lg">
                      {[1, 3, 7, 30].map((days) => (
                        <button
                          key={days}
                          onClick={() => setChartRange(days)}
                          disabled={chartLoading}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                            chartRange === days 
                              ? "bg-background shadow text-foreground" 
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {days} Hari
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 min-h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="time" stroke="#888" fontSize={12} />
                        <YAxis domain={['auto', 'auto']} stroke="#888" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                          labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold', marginBottom: '8px' }}
                          formatter={(value) => [`${value} NC/L`, "Harga"]}
                          labelFormatter={(label, payload) => {
                            if (payload && payload.length > 0) {
                              return payload[0].payload.fullDate;
                            }
                            return label;
                          }}
                        />
                        <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-card border shadow-sm rounded-2xl p-6 space-y-6 flex flex-col">
                  <div className="text-center p-6 bg-muted/50 rounded-xl border relative overflow-hidden">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Harga Saat Ini</p>
                    <p className="text-4xl font-black text-primary">{systemPrice.toFixed(2)} <span className="text-xl">NC/L</span></p>
                    
                    <div className="mt-4 pt-4 border-t border-border/50 flex flex-col items-center gap-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" /> 
                        <span>Perubahan harga selanjutnya dalam:</span>
                      </div>
                      <p className="font-mono font-bold text-sm text-amber-500">{countdown}</p>
                    </div>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex gap-3 text-sm text-blue-500">
                    <Info className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>
                      <strong>Konteks Pasar:</strong> Harga BBM di pasar sistem ini berfluktuasi secara otomatis setiap <strong>1 jam sekali</strong>, bervariasi antara harga terendah hingga harga tertinggi.
                    </p>
                  </div>

                  <div className="space-y-4 mt-auto pt-2">
                    <h4 className="font-bold border-b pb-2">Beli BBM dari Sistem</h4>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Jumlah (Liter)</label>
                      <Input 
                        type="number" 
                        value={buyAmount} 
                        onChange={(e) => setBuyAmount(e.target.value)} 
                        placeholder="Contoh: 500" 
                      />
                    </div>
                    {buyAmount && Number(buyAmount) > 0 && (
                      <div className="bg-accent-sky/10 p-3 rounded-lg text-sm flex justify-between">
                        <span>Total Pembayaran (Termasuk 5% Fee):</span>
                        <span className="font-bold text-accent-sky">{Math.ceil(Number(buyAmount) * systemPrice * 1.05).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NC</span>
                      </div>
                    )}
                    <Button 
                      className="w-full" 
                      disabled={!buyAmount || actionLoading}
                      onClick={() => handleAction("/api/fuel-market/system/buy", { amount: Number(buyAmount) }, `Anda yakin ingin membeli ${buyAmount} Liter BBM dari sistem seharga ${Math.ceil(Number(buyAmount) * systemPrice * 1.05)} NC (termasuk fee 5%)?`)}
                    >
                      {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <ShoppingCart className="w-4 h-4 mr-2" />}
                      Beli BBM
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* DRIVER MARKET TAB */}
            {activeTab === "driver" && (
              <div className="bg-card border shadow-sm rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" /> Pasar Antar Pengemudi (P2P)
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <select 
                      value={sortBy} 
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-background border px-3 py-1.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                    >
                      <option value="lowest_price">Harga Terendah</option>
                      <option value="highest_price">Harga Tertinggi</option>
                      <option value="most_amount">Liter Terbanyak</option>
                      <option value="least_amount">Liter Sedikit</option>
                      <option value="newest">Paling Baru</option>
                      <option value="oldest">Paling Lama</option>
                    </select>

                    <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
                    </Button>
                    <span className="text-sm bg-muted px-3 py-1.5 rounded-full text-muted-foreground">Fee 5% ditanggung pembeli</span>
                  </div>
                </div>

                {listings.length === 0 ? (
                  <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed">
                    <Fuel className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">Belum ada driver yang menjual BBM saat ini.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {getSortedListings(listings).map((item: any) => {
                      const totalCost = Math.ceil(item.amount * item.pricePerLiter * 1.05);
                      const isOwn = item.sellerDiscordId === session.user.discordId;

                      const dateCreated = new Date(item.createdAt).toLocaleString("id-ID", { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Jakarta' }) + " WIB";
                      const dateUpdated = new Date(item.updatedAt).toLocaleString("id-ID", { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Jakarta' }) + " WIB";
                      const isEdited = item.createdAt !== item.updatedAt;

                      return (
                        <div key={item._id} className="border border-border/50 bg-background/50 rounded-xl p-4 flex flex-col justify-between hover:border-primary/30 transition-colors">
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-xs text-muted-foreground">Penjual</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Avatar className="w-5 h-5">
                                    <AvatarImage src={item.sellerId?.image || ""} />
                                    <AvatarFallback className="text-[10px]">{item.sellerId?.name?.substring(0, 2).toUpperCase() || "??"}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex items-center gap-1">
                                    <p className="font-bold text-sm">{item.sellerId?.name || "Anonim"}</p>
                                    <UserBadges 
                                      role={item.sellerId?.discordRole} 
                                      isBooster={item.sellerId?.isBooster} 
                                      isNismaraPlus={item.sellerId?.nismaraplus?.status} 
                                      nismaraPlusStartedAt={item.sellerId?.nismaraplus?.startedAt}
                                      truckyRank={item.sellerId?.truckyRank}
                                      className="w-3.5 h-3.5" 
                                    />
                                  </div>
                                </div>
                                <div className="mt-1 flex flex-col gap-0.5">
                                  <p className="text-[10px] text-muted-foreground">Dipasang: {dateCreated}</p>
                                  {isEdited && <p className="text-[10px] text-blue-400">Diedit: {dateUpdated}</p>}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Harga/L</p>
                                <p className="font-bold text-primary text-sm">{item.pricePerLiter} NC</p>
                              </div>
                            </div>
                            
                            <div className="bg-card rounded-lg p-3 mb-4 mt-3 flex items-center justify-between border">
                              <div className="flex items-center gap-2">
                                <Fuel className="w-5 h-5 text-destructive" />
                                <span className="font-bold text-lg">{Math.floor(item.amount).toLocaleString("id-ID")} L</span>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Total: {totalCost.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NC (inc. fee)</p>
                              </div>
                            </div>
                          </div>
                          
                          <Button 
                            className="w-full"
                            disabled={isOwn || actionLoading}
                            variant={isOwn ? "outline" : "default"}
                            onClick={() => handleAction("/api/fuel-market/p2p/buy", { listingId: item._id }, `Anda yakin ingin membeli ${item.amount} Liter BBM dari ${item.sellerId?.name || "Anonim"} seharga ${totalCost} NC (termasuk fee 5%)?`)}
                          >
                            {isOwn ? "Ini Milik Anda (Lihat My Market)" : "Beli Sekarang"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* MY MARKET TAB */}
            {activeTab === "my-market" && (
              <div className="bg-card border shadow-sm rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Store className="w-5 h-5 text-primary" /> Dagangan Saya (My Market)
                  </h3>
                  <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
                  </Button>
                </div>
                
                {listings.filter((l: any) => l.sellerDiscordId === session.user.discordId).length === 0 ? (
                  <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed">
                    <Store className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">Anda belum memasang jualan BBM apa pun di Market.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {listings.filter((l: any) => l.sellerDiscordId === session.user.discordId).map((item: any) => {
                      const dateCreated = new Date(item.createdAt).toLocaleString("id-ID", { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Jakarta' }) + " WIB";
                      const dateUpdated = new Date(item.updatedAt).toLocaleString("id-ID", { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Jakarta' }) + " WIB";
                      const isEdited = item.createdAt !== item.updatedAt;

                      return (
                        <div key={item._id} className="border border-border/50 bg-background/50 rounded-xl p-4 flex flex-col justify-between hover:border-primary/30 transition-colors">
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-xs text-muted-foreground">Status Jualan</p>
                                <p className="font-bold text-sm text-emerald-500">Aktif di P2P Market</p>
                                <div className="mt-1 flex flex-col gap-0.5">
                                  <p className="text-[10px] text-muted-foreground">Dipasang: {dateCreated}</p>
                                  {isEdited && <p className="text-[10px] text-blue-400">Diedit: {dateUpdated}</p>}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Harga Jual/L</p>
                                <p className="font-bold text-primary text-sm">{item.pricePerLiter} NC</p>
                              </div>
                            </div>
                            
                            <div className="bg-card rounded-lg p-3 mb-4 mt-3 flex items-center justify-between border">
                              <div className="flex items-center gap-2">
                                <Fuel className="w-5 h-5 text-destructive" />
                                <span className="font-bold text-lg">{Math.floor(item.amount).toLocaleString("id-ID")} L</span>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] text-muted-foreground">Estimasi Pendapatan Bersih</p>
                                <p className="font-bold text-sm text-emerald-500">{(item.amount * item.pricePerLiter).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NC</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 mt-auto">
                            <Button 
                              variant="outline"
                              disabled={actionLoading}
                              onClick={() => handleEditPrice(item._id, item.pricePerLiter)}
                            >
                              <Edit2 className="w-4 h-4 mr-2" /> Edit Harga
                            </Button>
                            <Button 
                              variant="destructive"
                              disabled={actionLoading}
                              onClick={() => handleCancelListing(item._id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Tarik BBM
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* MY GARAGE TAB */}
            {activeTab === "garage" && (
              <div className="grid lg:grid-cols-2 gap-6">
                
                {/* Garage Status */}
                <div className="bg-card border shadow-sm rounded-2xl p-6 space-y-6">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <ArrowUpCircle className="w-5 h-5 text-primary" /> Status Tangki BBM Garasi
                  </h3>
                  
                  {!garage ? (
                    <div className="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
                      Anda belum memiliki Garasi aktif.
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Kapasitas Terisi</span>
                          <span className="font-bold">{Math.floor((garage.fuelStock || 0) + (garage.fuelListed || 0)).toLocaleString("id-ID")} / {(garage.fuelCapacity || 2000).toLocaleString("id-ID")} Liter</span>
                        </div>
                        <div className="h-4 w-full bg-muted rounded-full overflow-hidden flex">
                          <div 
                            className="h-full bg-primary transition-all" 
                            title={`Tersedia: ${Math.floor(garage.fuelStock || 0).toLocaleString("id-ID")} L`}
                            style={{ width: `${Math.min(((garage.fuelStock || 0) / (garage.fuelCapacity || 2000)) * 100, 100)}%` }}
                          />
                          {(garage.fuelListed || 0) > 0 && (
                            <div 
                              className="h-full bg-amber-500 transition-all" 
                              title={`Di Market: ${Math.floor(garage.fuelListed || 0).toLocaleString("id-ID")} L`}
                              style={{ width: `${Math.min(((garage.fuelListed || 0) / (garage.fuelCapacity || 2000)) * 100, 100)}%` }}
                            />
                          )}
                        </div>
                        <div className="flex gap-4 text-xs">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                             <div className="w-2 h-2 rounded-full bg-primary" />
                             <span>Tersedia: {Math.floor(garage.fuelStock || 0).toLocaleString("id-ID")} L</span>
                          </div>
                          {(garage.fuelListed || 0) > 0 && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                               <div className="w-2 h-2 rounded-full bg-amber-500" />
                               <span>Di Market: {Math.floor(garage.fuelListed || 0).toLocaleString("id-ID")} L</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-muted/50 rounded-xl border">
                          <p className="text-xs text-muted-foreground mb-1">Level Tangki</p>
                          <p className="font-bold text-xl">Lvl {garage.fuelTankLevel || 1}</p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-xl border">
                          <p className="text-xs text-muted-foreground mb-1">Operational Cost</p>
                          <p className="font-bold text-xl text-destructive">-{garage.operational_cost || 0} NC</p>
                        </div>
                      </div>

                      <div className="pt-4 border-t space-y-4">
                        <div>
                          <h4 className="font-bold text-sm mb-2">Upgrade Kapasitas (+1.000L)</h4>
                          <p className="text-xs text-muted-foreground mb-4">
                            Biaya 500 NC/level. Menambah Operational Cost garasi secara progresif berdasarkan tier level (mulai 200 NC, naik 100 NC tiap 5 level).
                          </p>
                          <Button 
                            variant="secondary" 
                            className="w-full"
                            disabled={actionLoading}
                            onClick={() => handleBulkUpgrade(garage.fuelTankLevel || 1)}
                          >
                            {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <ArrowUpCircle className="w-4 h-4 mr-2" />}
                            Upgrade Tangki (500 NC)
                          </Button>
                        </div>
                        
                        {(garage.fuelTankLevel || 1) > 1 && (
                          <div className="pt-4 border-t">
                            <h4 className="font-bold text-sm mb-2 text-destructive">Downgrade Kapasitas (-1.000L)</h4>
                            <p className="text-xs text-muted-foreground mb-4">
                              Biaya 250 NC/level. Mengurangi Operational Cost garasi sesuai progresif tier level Anda. Saldo NC upgrade sebelumnya tidak di-refund.
                            </p>
                            <Button 
                              variant="destructive" 
                              className="w-full"
                              disabled={actionLoading}
                              onClick={() => handleBulkDowngrade(garage.fuelTankLevel || 1)}
                            >
                              {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <ArrowDownCircle className="w-4 h-4 mr-2" />}
                              Downgrade Tangki
                            </Button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Sell Form */}
                <div className="bg-card border shadow-sm rounded-2xl p-6 space-y-6">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-primary" /> Jual BBM ke Market (P2P)
                  </h3>
                  
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      BBM akan dipotong dari tangki garasi Anda dan masuk ke daftar jualan Driver Market. 
                      Anda akan menerima NC penuh sesuai harga per liter yang Anda tentukan (pembeli yang menanggung fee sistem 5%).
                    </p>
                    
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Jumlah BBM yang dijual (Liter)</label>
                      <Input 
                        type="number" 
                        value={sellAmount} 
                        onChange={(e) => setSellAmount(e.target.value)} 
                        placeholder="Maks: 1000" 
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">
                        Harga jual per Liter (NC) <span className="text-destructive font-medium ml-1">(Maks: 1.5 NC)</span>
                      </label>
                      <Input 
                        type="number" 
                        step="0.01"
                        max="1.5"
                        value={sellPrice} 
                        onChange={(e) => setSellPrice(e.target.value)} 
                        placeholder="Contoh: 0.5" 
                      />
                    </div>

                    {sellAmount && sellPrice && Number(sellAmount) > 0 && Number(sellPrice) > 0 && (
                      <div className="bg-primary/10 p-4 rounded-xl text-sm space-y-2 border border-primary/20">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pemasukan Anda (Utuh):</span>
                          <span className="font-bold">{(Number(sellAmount) * Number(sellPrice)).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NC</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Harga tampil di Market (inc. Fee):</span>
                          <span className="font-bold text-accent-sky">
                            {Math.ceil(Number(sellAmount) * Number(sellPrice) * 1.05).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NC
                          </span>
                        </div>
                      </div>
                    )}

                    <Button 
                      className="w-full" 
                      disabled={!sellAmount || !sellPrice || actionLoading || !garage || Number(sellPrice) > 1.5}
                      onClick={() => handleAction("/api/fuel-market/p2p", { amount: Number(sellAmount), pricePerLiter: Number(sellPrice) }, `Anda yakin ingin memasang iklan jualan ${sellAmount} Liter BBM seharga ${sellPrice} NC/Liter? BBM akan dipotong dari tangki Anda sekarang.`)}
                    >
                      {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Banknote className="w-4 h-4 mr-2" />}
                      Pasang Iklan Jualan
                    </Button>
                  </div>
                </div>

              </div>
            )}

            {/* HISTORY TAB */}
            {activeTab === "history" && (
              <div className="bg-card border shadow-sm rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" /> Riwayat Transaksi BBM
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => fetchHistory(1)} disabled={loadingHistory}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loadingHistory ? "animate-spin" : ""}`} /> Refresh
                  </Button>
                </div>

                {loadingHistory && history.length === 0 ? (
                  <div className="py-12 flex justify-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed">
                    <History className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">Anda belum memiliki riwayat transaksi BBM.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map((tx: any) => {
                      const isBuyer = tx.buyerDiscordId === session.user.discordId;
                      const roleLabel = isBuyer ? "BELI" : "JUAL";
                      const colorClass = isBuyer ? "text-destructive bg-destructive/10 border-destructive/20" : "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
                      const partner = isBuyer ? tx.sellerName : tx.buyerName;
                      const date = new Date(tx.createdAt).toLocaleString("id-ID", { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }) + " WIB";

                      return (
                        <div key={tx._id} className="flex flex-col md:flex-row items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-4 w-full md:w-auto mb-4 md:mb-0">
                            <div className={`px-3 py-1 rounded-lg text-xs font-bold border ${colorClass} w-16 text-center`}>
                              {roleLabel}
                            </div>
                            <div>
                              <p className="font-medium text-sm md:text-base">
                                {Math.floor(tx.amount).toLocaleString("id-ID")} Liter @ {tx.pricePerLiter} NC
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {date} • {tx.type === "system" ? "Sistem Market" : "Driver Market"}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex flex-col md:items-end w-full md:w-auto">
                            <p className={`font-bold text-lg ${isBuyer ? 'text-destructive' : 'text-emerald-500'}`}>
                              {isBuyer ? "-" : "+"}{tx.totalPrice.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NC
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {isBuyer ? `Membeli dari: ${partner}` : `Terjual ke: ${partner}`}
                            </p>
                          </div>
                        </div>
                      );
                    })}

                    {/* Pagination */}
                    {historyTotalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t mt-6">
                        <p className="text-sm text-muted-foreground">
                          Halaman {historyPage} dari {historyTotalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={historyPage === 1 || loadingHistory}
                            onClick={() => fetchHistory(historyPage - 1)}
                          >
                            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={historyPage === historyTotalPages || loadingHistory}
                            onClick={() => fetchHistory(historyPage + 1)}
                          >
                            Next <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
