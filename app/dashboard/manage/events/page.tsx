// app/dashboard/manage-events/page.tsx
import Link from "next/link";
import { Calendar, FileText, Zap } from "lucide-react";

export default function ManageEventsHub() {
  const menu = [
    {
      name: "Convoy",
      desc: "Atur event convoy",
      icon: Calendar,
      href: "/dashboard/manage/events/convoy",
    },
    {
      name: "Special Contract",
      desc: "Manage kontrak khusus",
      icon: FileText,
      href: "/dashboard/manage/events/contracts",
    },
    {
      name: "NC Boost",
      desc: "Kelola boost NC",
      icon: Zap,
      href: "/dashboard/manage/events/ncboost",
    },
  ];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-black mb-8 text-foreground">
        Manage Events Hub
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {menu.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="glass-panel p-6 rounded-2xl hover:border-accent-sky transition-all"
          >
            <item.icon className="w-8 h-8 text-accent-sky mb-4" />
            <h3 className="font-bold text-lg mb-1">{item.name}</h3>
            <p className="text-xs text-foreground/50">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
