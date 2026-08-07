"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, AlertTriangle, Edit, Eye, MessageSquare, Download, Clock, Store } from "lucide-react";
import Image from "next/image";
import { showAlert } from "@/lib/dialog";


export default function MarketManagerClient() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  // Modals
  const [reasonModal, setReasonModal] = useState<{ open: boolean; action: "reject" | "takedown"; itemId: string | null }>({
    open: false, action: "reject", itemId: null
  });
  const [reason, setReason] = useState("");

  const [confirmModal, setConfirmModal] = useState<{ open: boolean; action: "approve" | ""; itemId: string | null; title: string }>({
    open: false, action: "", itemId: null, title: ""
  });

  const [editModal, setEditModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/manage/market?status=${filter}&_t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setItems(data.items);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [filter]);

  const handleAction = async (itemId: string, action: string, actionData: any = {}) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/manage/market/${itemId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...actionData })
      });
      const data = await res.json();
      if (data.success) {
        setReasonModal({ open: false, action: "reject", itemId: null });
        setReason("");
        setEditModal({ open: false, data: null });
        setConfirmModal({ open: false, action: "", itemId: null, title: "" });
        fetchItems();
      } else {
        showAlert(data.error);
      }
    } catch (error) {
      showAlert("Terjadi kesalahan sistem");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitReason = () => {
    if (!reason.trim()) return showAlert("Alasan wajib diisi");
    handleAction(reasonModal.itemId!, reasonModal.action, { reason });
  };

  const executeConfirmAction = () => {
    if (!confirmModal.itemId || !confirmModal.action) return;
    handleAction(confirmModal.itemId, confirmModal.action);
  };

  const submitEdit = () => {
    if (!editModal.data) return;
    handleAction(editModal.data._id, "edit", { editData: editModal.data });
  };

  return (
    <main className="p-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white mb-2">Pusat Persetujuan Mod</h1>
          <p className="text-gray-400 text-sm">Review, setujui, atau takedown mod yang diunggah oleh driver.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {["all", "pending", "approved", "rejected", "takedown"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
              filter === status 
                ? "bg-accent-lilac text-white" 
                : "bg-black/50 text-gray-400 hover:bg-black/80"
            }`}
          >
            {status.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-accent-lilac/20 border-t-accent-lilac rounded-full"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-card/30 border border-border/50 rounded-2xl">
          <Store className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-300">Kosong</h3>
          <p className="text-gray-500">Tidak ada mod dalam status ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div key={item._id} className="bg-card/50 border border-border/50 rounded-2xl overflow-hidden flex flex-col">
              <div className="h-48 relative bg-black/50">
                {item.image_url ? (
                  <Image src={item.image_url} alt={item.title} fill className="object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-600">No Image</div>
                )}
                <div className="absolute top-2 right-2 px-3 py-1 bg-black/80 backdrop-blur-sm rounded-lg text-xs font-bold border border-white/10 uppercase tracking-widest text-white">
                  {item.status}
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-lg font-bold text-white line-clamp-1">{item.title}</h3>
                  <div className="text-accent-lilac font-black text-lg whitespace-nowrap">{item.price} NC</div>
                </div>
                
                <div className="text-xs text-gray-400 mb-4 flex-1 line-clamp-2">
                  {item.description}
                </div>
                
                <div className="bg-black/30 rounded-xl p-3 border border-border/30 mb-4 text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-500">Kreator:</span>
                    <span className="font-bold text-white">{item.sellerName}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-500">Terjual:</span>
                    <span className="font-bold text-white">{item.purchases} kali</span>
                  </div>
                  {item.reviewerName && (
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-500">Reviewer:</span>
                      <span className="font-bold text-white">{item.reviewerName}</span>
                    </div>
                  )}
                  {item.rejectReason && (
                    <div className="mt-2 pt-2 border-t border-border/30">
                      <span className="text-red-400 font-bold block mb-0.5">Alasan:</span>
                      <span className="text-gray-300 italic">{item.rejectReason}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {item.status === "pending" && (
                    <>
                      <button onClick={() => setConfirmModal({ open: true, action: "approve", itemId: item._id, title: item.title })} disabled={isSubmitting} className="col-span-2 py-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                        <CheckCircle className="w-4 h-4" /> Approve Mod
                      </button>
                      <button onClick={() => setReasonModal({ open: true, action: "reject", itemId: item._id })} className="py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                      <button onClick={() => setEditModal({ open: true, data: { ...item } })} className="py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                        <Edit className="w-4 h-4" /> Edit Data
                      </button>
                    </>
                  )}
                  
                  {item.status === "approved" && (
                    <>
                      <button onClick={() => setReasonModal({ open: true, action: "takedown", itemId: item._id })} className="col-span-2 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                        <AlertTriangle className="w-4 h-4" /> Takedown
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* REASON MODAL */}
      {reasonModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-white mb-2 capitalize">{reasonModal.action} Mod</h3>
            <p className="text-sm text-gray-400 mb-4">Berikan alasan yang jelas. Ini akan dikirim ke notifikasi/DM kreator.</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-black/50 border border-border/50 rounded-xl px-4 py-3 text-white mb-4 min-h-[100px] focus:outline-none focus:border-red-500"
              placeholder="Contoh: Screenshot buram, harga terlalu mahal..."
            />
            <div className="flex gap-3">
              <button onClick={() => setReasonModal({ open: false, action: "reject", itemId: null })} className="flex-1 py-3 bg-gray-800 text-white rounded-xl font-bold">Batal</button>
              <button onClick={submitReason} disabled={isSubmitting} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold">Kirim {reasonModal.action}</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-white mb-2 capitalize">Konfirmasi {confirmModal.action}</h3>
            <p className="text-sm text-gray-400 mb-6">
              Apakah Anda yakin ingin menyetujui mod <strong className="text-white">"{confirmModal.title}"</strong> untuk rilis di Nismara Market? 
              Aksi ini akan merilis mod ke publik.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal({ open: false, action: "", itemId: null, title: "" })} className="flex-1 py-3 bg-gray-800 text-white rounded-xl font-bold">Batal</button>
              <button onClick={executeConfirmAction} disabled={isSubmitting} className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold">
                {isSubmitting ? "Memproses..." : "Ya, Approve Mod"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editModal.open && editModal.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-6">Edit Detail Mod</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Judul</label>
                <input type="text" value={editModal.data.title} onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, title: e.target.value } })} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Harga (NC)</label>
                <input type="number" value={editModal.data.price} onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, price: e.target.value } })} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Deskripsi</label>
                <textarea value={editModal.data.description} onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, description: e.target.value } })} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white min-h-[100px]" />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setEditModal({ open: false, data: null })} className="flex-1 py-3 bg-gray-800 text-white rounded-xl font-bold">Batal</button>
              <button onClick={submitEdit} disabled={isSubmitting} className="flex-1 py-3 bg-accent-lilac text-white rounded-xl font-bold">Simpan Perubahan</button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
