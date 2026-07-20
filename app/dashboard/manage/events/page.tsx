// app/dashboard/manage-events/page.tsx
import Link from "next/link";
import {
  Calendar,
  FileText,
  Zap,
  ArrowRight,
  CalendarDays,
} from "lucide-react";

export default function ManageEventsHub() {
  const menu = [
    {
      name: "Convoy Lobbies",
      desc: "Jadwalkan dan kelola sesi mabar convoy bersama pengemudi.",
      icon: Calendar,
      href: "/dashboard/manage/events/convoy",
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/20",
      hoverBorder: "group-hover:border-primary/50",
      glow: "group-hover:bg-primary/20",
    },
    {
      name: "Special Contract",
      desc: "Buat dan pantau misi pengiriman khusus dengan hadiah eksklusif.",
      icon: FileText,
      href: "/dashboard/manage/events/contracts",
      color: "text-accent-sky",
      bg: "bg-accent-sky/10",
      border: "border-accent-sky/20",
      hoverBorder: "group-hover:border-accent-sky/50",
      glow: "group-hover:bg-accent-sky/20",
    },
    {
      name: "NC Boost Events",
      desc: "Aktifkan multiplier bonus Nismara Coin pada periode tertentu.",
      icon: Zap,
      href: "/dashboard/manage/events/ncboost",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      hoverBorder: "group-hover:border-amber-500/50",
      glow: "group-hover:bg-amber-500/20",
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-10">
      {/* Header Section */}
      <div className="flex flex-col gap-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-sky/10 border border-accent-sky/20 text-accent-sky text-xs font-bold uppercase tracking-widest w-fit">
          <CalendarDays className="w-4 h-4" /> Management Portal
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
          Manage Events <span className="text-gradient">Hub</span>
        </h1>
        <p className="text-foreground/60 font-medium max-w-xl">
          Pusat kendali administrator untuk mengatur seluruh aktivitas bersama,
          kontrak spesial, dan program bonus Nismara.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
