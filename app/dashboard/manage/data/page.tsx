// app/dashboard/user-data/page.tsx
import Link from "next/link";
import { Users, UserPlus, Coins, Target } from "lucide-react";

export default function UserDataHub() {
  const menu = [
    {
      name: "User List",
      desc: "Kelola data pengemudi",
      icon: Users,
      href: "/dashboard/manage/data/users",
    },
    {
      name: "Registrasi",
      desc: "Setujui pendaftaran baru",
      icon: UserPlus,
      href: "/dashboard/manage/data/register-user",
    },
    {
      name: "Manage NC",
      desc: "Atur saldo coin",
      icon: Coins,
      href: "/dashboard/manage/data/nc-data",
    },
    {
      name: "Manage Poin",
      desc: "Atur poin penalty",
      icon: Target,
      href: "/dashboard/manage/data/point-data",
    },
  ];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-black mb-8 text-foreground">
        User Data Hub
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {menu.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="glass-panel p-6 rounded-2xl hover:border-primary transition-all group"
          >
            <item.icon className="w-8 h-8 text-primary mb-4" />
            <h3 className="font-bold text-lg mb-1">{item.name}</h3>
            <p className="text-xs text-foreground/50">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
