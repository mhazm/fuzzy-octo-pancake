"use client";

import { useState } from "react";
import { createPurchaseTicket } from "./actions";
import { showAlert } from "@/lib/dialog";
import {
  MessageSquarePlus,
  Sparkles,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

// Konfigurasi Paket
const PLANS = [
  { months: 1, pricePerMonth: 30000, total: 30000, save: 0 },
  { months: 3, pricePerMonth: 28000, total: 84000, save: 6000 },
  { months: 6, pricePerMonth: 25000, total: 150000, save: 30000 },
  { months: 12, pricePerMonth: 23000, total: 276000, save: 84000 },
];

export default function NismaraPlusClient() {
  const [isLoading, setIsLoading] = useState(false);
  const [ticketUrl, setTicketUrl] = useState<string | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<number>(1);

  const handleProcess = async () => {
    setIsLoading(true);
    // Mengirim pilihan bulan ke server actions
    const res = await createPurchaseTicket(selectedMonths);

    if (res.success && res.url) {
      setTicketUrl(res.url);
    } else {
      await showAlert(res.message || "Gagal memproses.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full mt-4">
      {!ticketUrl ? (
        <div className="space-y-6">
          {/* Opsi Paket List */}
          <div className="grid grid-cols-2 gap-3 text-left">
            {PLANS.map((plan) => (
              <div
                key={plan.months}
                onClick={() => setSelectedMonths(plan.months)}
                className={`relative cursor-pointer rounded-xl p-4 border-2 transition-all duration-200 ${
                  selectedMonths === plan.months
                    ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                    : "border-border bg-muted/30 hover:border-primary/50"
                }`}
              >
                {selectedMonths === plan.months && (
                  <CheckCircle2 className="absolute top-3 right-3 text-primary h-5 w-5" />
                )}

                <p className="text-sm font-bold text-foreground">
                  {plan.months === 12 ? "1 Tahun" : `${plan.months} Bulan`}
                </p>
                <div className="mt-2">
                  <span className="text-lg font-black text-foreground">
                    {plan.pricePerMonth / 1000}k
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {" "}
                    / bln
                  </span>
                </div>

                <div className="mt-2 h-4">
                  {plan.save > 0 ? (
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                      Hemat Rp {plan.save.toLocaleString("id-ID")}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-4 flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-medium">
              Total Tagihan:
            </span>
            <span className="font-black text-xl text-foreground">
              Rp{" "}
              {PLANS.find(
                (p) => p.months === selectedMonths,
              )?.total.toLocaleString("id-ID")}
            </span>
          </div>

          <button
            onClick={handleProcess}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black py-4 px-6 rounded-xl transition-all shadow-xl shadow-purple-500/10 flex items-center justify-center gap-3 disabled:opacity-50 group hover:scale-[1.01]"
          >
            <Sparkles className="h-5 w-5 animate-pulse text-yellow-300" />
            <span>
              {isLoading
                ? "Menghubungkan ke Server..."
                : "Ajukan Langganan Premium"}
            </span>
          </button>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500 mt-6">
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-center text-xs md:text-sm font-semibold leading-relaxed">
            🎉 Channel koordinasi privat Anda berhasil dibuat!
            <br />
            Total Tagihan dan instruksi pembayaran telah dikirimkan ke Discord.
          </div>
          <a
            href={ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-slate-100 text-slate-950 font-black py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg hover:bg-white"
          >
            <MessageSquarePlus className="h-5 w-5 text-purple-600" />
            <span>Buka Channel Pembayaran</span>
            <ExternalLink className="h-4 w-4 opacity-60" />
          </a>
        </div>
      )}
    </div>
  );
}
