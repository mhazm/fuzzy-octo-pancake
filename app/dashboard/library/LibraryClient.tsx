"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Download, Library, Box } from "lucide-react";
import { useSession } from "next-auth/react";

export default function MyLibrary() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();

  useEffect(() => {
    if (session) {
      fetchLibrary();
    }
  }, [session]);

  const fetchLibrary = async () => {
    try {
      const res = await fetch("/api/market/library");
      const data = await res.json();
      setPurchases(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Gagal mengambil data library:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-(-primary-foreground) mb-2">My Library</h1>
        <p className="text-gray-400 text-sm">Akses dan download semua mod yang telah Anda beli.</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-accent-lilac/20 border-t-accent-lilac rounded-full"></div>
        </div>
      ) : purchases.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {purchases.map((purchase) => {
            const item = purchase.marketItemId;
            if (!item) return null; // Jika mod dihapus dari database

            return (
              <div key={purchase._id} className="bg-card/50 border border-border/50 rounded-2xl overflow-hidden flex flex-col group">
                <div className="aspect-video bg-black/50 relative overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <Box className="w-10 h-10" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-1 bg-black/70 backdrop-blur text-xs font-bold rounded-lg text-white">
                      {item.game_id === 1 ? "ETS2" : "ATS"}
                    </span>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg text-white mb-1 line-clamp-1 group-hover:text-accent-lilac transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">Dibeli: {new Date(purchase.purchasedAt || purchase.createdAt).toLocaleDateString("id-ID")}</p>
                  
                  <div className="mt-auto flex flex-col gap-2">
                    <a
                      href={item.download_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 py-3 bg-green-500/10 text-green-400 font-bold rounded-xl hover:bg-green-500 hover:text-white border border-green-500/20 hover:border-green-500 transition-all"
                    >
                      <Download className="w-4 h-4" /> Download
                    </a>
                    <Link
                      href={`/market/${item.slug}`}
                      className="flex items-center justify-center gap-2 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Lihat Halaman Market
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-card/30 border border-border/50 rounded-2xl">
          <Library className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-300">Library Anda Masih Kosong</h3>
          <p className="text-gray-500 mb-6">Anda belum membeli mod apapun dari market.</p>
          <Link
            href="/market"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent-lilac text-white font-bold rounded-xl hover:bg-accent-lilac/80 transition-colors"
          >
            Jelajahi Market
          </Link>
        </div>
      )}
    </main>
  );
}
