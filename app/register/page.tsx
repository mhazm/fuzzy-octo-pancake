import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import RegisterFormClient from "./RegisterFormClient";
import { FileCheck, ShieldAlert, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Register",
};



export default async function RegisterPage() {
  const session = await getServerSession(authOptions);

  // 1. Proteksi Login
  if (!session) {
    redirect("/login");
  }

  // 2. Cek apakah sudah ada pendaftaran aktif di MongoDB
  const client = await clientPromise;
  const db = client.db();

  const existingRegistration = await db.collection("registrations").findOne({
    userId: session.user.discordId,
    status: { $in: ["pending", "approved"] },
  });

  // 3. Jika sudah punya form aktif, tampilkan pesan blokir
  if (existingRegistration) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center p-6 bg-(-background)">
        <div className="max-w-xl w-full text-center space-y-8 animate-in fade-in zoom-in duration-700">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
            <div className="relative w-24 h-24 bg-card border border-primary/30 text-primary rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl">
              <ShieldAlert size={48} />
            </div>
          </div>
          <div className="space-y-3">
            <h2 className="text-4xl font-black text-(-primary-foreground) italic uppercase tracking-tighter">
              Registration <span className="text-primary">Locked</span>
            </h2>
            <p className="text-foreground/50 font-medium leading-relaxed italic px-6">
              Sistem mendeteksi bahwa akun Anda sudah memiliki formulir
              pendaftaran yang sedang diproses atau sudah disetujui. Anda tidak
              dapat mengisi formulir ganda.
            </p>
          </div>
          <div className="flex flex-col gap-3 items-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-3 px-10 py-4 bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-primary/80 transition-all shadow-lg shadow-primary/20"
            >
              Buka Dashboard <ArrowRight size={14} />
            </Link>
            <p className="text-[9px] font-bold text-foreground/20 uppercase tracking-widest">
              Status: {existingRegistration.status.toUpperCase()}
            </p>
          </div>
        </div>
      </main>
    );
  }

  // 4. Jika belum ada, tampilkan Form Client
  return <RegisterFormClient session={session} />;
}
