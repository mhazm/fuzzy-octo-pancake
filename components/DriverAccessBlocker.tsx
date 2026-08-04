import { ShieldAlert, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import clientPromise from "@/lib/mongodb";
import { Session } from "next-auth";

export default async function DriverAccessBlocker({ session }: { session: Session }) {
  if (!session?.user?.discordId) return null;

  const client = await clientPromise;
  const db = client.db();
  
  // Periksa apakah user memiliki pendaftaran yang sedang pending
  const registration = await db.collection("registrations").findOne({ 
    userId: session.user.discordId,
    status: "pending"
  });

  const isPending = !!registration;
  
  // Jika pending, buat link langsung ke channel tiket Discord mereka
  const discordChannelLink = registration?.discordChannelId 
    ? `https://discord.com/channels/${process.env.DISCORD_GUILD_ID || "123456789"}/${registration.discordChannelId}`
    : "#";

  return (
    <main className="min-h-[80vh] w-full flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-700">
        <div className="relative inline-block">
          <div className={`absolute inset-0 blur-3xl rounded-full ${isPending ? 'bg-amber-500/20' : 'bg-red-500/20'}`} />
          <div className={`relative w-24 h-24 bg-card border rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl ${isPending ? 'border-amber-500/30 text-amber-500' : 'border-red-500/30 text-red-500'}`}>
            {isPending ? <CheckCircle2 size={48} /> : <ShieldAlert size={48} />}
          </div>
        </div>
        
        <div className="space-y-3">
          <h2 className="text-4xl font-black text-foreground uppercase tracking-tighter">
            {isPending ? (
              <>Pendaftaran <span className="text-amber-500">Diproses</span></>
            ) : (
              <>Akses <span className="text-red-500">Ditolak</span></>
            )}
          </h2>
          <p className="text-foreground/50 font-medium leading-relaxed">
            {isPending 
              ? "Kamu sedang dalam proses pendaftaran VTC. Silakan cek channel tiket discord kamu untuk berkomunikasi dengan Staff HR kami."
              : "Kamu belum terdaftar sebagai pengemudi resmi Nismara Logistics. Fitur dashboard ini hanya tersedia untuk anggota aktif."}
          </p>
        </div>

        <div className="flex flex-col gap-4 items-center">
          {isPending ? (
            <a
              href={discordChannelLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-10 py-4 bg-[#5865F2] text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-[#5865F2]/80 transition-all shadow-lg shadow-[#5865F2]/20"
            >
              Lanjutkan di Discord <ArrowRight size={14} />
            </a>
          ) : (
            <Link
              href="/register"
              className="inline-flex items-center gap-3 px-10 py-4 bg-primary text-foreground text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-primary/80 transition-all shadow-lg shadow-primary/20"
            >
              Daftar Sekarang <ArrowRight size={14} />
            </Link>
          )}
          <Link
            href="/"
            className="text-[10px] font-bold text-foreground/20 uppercase tracking-widest hover:text-foreground/50 transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </main>
  );
}
