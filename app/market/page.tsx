"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Filter, Download, Box, ShoppingCart, Star, User } from "lucide-react";

export default function MarketPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterGameId, setFilterGameId] = useState("");
  const [filterPrice, setFilterPrice] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    { id: "vehicle", label: "Vehicle" },
    { id: "trailer", label: "Trailer" },
    { id: "map", label: "Map" },
    { id: "sound", label: "Sound" },
    { id: "vehicle_part", label: "Vehicle Part" },
    { id: "skin", label: "Skin" },
    { id: "other", label: "Other" },
  ];

  useEffect(() => {
    fetchItems();
  }, [filterCategory, filterGameId]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      let url = "/api/market?";
      if (filterCategory) url += `category=${filterCategory}&`;
      if (filterGameId) url += `game_id=${filterGameId}&`;

      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      setItems(data);
    } catch (error) {
      console.error("Gagal mengambil data market:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPrice =
      filterPrice === "all"
        ? true
        : filterPrice === "free"
        ? item.price === 0
        : item.price > 0;
    
    return matchesSearch && matchesPrice;
  });

  return (
    <main className="max-w-7xl mx-auto px-4 py-12 min-h-screen">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-black text-(-primary-foreground) uppercase tracking-tighter mb-4">
          Nismara <span className="text-primary">Market</span>
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Tempat jual beli mods eksklusif antar driver. Temukan vehicle, map, skin, dan lainnya untuk pengalaman bermain yang lebih baik.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 mb-8">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama mod..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card/50 border border-border/50 text-foreground pl-12 pr-4 py-3 rounded-2xl focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        {/* Filter Kategori */}
        <div className="relative min-w-[200px]">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full bg-card/50 border border-border/50 text-foreground pl-12 pr-4 py-3 rounded-2xl appearance-none focus:outline-none focus:border-primary/50 transition-colors"
          >
            <option value="">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Game */}
        <div className="relative min-w-[200px]">
          <Box className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={filterGameId}
            onChange={(e) => setFilterGameId(e.target.value)}
            className="w-full bg-card/50 border border-border/50 text-foreground pl-12 pr-4 py-3 rounded-2xl appearance-none focus:outline-none focus:border-primary/50 transition-colors"
          >
            <option value="">Semua Game</option>
            <option value="1">Euro Truck Simulator 2</option>
            <option value="2">American Truck Simulator</option>
          </select>
        </div>

        {/* Filter Harga */}
        <div className="relative min-w-[200px]">
          <ShoppingCart className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={filterPrice}
            onChange={(e) => setFilterPrice(e.target.value)}
            className="w-full bg-card/50 border border-border/50 text-foreground pl-12 pr-4 py-3 rounded-2xl appearance-none focus:outline-none focus:border-primary/50 transition-colors"
          >
            <option value="all">Semua Harga</option>
            <option value="free">Gratis (0 NC)</option>
            <option value="premium">Berbayar (&gt; 0 NC)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full"></div>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <Link href={`/market/${item.slug}`} key={item._id} className="group">
              <div className="bg-card/30 border border-border/50 rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 h-full flex flex-col">
                <div className="aspect-video w-full bg-black/50 relative overflow-hidden">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <Box className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                    <span className="px-2 py-1 bg-black/70 backdrop-blur text-xs font-bold rounded-lg text-white">
                      {item.game_id === 1 ? "ETS2" : "ATS"} {item.game_version && `v${item.game_version}`}
                    </span>
                    {item.categories && item.categories.length > 0 && (
                      <span className="px-2 py-1 bg-primary/80 backdrop-blur text-xs font-bold rounded-lg text-white capitalize">
                        {item.categories[0].replace("_", " ")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg text-foreground line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <div className="flex items-center justify-between mb-4 mt-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <User className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[120px]">{item.sellerName || "Unknown"}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-yellow-400 font-bold bg-yellow-400/10 px-1.5 py-0.5 rounded">
                      <Star className="w-3 h-3 fill-yellow-400" />
                      <span>{item.averageRating > 0 ? item.averageRating : "-"}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-4">
                    <div className="font-bold text-lg text-yellow-400 flex items-center gap-1">
                      {item.price > 0 ? (
                        <>
                          <ShoppingCart className="w-4 h-4" /> {item.price} NC
                        </>
                      ) : (
                        <span className="text-green-400">Gratis</span>
                      )}
                    </div>
                    <span className="text-xs text-primary hover:underline cursor-pointer">
                      Lihat Detail &rarr;
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-card/30 border border-border/50 rounded-2xl">
          <Box className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-300">Tidak ada mod ditemukan</h3>
          <p className="text-gray-500">Coba ubah filter atau kata kunci pencarian Anda.</p>
        </div>
      )}
    </main>
  );
}
