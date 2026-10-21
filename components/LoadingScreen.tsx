import { Loader2, Ghost } from "lucide-react";
import { NismaraIcon } from "@/components/icons/SocialMedia";
import { HALLOWEEN_THEME_ACTIVE } from "@/lib/constants/seasonTheme";

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
}

export default function LoadingScreen({
  title = "Nismara Transport",
  subtitle = "Memuat Data...",
}: LoadingScreenProps) {
  if (HALLOWEEN_THEME_ACTIVE) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background min-h-screen overflow-hidden">
        {/* Latar Belakang Mistis Ungu & Oranye Labu */}
        <div className="absolute inset-0 flex items-center justify-center opacity-30">
          <div className="w-[320px] h-[320px] bg-orange-600 rounded-full blur-[140px] animate-pulse"></div>
          <div className="w-[260px] h-[260px] bg-purple-600 rounded-full blur-[120px] animate-pulse delay-500"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center gap-8">
          {/* Ikon Nismara dengan efek Pumpkin Glow */}
          <div className="relative p-6 glass-panel rounded-3xl border-orange-500/30 shadow-2xl shadow-orange-500/20 bg-zinc-950/60 backdrop-blur-xl">
            <NismaraIcon className="w-20 h-20 text-orange-400 animate-pulse" />
            <div className="absolute -top-2 -right-2 bg-orange-500/20 border border-orange-500/40 rounded-full p-1.5 shadow-lg shadow-orange-500/20">
              <Ghost className="w-4 h-4 text-orange-300 animate-bounce" />
            </div>
          </div>

          {/* Teks Loading & Spinner Halloween */}
          <div className="flex flex-col items-center gap-3">
            <h2 className="text-foreground font-black uppercase tracking-[0.2em] text-sm bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-amber-300 to-purple-400">
              🎃 {title === "Nismara Transport" ? "Nismara Halloween Event" : title} 🎃
            </h2>

            <div className="flex items-center gap-2 text-orange-300/70 text-xs font-medium uppercase tracking-widest">
              <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
              <span>{subtitle === "Memuat Data..." ? "Memanggil Roh Nismara..." : subtitle}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Teks Loading & Spinner Standar */}
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-foreground font-black uppercase tracking-[0.2em] text-sm bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent-sky">
            {title}
          </h2>

          <div className="flex items-center gap-2 text-foreground/50 text-xs font-medium uppercase tracking-widest">
            <Loader2 className="w-4 h-4 animate-spin text-accent-sky" />
            <span>{subtitle}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
