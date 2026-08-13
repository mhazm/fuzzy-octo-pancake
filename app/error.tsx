"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Bisa tambahkan logic logging ke Sentry/log tracker di sini jika ada
    console.error("Global Error Caught:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Decorative */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-64 bg-red-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 text-center px-4">
        <div className="inline-flex items-center justify-center p-4 bg-red-500/10 rounded-3xl text-red-500 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)] mb-8">
          <AlertTriangle className="w-16 h-16" />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black text-foreground uppercase tracking-tighter mb-4">
          Kerusakan <span className="text-red-500">Mesin!</span>
        </h1>
        
        <h2 className="text-xl md:text-2xl font-bold text-foreground/80 mb-4">
          Terjadi kesalahan sistem yang tidak terduga.
        </h2>
        
        <p className="text-muted-foreground text-base max-w-lg mx-auto mb-10 leading-relaxed p-4 bg-card/50 border border-border/50 rounded-xl text-left font-mono text-sm overflow-hidden text-ellipsis">
          {error.message || "Unknown internal server error"}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
          >
            <RefreshCcw className="w-5 h-5" />
            Coba Nyalakan Ulang
          </button>
          
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 text-foreground border border-white/10 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
          >
            <Home className="w-5 h-5" />
            Kembali ke Garasi
          </Link>
        </div>
      </div>
    </main>
  );
}
