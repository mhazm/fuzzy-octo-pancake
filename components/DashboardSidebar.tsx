"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Truck,
  Briefcase,
  Coins,
  Users,
  FileText,
  ShieldCheck,
  Settings,
  TriangleAlert,
  Sparkles,
  Landmark,
  ReceiptText,
  BookOpen,
  User2,
} from "lucide-react";

const menuItems = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Driver Guide", href: "/dashboard/driver-guide", icon: BookOpen },
  { name: "Fleet & Vehicles", href: "/dashboard/fleet", icon: Truck },
  { name: "Job History", href: "/dashboard/jobs", icon: Briefcase },
  { name: "Nismara Coin", href: "/dashboard/currency", icon: Coins },
  { name: "Points Penalty", href: "/dashboard/points", icon: TriangleAlert },
  { name: "Profile Settings", href: "/dashboard/settings", icon: Settings },
];

const managementItems = [
  { name: "Manager Overview", href: "/dashboard/manage", icon: ShieldCheck },
  {
    name: "User Data",
    href: "/dashboard/manage/data",
    icon: User2,
  },
  {
    name: "Manage Events",
    href: "/dashboard/manage/events",
    icon: Sparkles,
  },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isManager = session?.user?.role === "manager";

  return (
    <aside className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-border/50 bg-background/50 backdrop-blur-xl lg:h-[calc(100vh-4rem)] lg:sticky top-16 z-40">
      <div className="p-4 lg:p-6 overflow-x-auto lg:overflow-y-auto lg:overflow-x-visible no-scrollbar h-full">
        {/* SECTION: DRIVER MENU */}
        <h2 className="hidden lg:block text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
          Driver Menu
        </h2>

        <nav className="flex lg:flex-col gap-2 min-w-max lg:min-w-0 mb-8">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-medium"
                    : "text-gray-400 hover:text-primary hover:bg-card/80"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* SECTION: MANAGEMENT PORTAL (Hanya muncul untuk Manager) */}
        {isManager && (
          <div className="flex lg:flex-col gap-2 min-w-max lg:min-w-0 border-t lg:border-t-0 border-border/50 pt-4 lg:pt-0">
            <h2 className="hidden lg:block text-xs font-bold text-primary uppercase tracking-widest mb-4 mt-4">
              Management Portal
            </h2>

            <nav className="flex lg:flex-col gap-2">
              {managementItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? "bg-accent-sky/20 text-accent-sky border border-accent-sky/30 font-medium"
                        : "text-gray-500 hover:text-accent-sky hover:bg-accent-sky/10"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </aside>
  );
}
