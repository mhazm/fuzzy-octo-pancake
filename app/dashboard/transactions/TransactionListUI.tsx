"use client";

import { useState } from "react";
import { 
  Search, Filter, Truck, Wrench, Shield, ShoppingCart, ShoppingBag, Info, 
  CheckCircle2, Clock, XCircle, ArrowUpDown, ChevronLeft, ChevronRight
} from "lucide-react";

interface Transaction {
  _id: string;
  trxId: string;
  title: string;
  category: string;
  amount: number;
  currency: "NC" | "IDR";
  status: "success" | "pending" | "failed";
  createdAt: string;
  metadata: any;
}

export default function TransactionListUI({ transactions }: { transactions: Transaction[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const filtered = transactions.filter(t => {
    const matchSearch = t.trxId.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        t.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === "all" || t.category === categoryFilter;
    const matchCur = currencyFilter === "all" || t.currency === currencyFilter;
    return matchSearch && matchCat && matchCur;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "fleet": return <Truck className="w-4 h-4 text-primary" />;
      case "maintenance": return <Wrench className="w-4 h-4 text-orange-500" />;
      case "nismaraplus": return <Shield className="w-4 h-4 text-yellow-500" />;
      case "market": return <ShoppingCart className="w-4 h-4 text-green-500" />;
      default: return <Info className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "fleet": return "Pembelian Fleet";
      case "maintenance": return "Servis Armada";
      case "nismaraplus": return "Nismara+ Premium";
      case "market": return "Mod Market";
      default: return "Lainnya";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success": 
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest"><CheckCircle2 className="w-3 h-3"/> Sukses</span>;
      case "pending": 
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-[10px] font-black uppercase tracking-widest"><Clock className="w-3 h-3"/> Pending</span>;
      case "failed": 
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest"><XCircle className="w-3 h-3"/> Gagal</span>;
      default: return null;
    }
  };

  return (
    <div className="bg-card border rounded-[2rem] shadow-sm overflow-hidden flex flex-col">
      {/* Table Toolbar */}
      <div className="p-6 border-b border-border/50 bg-secondary/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Cari ID Transaksi atau nama barang..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-11 pr-4 py-3 bg-background border-border border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-background border rounded-xl p-1">
            <select 
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent text-sm px-3 py-2 outline-none cursor-pointer font-medium"
            >
              <option className="bg-background text-foreground" value="all">Semua Kategori</option>
              <option className="bg-background text-foreground" value="fleet">Fleet</option>
              <option className="bg-background text-foreground" value="maintenance">Servis</option>
              <option className="bg-background text-foreground" value="nismaraplus">Nismara+</option>
              <option className="bg-background text-foreground" value="market">Market</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-background border rounded-xl p-1">
            <select 
              value={currencyFilter}
              onChange={e => { setCurrencyFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent text-sm px-3 py-2 outline-none cursor-pointer font-medium"
            >
              <option className="bg-background text-foreground" value="all">Semua Mata Uang</option>
              <option className="bg-background text-foreground" value="NC">Nismara Coin</option>
              <option className="bg-background text-foreground" value="IDR">Rupiah (IDR)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto w-full">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
            <ShoppingBag className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-medium text-lg">Tidak ada transaksi</p>
            <p className="text-sm">Riwayat transaksi belanja Anda masih kosong atau tidak sesuai filter.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/10 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">Transaksi</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Kategori</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right flex items-center justify-end gap-2">Nominal <ArrowUpDown className="w-3 h-3 opacity-50"/></th>
                <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map(t => (
                <tr key={t._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground group-hover:text-primary transition-colors">{t.title}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">{t.trxId}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(t.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-secondary rounded-lg">
                        {getCategoryIcon(t.category)}
                      </div>
                      <span className="font-medium text-muted-foreground">{getCategoryLabel(t.category)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex flex-col items-end">
                      <span className={`font-black text-lg ${t.currency === "NC" ? "text-foreground" : "text-blue-500"}`}>
                        {t.currency === "IDR" && "Rp"} {t.amount.toLocaleString("id-ID")}
                      </span>
                      <span className="text-[10px] font-bold tracking-widest text-muted-foreground">{t.currency}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(t.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      {filtered.length > 0 && (
        <div className="p-4 border-t bg-secondary/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest">
            Menampilkan {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-
            {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} dari {filtered.length} transaksi
          </p>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border bg-background hover:bg-secondary disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold w-12 text-center">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border bg-background hover:bg-secondary disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
