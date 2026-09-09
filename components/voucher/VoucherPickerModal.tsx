"use client";

import React, { useState, useMemo } from "react";
import {
  Ticket,
  CheckCircle2,
  Circle,
  X,
  Search,
  Clock,
  Percent,
  ChevronRight,
  Info,
} from "lucide-react";

export interface VoucherItem {
  _id: string;
  code: string;
  title: string;
  category: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxDiscount?: number;
  minSpend?: number;
  expiresAt?: string | Date | null;
}

interface VoucherPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  vouchers: VoucherItem[];
  selectedVoucherId: string | null;
  onSelectVoucher: (voucherId: string | null) => void;
  title?: string;
  categoryLabel?: string;
}

export default function VoucherPickerModal({
  isOpen,
  onClose,
  vouchers,
  selectedVoucherId,
  onSelectVoucher,
  title = "Pilih Kupon / Voucher",
  categoryLabel = "Servis & Perawatan",
}: VoucherPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  // Temporary selection inside modal so user can choose then click "Gunakan"
  const [tempSelectedId, setTempSelectedId] = useState<string | null>(
    selectedVoucherId
  );

  // Sync temp selection when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setTempSelectedId(selectedVoucherId);
      setSearchQuery("");
    }
  }, [isOpen, selectedVoucherId]);

  const filteredVouchers = useMemo(() => {
    if (!searchQuery.trim()) return vouchers;
    const q = searchQuery.toLowerCase();
    return vouchers.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.code.toLowerCase().includes(q) ||
        (v.discountType === "percentage" && `${v.discountValue}%`.includes(q))
    );
  }, [vouchers, searchQuery]);

  if (!isOpen) return null;

  const handleApply = () => {
    onSelectVoucher(tempSelectedId);
    onClose();
  };

  const selectedVoucherObj = vouchers.find((v) => v._id === tempSelectedId);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Ticket className="w-5 h-5 text-emerald-500" />
              {title}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tersedia {vouchers.length} kupon untuk kategori {categoryLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Filter (jika voucher lebih dari 3) */}
        {vouchers.length > 3 && (
          <div className="p-3 border-b border-border/70 bg-background/50">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kupon berdasarkan nama atau kode..."
                className="w-full bg-muted/50 border border-border text-foreground text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-primary placeholder:text-muted-foreground"
              />
            </div>
          </div>
        )}

        {/* List Vouchers (Scrollable) */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2.5 max-h-[50vh]">
          {/* Option: Tanpa Kupon */}
          <div
            onClick={() => setTempSelectedId(null)}
            className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
              tempSelectedId === null
                ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary/30"
                : "bg-card border-border text-muted-foreground hover:border-border hover:bg-muted/30"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  tempSelectedId === null
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/50"
                }`}
              >
                {tempSelectedId === null && <CheckCircle2 className="w-4 h-4" />}
              </div>
              <span className="font-semibold text-foreground">
                Tanpa Kupon (Bayar Normal)
              </span>
            </div>
          </div>

          {/* List of Vouchers */}
          {filteredVouchers.map((v) => {
            const isSelected = tempSelectedId === v._id;
            const isPercentage = v.discountType === "percentage";
            const discLabel = isPercentage
              ? v.discountValue === 100
                ? "Free 100%"
                : `Diskon ${v.discountValue}%`
              : `Potongan ${v.discountValue.toLocaleString("id-ID")} NC`;

            const formatExpires = v.expiresAt
              ? new Date(v.expiresAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : null;

            return (
              <div
                key={v._id}
                onClick={() => setTempSelectedId(v._id)}
                className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between group ${
                  isSelected
                    ? "bg-emerald-500/10 border-emerald-500/60 ring-1 ring-emerald-500/40 text-foreground"
                    : "bg-card border-border hover:border-emerald-500/40 hover:bg-muted/30 text-foreground"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  {/* Radio Indicator */}
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-muted-foreground/50 group-hover:border-emerald-500/60"
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="w-4 h-4" />}
                  </div>

                  {/* Details */}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground truncate">
                        {v.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] shrink-0">
                        {discLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                      <span>Kode: {v.code}</span>
                      {formatExpires && (
                        <span className="flex items-center gap-1 font-sans text-[10px]">
                          <Clock className="w-3 h-3 text-muted-foreground/70" />
                          Hingga {formatExpires}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredVouchers.length === 0 && (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Tidak ada kupon yang cocok dengan pencarian &quot;{searchQuery}&quot;
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground truncate">
            {selectedVoucherObj ? (
              <span>
                Dipilih:{" "}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {selectedVoucherObj.title}
                </strong>
              </span>
            ) : (
              <span>Tanpa kupon</span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-md"
            >
              Gunakan Kupon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Trigger Bar Component yang dipasang di dalam ringkasan checkout / servis
 */
interface VoucherTriggerBarProps {
  vouchers: VoucherItem[];
  selectedVoucher: VoucherItem | null | undefined;
  isLoading?: boolean;
  onOpenModal: () => void;
  onRemoveVoucher: () => void;
  accentColor?: "emerald" | "teal";
}

export function VoucherTriggerBar({
  vouchers,
  selectedVoucher,
  isLoading = false,
  onOpenModal,
  onRemoveVoucher,
  accentColor = "emerald",
}: VoucherTriggerBarProps) {
  if (isLoading) {
    return (
      <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground animate-pulse flex items-center gap-2">
        <Ticket className="w-4 h-4 text-muted-foreground/60" />
        <span>Memeriksa kupon yang tersedia...</span>
      </div>
    );
  }

  if (vouchers.length === 0) {
    return (
      <div className="p-3.5 rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ticket className="w-4 h-4 text-muted-foreground/60" />
          <span>Tidak ada kupon diskon aktif di akun Anda.</span>
        </div>
      </div>
    );
  }

  // Jika voucher sedang terpasang
  if (selectedVoucher) {
    const isPercentage = selectedVoucher.discountType === "percentage";
    const discLabel = isPercentage
      ? selectedVoucher.discountValue === 100
        ? "Free 100%"
        : `Diskon ${selectedVoucher.discountValue}%`
      : `Potongan ${selectedVoucher.discountValue.toLocaleString("id-ID")} NC`;

    return (
      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-between gap-3 text-xs">
        <div
          onClick={onOpenModal}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer group flex-1"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Ticket className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                {selectedVoucher.title}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] shrink-0">
                {discLabel}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              Kode: {selectedVoucher.code}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenModal}
            className="px-2.5 py-1.5 rounded-lg bg-card hover:bg-muted border border-border text-[11px] font-semibold text-foreground transition-colors"
          >
            Ganti
          </button>
          <button
            type="button"
            onClick={onRemoveVoucher}
            title="Hapus kupon"
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Jika belum ada voucher yang dipilih
  return (
    <div
      onClick={onOpenModal}
      className="p-3.5 rounded-xl bg-card hover:bg-muted/40 border border-dashed border-border hover:border-primary/50 cursor-pointer transition-all flex items-center justify-between text-xs group"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 flex items-center justify-center transition-colors">
          <Ticket className="w-4 h-4" />
        </div>
        <div>
          <div className="font-bold text-foreground group-hover:text-primary transition-colors">
            Gunakan Kupon / Voucher Diskon
          </div>
          <div className="text-[11px] text-muted-foreground">
            Ada <span className="font-bold text-emerald-600 dark:text-emerald-400">{vouchers.length} kupon</span> tersedia untuk Anda
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs font-semibold text-primary">
        <span>Pilih</span>
        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </div>
  );
}
