"use client";

import React, { useState } from "react";
import { ExternalLink, CheckCircle, Clock, Truck, Loader2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { useNotification } from "@/components/ui/NotificationProvider";

export default function OrderListClient({ orders, managerDiscordId, guildId }: { orders: any[], managerDiscordId: string, guildId: string }) {
  const router = useRouter();
  const { showNotification } = useNotification();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [platNumber, setPlatNumber] = useState("");
  const [truckyId, setTruckyId] = useState("");

  const handleClaim = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/fleet/order/${id}/claim`, { method: "POST" });
      if (!res.ok) throw new Error("Gagal mengambil order");
      showNotification("success", "Order berhasil diambil alih.");
      router.refresh();
    } catch (err) {
      console.error(err);
      showNotification("error", "Gagal mengambil order");
    } finally {
      setProcessingId(null);
    }
  };

  const openCompleteModal = (id: string) => {
    setSelectedOrderId(id);
    setPlatNumber("");
    setTruckyId("");
    setCompleteModalOpen(true);
  };

  const handleComplete = async () => {
    if (!selectedOrderId) return;
    if (!platNumber || platNumber.trim() === "") {
      showNotification("error", "Plat kendaraan tidak boleh kosong!");
      return;
    }
    if (!truckyId || truckyId.trim() === "") {
      showNotification("error", "ID Truk Trucky tidak boleh kosong!");
      return;
    }
    
    setProcessingId(selectedOrderId);
    try {
      const res = await fetch(`/api/fleet/order/${selectedOrderId}/complete`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          platNumber: platNumber.trim(),
          truckyId: truckyId.trim()
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menyelesaikan order");
      }
      showNotification("success", "Order berhasil diselesaikan! Fleet telah ditambahkan ke User.");
      setCompleteModalOpen(false);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      showNotification("error", err.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (orders.length === 0) {
    return (
      <div className="bg-card/50 border border-border border-dashed rounded-3xl p-12 text-center flex flex-col items-center justify-center">
        <Truck size={40} className="text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">Tidak ada pesanan aktif saat ini.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {orders.map((order) => {
        const isMyClaim = order.managerId === managerDiscordId;
        const isClaimedByOther = order.status === "claimed" && !isMyClaim;

        return (
          <div key={order._id.toString()} className={`bg-card border ${isMyClaim ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border/50'} rounded-2xl p-6 shadow-sm`}>
            <div className="flex flex-col md:flex-row justify-between gap-6">
              
              <div className="flex gap-4 items-center">
                <div className="w-16 h-16 bg-background rounded-full overflow-hidden border border-border">
                  <img src={order.userId?.image || '/img/default_avatar.jpg'} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{order.userId?.name}</h3>
                  <p className="text-sm text-muted-foreground font-mono">{order.discordId}</p>
                </div>
              </div>

              <div className="flex-1 bg-background/50 border border-border/50 rounded-xl p-4 flex gap-4 items-center">
                {order.fleetStoreId?.photo_url && (
                  <img src={order.fleetStoreId.photo_url} alt={order.fleetStoreId.name} className="w-16 h-16 object-contain" />
                )}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pesanan</p>
                  <p className="font-bold">{order.fleetStoreId?.brand?.name} {order.fleetStoreId?.name}</p>
                  <p className="text-sm text-primary font-bold">{order.totalPrice.toLocaleString("id-ID")} NC</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 min-w-[200px]">
                <a 
                  href={`https://discord.com/channels/${guildId}/${order.discordChannelId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 bg-[#5865F2]/10 hover:bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/30 rounded-lg font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink size={14} /> Lihat Tiket
                </a>

                {order.status === "pending" && (
                  <button
                    onClick={() => handleClaim(order._id.toString())}
                    disabled={processingId === order._id.toString()}
                    className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-colors flex items-center justify-center gap-2"
                  >
                    {processingId === order._id.toString() ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ambil Order"}
                  </button>
                )}

                {isMyClaim && (
                  <button
                    onClick={() => openCompleteModal(order._id.toString())}
                    disabled={processingId === order._id.toString()}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold uppercase tracking-widest text-[10px] transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    {processingId === order._id.toString() ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle size={14} /> Selesaikan</>}
                  </button>
                )}

                {isClaimedByOther && (
                  <div className="w-full py-2 bg-muted text-muted-foreground rounded-lg font-bold uppercase tracking-widest text-[10px] flex items-center justify-center text-center">
                    Diambil oleh staff lain
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <Modal 
        isOpen={completeModalOpen} 
        onClose={() => !processingId && setCompleteModalOpen(false)}
        title="Selesaikan Pemesanan"
      >
        <div className="space-y-6">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-amber-500">
            <AlertTriangle className="shrink-0 mt-0.5" size={20} />
            <div className="text-sm">
              <p className="font-bold mb-1">Perhatian!</p>
              <p>Menyelesaikan tiket ini akan memotong NC pembeli, mengirim komisi ke akun Anda, memberikan armada, dan menghapus tiket Discord. Pastikan semuanya sudah beres.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Plat Kendaraan (Wajib)</label>
              <input 
                type="text" 
                value={platNumber}
                onChange={(e) => setPlatNumber(e.target.value)}
                placeholder="Contoh: NL-1000"
                className="w-full px-4 py-3 bg-background border border-border rounded-xl font-bold uppercase placeholder:normal-case placeholder:font-normal focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Trucky Vehicle ID (Wajib)</label>
              <input 
                type="text" 
                value={truckyId}
                onChange={(e) => setTruckyId(e.target.value)}
                placeholder="ID Truk dari sistem Trucky"
                className="w-full px-4 py-3 bg-background border border-border rounded-xl font-bold placeholder:font-normal focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button 
              onClick={() => setCompleteModalOpen(false)}
              disabled={!!processingId}
              className="px-6 py-2.5 rounded-xl border border-border hover:bg-muted text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-50"
            >
              Batal
            </button>
            <button 
              onClick={handleComplete}
              disabled={!!processingId || !platNumber.trim() || !truckyId.trim()}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5 disabled:hover:translate-y-0"
            >
              {processingId ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />} 
              Selesaikan Order
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
