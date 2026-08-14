import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  Users,
  UserPlus,
  User2,
  Coins,
  Target,
  ArrowRight,
  ShieldCheck,
  Store,
  Trophy,
  FileQuestion,
} from "lucide-react";

export const metadata = {
  title: "Manage Data",
};

export default async function UserDataHub() {
  const session = await getServerSession(authOptions);
  const isOwner =
    session?.user?.discordId === process.env.OWNER_DISCORD_ID ||
    session?.user?.discordId === process.env.NISMARA_OWNER_DISCORD_ID;
  const menu = [
    {
      name: "User List",
      desc: "Kelola data dan status pengemudi aktif.",
      icon: Users,
      href: "/dashboard/manage/data/users",
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/20",
      hoverBorder: "group-hover:border-primary/50",
      glow: "group-hover:bg-primary/20",
    },
    {
      name: "Manage Intern",
      desc: "Tinjau semua sopir intern.",
      icon: User2,
      href: "/dashboard/manage/data/intern",
      color: "text-accent-indigo",
      bg: "bg-accent-indigo/10",
      border: "border-accent-indigo/20",
      hoverBorder: "group-hover:border-accent-indigo/50",
      glow: "group-hover:bg-accent-indigo/20",
    },
    {
      name: "Manage NC",
      desc: "Atur saldo Nismara Coin (NC) pengemudi.",
      icon: Coins,
      href: "/dashboard/manage/data/nc-data",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      hoverBorder: "group-hover:border-amber-500/50",
      glow: "group-hover:bg-amber-500/20",
    },
    {
      name: "Manage Poin",
      desc: "Kontrol poin penalti dan kedisiplinan.",
      icon: Target,
      href: "/dashboard/manage/data/point-data",
      color: "text-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      hoverBorder: "group-hover:border-red-500/50",
      glow: "group-hover:bg-red-500/20",
    },
    {
      name: "Manage Market",
      desc: "Kelola market dan status perilisan mod.",
      icon: Store,
      href: "/dashboard/manage/data/market",
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
      hoverBorder: "group-hover:border-green-500/50",
      glow: "group-hover:bg-green-500/20",
    },
    {
      name: "Manage Achievement",
      desc: "Kelola badge dan pencapaian driver.",
      icon: Trophy,
      href: "/dashboard/manage/data/achievement",
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20",
      hoverBorder: "group-hover:border-yellow-500/50",
      glow: "group-hover:bg-yellow-500/20",
    },
    {
      name: "Quiz & Ujian",
      desc: "Kelola bank soal ujian kelayakan untuk intern.",
      icon: FileQuestion,
      href: "/dashboard/manage/data/quiz",
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20",
      hoverBorder: "group-hover:border-indigo-500/50",
      glow: "group-hover:bg-indigo-500/20",
    },
  ];

  if (isOwner) {
    menu.push({
      name: "Manage Nismara+",
      desc: "Kelola data Nismara+ dan status keanggotaan.",
      icon: Target,
      href: "/dashboard/manage/data/nismaraplus",
      color: "text-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      hoverBorder: "group-hover:border-red-500/50",
      glow: "group-hover:bg-red-500/20",
    });
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-10">
      {/* Header Section */}
      <div className="flex flex-col gap-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest w-fit">
          <ShieldCheck className="w-4 h-4" /> Management Portal
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
          Manage Data <span className="text-gradient">Hub</span>
        </h1>
        <p className="text-foreground/60 font-medium max-w-xl">
          Pusat kendali administrator untuk mengelola seluruh data anggota,
          pendaftaran, finansial, dan lain-lain.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {menu.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`group relative glass-panel p-6 rounded-3xl overflow-hidden border-border/50 ${item.hoverBorder} transition-all duration-500 hover:-translate-y-1 shadow-lg`}
          >
            {/* Background Glow Effect */}
            <div
              className={`absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 ${item.glow}`}
            />

            {/* Icon & Arrow Header */}
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div
                className={`p-3.5 rounded-2xl ${item.bg} border ${item.border} ${item.color} shadow-inner`}
              >
                <item.icon className="w-6 h-6" />
              </div>

              {/* Arrow Indicator (Muncul saat hover) */}
              <div className="w-8 h-8 rounded-full bg-card/50 border border-border/50 flex items-center justify-center opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                <ArrowRight className={`w-4 h-4 ${item.color}`} />
              </div>
            </div>

            {/* Text Content */}
            <div className="relative z-10">
              <h3
                className={`font-bold text-xl mb-2 text-foreground transition-colors ${item.color.replace("text-", "group-hover:text-")}`}
              >
                {item.name}
              </h3>
              <p className="text-sm text-foreground/60 leading-relaxed font-medium min-h-[2.5rem]">
                {item.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
