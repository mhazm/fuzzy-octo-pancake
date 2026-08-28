"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  Briefcase,
  Coins,
  Settings,
  TriangleAlert,
  Sparkles,
  ReceiptText,
  BookOpen,
  User2,
  Shield,
  FileText,
  ShieldCheck,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";

const menuItems = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Driver Guide", href: "/dashboard/driver-guide", icon: BookOpen },
  { name: "Garage", href: "/dashboard/garage", icon: Truck },
  { name: "Job History", href: "/dashboard/jobs", icon: Briefcase },
  { name: "Wallet", href: "/dashboard/currency", icon: Coins },
  { name: "Penalty Points", href: "/dashboard/points", icon: TriangleAlert },
  { name: "Tickets", href: "/dashboard/ticket", icon: FileText },
  { name: "Insurance", href: "/dashboard/insurance", icon: Shield },
  { name: "My Market", href: "/dashboard/my-market", icon: Briefcase },
  { name: "My Library", href: "/dashboard/library", icon: FileText },
  { name: "Transactions", href: "/dashboard/transactions", icon: ReceiptText },
  { name: "Profile Settings", href: "/dashboard/settings", icon: Settings },
];

const managementItems = [
  { name: "Manager Overview", href: "/dashboard/manage", icon: ShieldCheck },
  { name: "Manage Data", href: "/dashboard/manage/data", icon: User2 },
  { name: "Manage Events", href: "/dashboard/manage/events", icon: Sparkles },
  { name: "Manage Fleets", href: "/dashboard/manage/fleet", icon: Truck },
  { name: "Manage Tickets", href: "/dashboard/manage/tickets", icon: FileText },
];

export default function DashboardSidebar({ userRole }: { userRole?: string }) {
  const pathname = usePathname();
  const isManager = userRole === "manager" || userRole === "admin";

  // Konfigurasi untuk 4 menu yang tampil di Bottom Bar
  const primaryMobileHrefs = ["/dashboard", "/dashboard/garage", "/dashboard/jobs", "/dashboard/currency"];
  const primaryMobileItems = menuItems.filter(item => primaryMobileHrefs.includes(item.href));
  const secondaryMenuItems = menuItems.filter(item => !primaryMobileHrefs.includes(item.href));

  return (
    <>
      {/* ======================================================== */}
      {/* DESKTOP SIDEBAR (Hidden on Mobile)                         */}
      {/* ======================================================== */}
      <aside className="hidden xl:block w-64 shrink-0 border-r border-border/10 bg-background h-[calc(100vh-5rem)] sticky top-20 z-40">
        <div className="p-6 overflow-y-auto no-scrollbar h-full flex flex-col gap-8">
          {/* DRIVER MENU */}
          <div>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
              Driver Menu
            </h2>
            <nav className="flex flex-col gap-2">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all border ${
                      isActive
                        ? "bg-primary/15 text-primary border-primary/30 font-bold shadow-[inset_0_0_20px_rgba(0,0,0,0.1)]"
                        : "border-transparent text-gray-500 hover:text-primary hover:bg-primary/10"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* MANAGEMENT PORTAL */}
          {isManager && (
            <div className="border-t border-border/50 pt-4">
              <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">
                Management Portal
              </h2>
              <nav className="flex flex-col gap-2">
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

      {/* ======================================================== */}
      {/* MOBILE BOTTOM NAVIGATION (Hidden on Desktop)               */}
      {/* ======================================================== */}
      <nav className="xl:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border/50 flex items-center justify-around px-2 pt-2 pb-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        {primaryMobileItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          // Memendekkan nama khusus untuk mobile
          const mobileLabel = item.name === "Job History" ? "Jobs" : item.name === "Overview" ? "Home" : item.name;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                isActive ? "text-primary" : "text-gray-500 hover:text-primary"
              }`}
            >
              <div className={`p-1.5 rounded-lg ${isActive ? "bg-primary/15" : "bg-transparent"}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium">{mobileLabel}</span>
            </Link>
          );
        })}

        {/* MORE BUTTON (Dropdown) */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex flex-col items-center gap-1 p-2 rounded-xl text-gray-500 hover:text-primary transition-all outline-none">
            <div className="p-1.5 rounded-lg bg-transparent">
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium">Lainnya</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            side="top"
            sideOffset={16}
            className="w-56 max-h-[70vh] overflow-y-auto rounded-2xl bg-card border-border/50 shadow-2xl p-2 mb-2"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Driver Menu</DropdownMenuLabel>
              {secondaryMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem key={item.name} className="rounded-xl cursor-pointer">
                    <Link href={item.href} className="flex items-center w-full py-2.5">
                      <Icon className="mr-3 h-4 w-4 text-slate-400" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
            
            {isManager && (
              <>
                <DropdownMenuSeparator className="my-2 bg-border/50" />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-primary uppercase font-bold tracking-widest">Management</DropdownMenuLabel>
                  {managementItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem key={item.name} className="rounded-xl cursor-pointer focus:bg-accent-sky/10 focus:text-accent-sky">
                        <Link href={item.href} className="flex items-center w-full py-2.5">
                          <Icon className="mr-3 h-4 w-4 text-accent-sky/80" />
                          <span className="font-medium text-accent-sky">{item.name}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </>
  );
}
