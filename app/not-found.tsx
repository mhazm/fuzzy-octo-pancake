import Link from "next/link";
import { AlertOctagon, Home, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Decorative */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-64 bg-primary/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 text-center px-4">
        <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-3xl text-primary border border-primary/20 shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)] mb-8 animate-pulse">
          <AlertOctagon className="w-16 h-16" />
        </div>
        
        <h1 className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-sky uppercase tracking-tighter mb-4">
          404
        </h1>
        
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
          Jalur Tidak Ditemukan
        </h2>
        
        <p className="text-muted-foreground text-lg max-w-lg mx-auto mb-10 leading-relaxed">
          Sepertinya Anda tersesat dari rute konvoi. Halaman yang Anda cari mungkin telah dihapus, dipindahkan, atau tidak pernah ada.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
          >
            <Home className="w-5 h-5" />
            Kembali ke Garasi
          </Link>
          
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 text-foreground border border-white/10 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
          >
            <Compass className="w-5 h-5" />
            Buka Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
