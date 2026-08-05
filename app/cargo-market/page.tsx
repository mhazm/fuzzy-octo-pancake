import React from "react";
import clientPromise from "@/lib/mongodb";
import { PackageOpen, Coins, Search, ChevronLeft, ChevronRight, AlertTriangle, ShieldAlert, Diamond, Scale, TrendingUp, TrendingDown, Filter } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Cargo Market",
};



export const dynamic = "force-dynamic";

export default async function CargoMarketPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  
  // Pagination
  const page = parseInt((resolvedParams.page as string) || "1", 10);
  const limit = 24;
  const skip = (page - 1) * limit;

  // Filters
  const q = (resolvedParams.q as string) || "";
  const game = resolvedParams.game as string;
  const sort = (resolvedParams.sort as string) || "price_desc";

  const client = await clientPromise;
  const db = client.db();

  // Build query
  const query: any = {};
  if (q) {
    query.name = { $regex: q, $options: "i" };
  }
  if (game && (game === "1" || game === "2")) {
    query.game_id = parseInt(game, 10);
  }

  // Build sort
  let sortObj: any = { price_per_km_with_market_change: -1 };
  if (sort === "price_asc") sortObj = { price_per_km_with_market_change: 1 };
  else if (sort === "mass_desc") sortObj = { mass: -1 };
  else if (sort === "mass_asc") sortObj = { mass: 1 };
  else if (sort === "demand_desc") sortObj = { market_demand: -1 };

  const totalCargos = await db.collection("cargos").countDocuments(query);
  const totalPages = Math.ceil(totalCargos / limit);

  const cargos = await db.collection("cargos")
    .find(query)
    .sort(sortObj)
    .skip(skip)
    .limit(limit)
    .toArray();

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER SECTION */}
      <div className="w-full bg-card border-b border-border/50 py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-background to-transparent z-0" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-background/80 backdrop-blur-md rounded-2xl border border-border/50 flex items-center justify-center shadow-xl">
                <PackageOpen size={32} className="text-primary" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter uppercase drop-shadow-lg">
                  Katalog Kargo
                </h1>
                <p className="text-muted-foreground font-bold uppercase tracking-widest mt-2 text-xs">
                  Ensiklopedia Resmi Kargo Nismara
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8 animate-in fade-in duration-700">
        
        {/* FILTER BAR */}
        <div className="glass-panel p-4 rounded-2xl border-slate-200 dark:border-white/5 bg-card shadow-lg flex flex-col lg:flex-row gap-4 items-center justify-between">
          <form className="flex-1 w-full flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input 
                type="text" 
                name="q" 
                defaultValue={q} 
                placeholder="Cari nama kargo..." 
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
              />
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select 
                name="game" 
                defaultValue={game || ""}
                className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm font-bold uppercase tracking-wider focus:outline-none cursor-pointer"
              >
                <option value="">Semua Game</option>
                <option value="1">Euro Truck Simulator 2</option>
                <option value="2">American Truck Simulator</option>
              </select>

              <select 
                name="sort" 
                defaultValue={sort}
                className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm font-bold uppercase tracking-wider focus:outline-none cursor-pointer"
              >
                <option value="price_desc">Harga Tertinggi</option>
                <option value="price_asc">Harga Terendah</option>
                <option value="mass_desc">Berat Tertinggi</option>
                <option value="mass_asc">Berat Terendah</option>
                <option value="demand_desc">Permintaan Terbanyak</option>
              </select>

              <button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-colors shadow-lg shadow-primary/20">
                Filter
              </button>
            </div>
          </form>

          <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
            {totalCargos} Kargo Ditemukan
          </div>
        </div>

        {/* CARGO GRID */}
        {cargos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {cargos.map((cargo) => {
              const isETS2 = cargo.game_id === 1;
              const themeColor = isETS2 
                ? "border-blue-500/30 bg-blue-500/5 hover:border-blue-500/60 shadow-blue-500/5" 
                : "border-red-500/30 bg-red-500/5 hover:border-red-500/60 shadow-red-500/5";
              
              const accentColor = isETS2 ? "text-blue-500" : "text-red-500";
              const accentBg = isETS2 ? "bg-blue-500/10" : "bg-red-500/10";
              const badgeTheme = isETS2 ? "bg-blue-500 text-white" : "bg-red-500 text-white";

              return (
                <Link href={`/cargo-market/${cargo.game_id}/${cargo.in_game_id}`} key={cargo._id.toString()} className={`glass-panel rounded-2xl border transition-all duration-300 hover:-translate-y-1 shadow-lg ${themeColor} flex flex-col overflow-hidden`}>
                  {/* Game Badge */}
                  <div className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest flex items-center ${badgeTheme}`}>
                    <span>{isETS2 ? "ETS2" : "ATS"}</span>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-black text-lg text-foreground uppercase tracking-tight mb-4 line-clamp-2">
                      {cargo.name}
                    </h3>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {cargo.adr_class > 0 && (
                        <div className="flex items-center gap-1 bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-1 rounded text-[10px] font-black uppercase" title={`ADR Class ${cargo.adr_class}`}>
                          <ShieldAlert size={12} /> ADR {cargo.adr_class}
                        </div>
                      )}
                      {(cargo.is_fragile || cargo.fragility > 0) && (
                        <div className="flex items-center gap-1 bg-orange-500/10 text-orange-500 border border-orange-500/20 px-2 py-1 rounded text-[10px] font-black uppercase" title="Fragile">
                          <AlertTriangle size={12} /> Pecah Belah
                        </div>
                      )}
                      {cargo.valuable && (
                        <div className="flex items-center gap-1 bg-purple-500/10 text-purple-500 border border-purple-500/20 px-2 py-1 rounded text-[10px] font-black uppercase" title="Valuable">
                          <Diamond size={12} /> Berharga
                        </div>
                      )}
                      {cargo.overweight && (
                        <div className="flex items-center gap-1 bg-pink-500/10 text-pink-500 border border-pink-500/20 px-2 py-1 rounded text-[10px] font-black uppercase" title="Overweight">
                          <Scale size={12} /> Overweight
                        </div>
                      )}
                    </div>

                    <div className="mt-auto space-y-3">
                      <div className="flex justify-between items-end border-b border-border/30 pb-3">
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Market Demand</p>
                          <div className={`flex items-center gap-1.5 font-black text-sm ${cargo.market_demand < 0 ? 'text-red-500' : cargo.market_demand > 0 ? 'text-green-500' : 'text-slate-400'}`}>
                            {cargo.market_demand < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />} 
                            {cargo.market_demand > 0 ? `+${cargo.market_demand.toFixed(1)}%` : `${cargo.market_demand.toFixed(1)}%`}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Berat Dasar</p>
                          <div className="flex items-center justify-end gap-1.5 font-black text-sm">
                            <Scale size={14} className="text-slate-400" /> 
                            {cargo.mass ? `${cargo.mass} kg` : "-"}
                          </div>
                        </div>
                      </div>

                      <div className={`p-3 rounded-xl ${accentBg} border border-border/10 flex justify-between items-end`}>
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Base (Per KM)</p>
                          <div className="flex items-center gap-1.5 font-bold text-sm text-foreground/80">
                            {cargo.price_per_km ? cargo.price_per_km.toLocaleString("id-ID") : "0"} NC
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Income Final</p>
                          <div className={`flex items-center gap-1.5 font-black text-xl ${accentColor}`}>
                            <Coins size={18} /> 
                            {cargo.price_per_km_with_market_change ? cargo.price_per_km_with_market_change.toLocaleString("id-ID") : "0"} <span className="text-xs uppercase">NC</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="glass-panel py-20 rounded-2xl border-slate-200 dark:border-white/5 bg-card flex flex-col items-center justify-center text-center">
            <PackageOpen size={64} className="text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-black uppercase tracking-widest text-foreground">Kargo Tidak Ditemukan</h3>
            <p className="text-muted-foreground mt-2 font-medium">Coba gunakan kata kunci pencarian atau filter yang berbeda.</p>
          </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 pt-6">
            <Link 
              href={`?page=${Math.max(1, page - 1)}${q ? `&q=${q}` : ""}${game ? `&game=${game}` : ""}${sort ? `&sort=${sort}` : ""}`}
              className={`p-2 rounded-xl border ${page <= 1 ? 'border-border/30 text-muted-foreground pointer-events-none' : 'border-border hover:bg-muted text-foreground'}`}
            >
              <ChevronLeft size={20} />
            </Link>
            
            <span className="text-sm font-bold uppercase tracking-widest">
              Halaman <span className="text-primary">{page}</span> dari {totalPages}
            </span>

            <Link 
              href={`?page=${Math.min(totalPages, page + 1)}${q ? `&q=${q}` : ""}${game ? `&game=${game}` : ""}${sort ? `&sort=${sort}` : ""}`}
              className={`p-2 rounded-xl border ${page >= totalPages ? 'border-border/30 text-muted-foreground pointer-events-none' : 'border-border hover:bg-muted text-foreground'}`}
            >
              <ChevronRight size={20} />
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
