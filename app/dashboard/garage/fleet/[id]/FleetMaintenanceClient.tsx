"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle, Wrench, Calendar, Receipt, Info, Ticket, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import VoucherPickerModal, { VoucherTriggerBar } from "@/components/voucher/VoucherPickerModal";

interface FleetMaintenanceClientProps {
  fleetId: string;
  needsEngine: boolean;
  needsTires: boolean;
  needsTransmission: boolean;
  needsBrakes: boolean;
  totalComponentCost: number;
  adminFee: number;
  serviceDuration: number;
  thresholds: any;
  odometer: number;
  orderType: string;
}

export default function FleetMaintenanceClient({
  fleetId,
  needsEngine,
  needsTires,
  needsTransmission,
  needsBrakes,
  totalComponentCost,
  adminFee,
  serviceDuration,
  thresholds,
  odometer,
  orderType,
}: FleetMaintenanceClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  const [isLoadingVouchers, setIsLoadingVouchers] = useState(false);
  const router = useRouter();

  // Fetch available maintenance vouchers when modal opens
  useEffect(() => {
    if (isModalOpen) {
      setIsLoadingVouchers(true);
      fetch("/api/vouchers/my?category=FLEET_MAINTENANCE&status=ACTIVE", {
        cache: "no-store",
        headers: { "Pragma": "no-cache", "Cache-Control": "no-cache" },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.vouchers)) {
            setVouchers(data.vouchers);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingVouchers(false));
    } else {
      setSelectedVoucherId(null);
      setError(null);
    }
  }, [isModalOpen]);

  const selectedVoucher = vouchers.find((v) => v._id === selectedVoucherId);

  // Calculate discount (applies strictly to totalComponentCost, Admin Fee remains intact)
  let voucherDiscount = 0;
  if (selectedVoucher) {
    if (selectedVoucher.discountType === "percentage") {
      voucherDiscount = Math.round(totalComponentCost * (selectedVoucher.discountValue / 100));
      if (selectedVoucher.maxDiscount > 0) {
        voucherDiscount = Math.min(voucherDiscount, selectedVoucher.maxDiscount);
      }
    } else if (selectedVoucher.discountType === "fixed") {
      voucherDiscount = Math.min(totalComponentCost, selectedVoucher.discountValue);
    }
    voucherDiscount = Math.max(0, Math.min(totalComponentCost, voucherDiscount));
  }

  const finalComponentCost = Math.max(0, totalComponentCost - voucherDiscount);
  const totalPrice = finalComponentCost + adminFee;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/fleet/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fleetId,
          type: orderType,
          voucherId: selectedVoucherId || undefined,
          needsEngine,
          needsTires,
          needsTransmission,
          needsBrakes,
          totalComponentCost,
          adminFee,
          serviceDuration,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Terjadi kesalahan saat memproses permintaan.",
        );
      }

      setIsModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`${orderType === "replace" ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/90"} text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold uppercase tracking-widest transition-all shadow-lg hover:shadow-red-500/25 hover:-translate-y-0.5`}
      >
        <Wrench size={18} />{" "}
        {orderType === "replace"
          ? "Request Penggantian"
          : "Request Maintenance"}
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-border/50 bg-muted/30 shrink-0">
              <h2 className="text-xl font-black uppercase italic tracking-wider flex items-center gap-2">
                <AlertCircle
                  className={
                    orderType === "replace" ? "text-red-500" : "text-amber-500"
                  }
                />
                {orderType === "replace"
                  ? "Konfirmasi Penggantian"
                  : "Konfirmasi Servis"}
              </h2>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Wrench size={14} /> Komponen yang Perlu Diservis
                </h3>
                <ul className="space-y-2 bg-background/50 border border-border/50 p-4 rounded-xl">
                  {needsEngine && (
                    <li className="flex justify-between text-sm font-medium">
                      <span>Mesin</span>
                      <span className="text-red-400">Rusak</span>
                    </li>
                  )}
                  {needsTires && (
                    <li className="flex justify-between text-sm font-medium">
                      <span>Ban</span>
                      <span className="text-red-400">Rusak</span>
                    </li>
                  )}
                  {needsTransmission && (
                    <li className="flex justify-between text-sm font-medium">
                      <span>Transmisi</span>
                      <span className="text-red-400">Rusak</span>
                    </li>
                  )}
                  {needsBrakes && (
                    <li className="flex justify-between text-sm font-medium">
                      <span>Rem</span>
                      <span className="text-red-400">Rusak</span>
                    </li>
                  )}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Calendar size={14} /> Estimasi Waktu
                </h3>
                <div className="bg-background/50 border border-border/50 p-4 rounded-xl flex items-center justify-between">
                  <span className="text-sm font-medium">Durasi Servis</span>
                  <span className="font-black text-amber-500">
                    {serviceDuration} Hari
                  </span>
                </div>
              </div>

              {/* Voucher Selector Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Ticket size={14} className="text-emerald-400" /> Kupon / Voucher Servis
                  </span>
                  {vouchers.length > 0 && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                      {vouchers.length} Tersedia
                    </span>
                  )}
                </h3>

                <VoucherTriggerBar
                  vouchers={vouchers}
                  selectedVoucher={selectedVoucher}
                  isLoading={isLoadingVouchers}
                  onOpenModal={() => setIsVoucherModalOpen(true)}
                  onRemoveVoucher={() => setSelectedVoucherId(null)}
                  accentColor="emerald"
                />
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Receipt size={14} /> Rincian Biaya
                </h3>
                <div className="bg-background/50 border border-border/50 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Biaya Komponen
                    </span>
                    <span className="font-medium">
                      {totalComponentCost.toLocaleString("id-ID")} NC
                    </span>
                  </div>

                  {voucherDiscount > 0 && selectedVoucher && (
                    <div className="flex justify-between text-sm text-emerald-400 font-medium">
                      <span className="flex items-center gap-1">
                        <Ticket size={13} /> Diskon Voucher ({selectedVoucher.discountType === "percentage" ? `${selectedVoucher.discountValue}%` : "Fixed"})
                      </span>
                      <span>
                        -{voucherDiscount.toLocaleString("id-ID")} NC
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Biaya Admin (Manager)</span>
                    <span className="font-medium">
                      {adminFee.toLocaleString("id-ID")} NC
                    </span>
                  </div>
                  <div className="pt-2 border-t border-border/50 flex justify-between">
                    <span className="font-bold uppercase">
                      Total Pembayaran
                    </span>
                    <span className="font-black text-emerald-500 text-lg">
                      {totalPrice.toLocaleString("id-ID")} NC
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-accent-sky/10 border border-accent-sky/20 p-3 rounded-xl flex gap-3 text-accent-sky items-start">
                <Info size={16} className="shrink-0 mt-0.5" />
                <p className="text-xs font-medium leading-relaxed">
                  Permintaan Anda akan dikirim ke Manajer Logistik untuk
                  dikonfirmasi. Saldo NC akan dipotong setelah permintaan
                  disetujui, dan kendaraan akan dimasukkan ke garasi.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-border/50 bg-muted/30 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-sm text-muted-foreground hover:bg-background transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-sm transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Memproses...
                  </>
                ) : (
                  "Kirim Permintaan"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Voucher Picker Modal */}
      <VoucherPickerModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        vouchers={vouchers}
        selectedVoucherId={selectedVoucherId}
        onSelectVoucher={(id) => setSelectedVoucherId(id)}
        title="Pilih Kupon Servis"
        categoryLabel="Servis & Perawatan"
      />
    </>
  );
}
