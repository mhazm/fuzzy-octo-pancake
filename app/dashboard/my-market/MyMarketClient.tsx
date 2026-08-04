"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Edit2, Box, Package, Trash2, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";

export default function MyMarket() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string | null; title: string }>({
    open: false,
    id: null,
    title: "",
  });
  
  const { data: session } = useSession();

  useEffect(() => {
    if (session) {
      fetchMyItems();
    }
  }, [session]);

  const fetchMyItems = async () => {
    try {
      const res = await fetch("/api/market/my-items");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Gagal mengambil data dagangan:", error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/market/${deleteModal.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      
      if (res.ok) {
        setItems(items.filter(item => item._id !== deleteModal.id));
        setDeleteModal({ open: false, id: null, title: "" });
      } else {
        alert(data.error || "Gagal menghapus mod");
      }
    } catch (error) {
      alert("Terjadi kesalahan sistem");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white mb-2">My Market</h1>
          <p className="text-gray-400 text-sm">Kelola mods yang Anda jual di Nismara Market.</p>
        </div>
        <Link
          href="/dashboard/my-market/create"
          className="inline-flex items-center gap-2 px-6 py-3 bg-accent-lilac text-white font-bold rounded-xl hover:bg-accent-lilac/80 transition-colors shadow-lg shadow-accent-lilac/20"
        >
          <Plus className="w-5 h-5" /> Jual Mod Baru
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-accent-lilac/20 border-t-accent-lilac rounded-full"></div>
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <div key={item._id} className="bg-card/50 border border-border/50 rounded-2xl overflow-hidden flex flex-col relative">
              <div className="absolute top-3 right-3 z-10 flex gap-2">
                <Link
                  href={`/dashboard/my-market/edit/${item._id}`}
                  className="w-10 h-10 bg-black/70 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-blue-500 transition-colors border border-white/10"
                  title="Edit Mod"
                >
                  <Edit2 className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => setDeleteModal({ open: true, id: item._id, title: item.title })}
                  className="w-10 h-10 bg-black/70 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors border border-white/10"
                  title="Hapus Mod"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="aspect-video bg-black/50 relative">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <Box className="w-10 h-10" />
                  </div>
                )}
                {item.status !== "approved" && (
                  <div className="absolute bottom-3 left-3 z-10">
                    <span className={`px-3 py-1 font-bold rounded-lg text-[10px] uppercase tracking-wider text-white border backdrop-blur-md shadow-lg ${
                      item.status === "pending" ? "bg-yellow-500/80 border-yellow-300/50" :
                      item.status === "rejected" ? "bg-red-500/80 border-red-300/50" :
                      item.status === "takedown" ? "bg-red-800/80 border-red-500/50" :
                      "bg-gray-800/80 border-gray-500/50"
                    }`}>
                      {item.status === "pending" ? "⏳ Menunggu Review" : 
                       item.status === "rejected" ? "❌ Ditolak" : 
                       item.status === "takedown" ? "🚨 Di-Takedown" : "👁️ Draft"}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-lg text-white mb-2 line-clamp-1">{item.title}</h3>
                
                {(item.status === "rejected" || item.status === "takedown") && item.rejectReason && (
                  <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-red-300">
                      <span className="font-bold text-red-400 block mb-0.5">Alasan {item.status}:</span>
                      {item.rejectReason}
                    </div>
                  </div>
                )}

                <div className="text-sm text-gray-400 mb-4 flex gap-2 flex-wrap">
                  <span className="bg-white/5 px-2 py-1 rounded border border-white/10 text-xs">
                    {item.game_id === 1 ? "ETS2" : "ATS"}
                  </span>
                  {item.categories?.map((c: string) => (
                    <span key={c} className="bg-white/5 px-2 py-1 rounded border border-white/10 text-xs capitalize">
                      {c.replace("_", " ")}
                    </span>
                  ))}
                </div>
                <div className="mt-auto pt-4 border-t border-border/50 flex justify-between items-center">
                  <span className="font-bold text-yellow-400">{item.price > 0 ? `${item.price} NC` : "Gratis"}</span>
                  <Link href={`/market/${item.slug}`} className="text-xs text-accent-lilac hover:underline">
                    Lihat di Market
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-card/30 border border-border/50 rounded-2xl">
          <Package className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-300">Belum Ada Barang Dagangan</h3>
          <p className="text-gray-500 mb-6">Mulai jual mod pertama Anda untuk mendapatkan NC!</p>
          <Link
            href="/dashboard/my-market/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent-lilac text-white font-bold rounded-xl hover:bg-accent-lilac/80 transition-colors"
          >
            <Plus className="w-5 h-5" /> Jual Mod Baru
          </Link>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md p-6 relative">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4 text-red-500">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Hapus Mod Permanen?</h3>
            <p className="text-sm text-gray-400 mb-6">
              Apakah Anda yakin ingin menghapus mod <strong className="text-white">"{deleteModal.title}"</strong>? 
              Aksi ini tidak dapat dibatalkan dan semua data beserta gambar di server akan dihapus secara permanen.
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteModal({ open: false, id: null, title: "" })} 
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={confirmDelete} 
                disabled={loading} 
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                {loading ? "Menghapus..." : "Ya, Hapus Mod"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
