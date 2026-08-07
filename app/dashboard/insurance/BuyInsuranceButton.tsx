"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { buyInsurance } from "./actions";
import { ShieldAlert, X } from "lucide-react";
import { showAlert } from "@/lib/dialog";


type BuyInsuranceButtonProps = {
  price: number;
  isExtend?: boolean;
};

export default function BuyInsuranceButton({ price, isExtend = false }: BuyInsuranceButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleBuy = async () => {
    setIsLoading(true);
    const res = await buyInsurance();

    if (!res.success) {
      await showAlert(res.message);
    } else {
      setIsModalOpen(false);
    }
    setIsLoading(false);
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={
          isExtend
            ? "w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold py-3 px-4 rounded-xl transition-all shadow-sm text-sm hover:scale-[1.02]"
            : "w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-primary/20 hover:scale-[1.02]"
        }
      >
        {isExtend ? "Perpanjang Asuransi" : "Beli Asuransi"}
      </button>

      {mounted && isModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => !isLoading && setIsModalOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative bg-card border border-border rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => !isLoading && setIsModalOpen(false)}
              className="absolute top-4 right-4 text-foreground/50 hover:text-foreground bg-muted hover:bg-muted/80 rounded-full p-2 transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center space-y-4 mt-2">
              <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-2">
                <ShieldAlert className="w-8 h-8" />
              </div>

              <h3 className="text-2xl font-black text-foreground">
                {isExtend ? "Konfirmasi Perpanjangan" : "Konfirmasi Pembelian"}
              </h3>
              <p className="text-foreground/70 font-medium leading-relaxed">
                Anda akan {isExtend ? "memperpanjang" : "mengaktifkan"} Nismara Protection selama 30 hari ke
                depan. Saldo Nismara Coin Anda akan dipotong sebesar:
              </p>
              <div className="w-full bg-background border border-border rounded-xl py-3 text-center mb-2">
                <span className="text-3xl font-black text-primary drop-shadow-sm">{price.toLocaleString("id-ID")}</span>
                <span className="text-sm text-foreground/50 font-bold ml-1">NC</span>
              </div>

              <div className="w-full bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-left mt-2">
                <p className="text-xs md:text-sm text-red-500 font-bold flex gap-3">
                  <span className="text-lg">⚠️</span>
                  <span>
                    PERHATIAN: Pembelian bersifat final dan{" "}
                    <strong>tidak dapat di-refund</strong> (dikembalikan) dengan
                    alasan apapun.
                  </span>
                </p>
              </div>

              <div className="flex gap-3 w-full mt-6">
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={isLoading}
                  className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-bold py-4 px-4 rounded-xl transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleBuy}
                  disabled={isLoading}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 px-4 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isLoading ? "Memproses..." : "Ya, Saya Setuju"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
