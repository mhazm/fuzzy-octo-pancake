import { Loader2 } from "lucide-react";
// PENTING: Sesuaikan @/components/SocialMedia dengan folder tempat kamu menyimpan SocialMedia.tsx
import { NismaraIcon } from "@/components/icons/SocialMedia";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background min-h-screen overflow-hidden">
      {/* Latar Belakang Gradien Halus */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20">
        <div className="w-[300px] h-[300px] bg-primary rounded-full blur-[120px] animate-pulse"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Ikon Nismara dengan efek Glass dan Pulse */}
        <div className="relative p-6 glass-panel rounded-3xl border-primary/20 shadow-2xl shadow-primary/10">
          <NismaraIcon className="w-20 h-20 text-primary animate-pulse" />
        </div>

        {/* Teks Loading & Spinner */}
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-foreground font-black uppercase tracking-[0.2em] text-sm bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent-sky">
            Nismara Transport
          </h2>

          <div className="flex items-center gap-2 text-foreground/50 text-xs font-medium uppercase tracking-widest">
            <Loader2 className="w-4 h-4 animate-spin text-accent-sky" />
            <span>Memuat Data...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
