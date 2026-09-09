"use client";

import React, { useState } from "react";
import {
  Crown,
  Sparkles,
  CheckCircle2,
  X,
  Clock,
  ArrowRight,
  MessageSquarePlus,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { createPurchaseTicket } from "./actions";
import { showAlert } from "@/lib/dialog";
import { useRouter } from "next/navigation";

const PLANS = [
  { months: 1, label: "1 Bulan", pricePerMonth: 30000, total: 30000, save: 0 },
  { months: 3, label: "3 Bulan", pricePerMonth: 28000, total: 84000, save: 6000 },
  { months: 6, label: "6 Bulan", pricePerMonth: 25000, total: 150000, save: 30000 },
  { months: 12, label: "1 Tahun", pricePerMonth: 23000, total: 276000, save: 84000 },
];

export default function NismaraPlusExtendModal({
  currentExpiredAt,
  guildId = "863959415702028318",
  initialPendingOrder = null,
}: {
  currentExpiredAt: string | null;
  guildId?: string;
  initialPendingOrder?: any;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState(12);
  const [isLoading, setIsLoading] = useState(false);
  const [ticketUrl, setTicketUrl] = useState<string | null>(
    initialPendingOrder?.channelId
      ? `https://discord.com/channels/${guildId}/${initialPendingOrder.channelId}`
      : null
  );

  const now = new Date();
  const baseDate = currentExpiredAt && new Date(currentExpiredAt) > now
    ? new Date(currentExpiredAt)
    : now;

  const projectedExpiredAt = new Date(
    baseDate.getTime() + selectedMonths * 30 * 24 * 60 * 60 * 1000
  );

  const selectedPlan = PLANS.find((p) => p.months === selectedMonths) || PLANS[0];

  const handleProcessExtend = async () => {
    setIsLoading(true);
    try {
      const res = await createPurchaseTicket(selectedMonths);
      if (res.success && res.url) {
        setTicketUrl(res.url);
        router.refresh();
      } else {
        await showAlert(res.message || "Gagal memproses perpanjangan.");
      }
    } catch (err: any) {
      await showAlert(`Gagal: ${err.message || "Terjadi kesalahan"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button in Sidebar */}
      {!ticketUrl ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-600 hover:to-orange-600 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 hover:scale-[1.02]"
        >
          <Sparkles size={15} className="fill-black" />
          <span>Perpanjang Langganan (Extend)</span>
        </button>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase">
            <Clock size={14} /> Pesanan Perpanjangan Aktif
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Channel Discord invoice Anda sudah siap. Silakan koordinasikan bukti transfer di channel terkait.
          </p>
          <a
            href={ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition shadow"
          >
            <MessageSquarePlus size={14} /> Lanjutkan di Discord
            <ExternalLink size={12} />
          </a>
        </div>
      )}

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-card border border-border rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Crown size={22} className="fill-amber-400" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
                    Perpanjang Nismara<span className="text-primary font-black">Plus</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tambahkan durasi langganan VIP Anda tanpa jeda atau kehilangan benefit.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-white/5 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Projected Duration Comparison Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-card to-purple-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Masa Aktif Saat Ini
                </span>
                <span className="text-xs font-bold text-foreground">
                  {currentExpiredAt
                    ? new Date(currentExpiredAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Belum Aktif"}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-amber-400 font-black text-xs">
                <ArrowRight size={16} />
                <span>+{selectedPlan.label}</span>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Masa Aktif Baru
                </span>
                <span className="text-xs font-black text-emerald-400">
                  {projectedExpiredAt.toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            {/* Plan Selection Cards */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Pilih Durasi Perpanjangan:
              </label>
              <div className="grid grid-cols-2 gap-3">
                {PLANS.map((plan) => {
                  const isSelected = selectedMonths === plan.months;
                  return (
                    <div
                      key={plan.months}
                      onClick={() => setSelectedMonths(plan.months)}
                      className={`relative cursor-pointer rounded-2xl p-4 border-2 transition-all ${
                        isSelected
                          ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/15 ring-1 ring-amber-500/40"
                          : "border-border/80 bg-black/20 hover:border-border hover:bg-black/40"
                      }`}
                    >
                      {isSelected && (
                        <CheckCircle2 className="absolute top-3.5 right-3.5 text-amber-400 h-4 w-4" />
                      )}
                      <p className="text-sm font-black text-foreground">{plan.label}</p>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-base font-black text-amber-400 tabular-nums">
                          Rp {(plan.pricePerMonth / 1000)}k
                        </span>
                        <span className="text-[10px] text-muted-foreground font-semibold">/ bln</span>
                      </div>
                      <div className="mt-2 h-4">
                        {plan.save > 0 ? (
                          <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            Hemat Rp {plan.save.toLocaleString("id-ID")}
                          </span>
                        ) : (
                          <span className="text-[9px] text-muted-foreground">Paket Standar</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bill & Summary */}
            <div className="p-4 rounded-2xl bg-black/30 border border-border/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Total Tagihan Pembayaran
                </span>
                <span className="text-xs text-muted-foreground">
                  Paket {selectedPlan.label} ({selectedPlan.months * 30} Hari)
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-foreground tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                  Rp {selectedPlan.total.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-5 py-3 rounded-xl border border-border text-foreground font-bold text-xs uppercase tracking-wider hover:bg-white/5 transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleProcessExtend}
                className="px-7 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-600 hover:to-orange-600 text-black font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50"
              >
                <Sparkles size={16} className="fill-black" />
                <span>{isLoading ? "Menghubungkan Server..." : "Ajukan Perpanjangan"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
