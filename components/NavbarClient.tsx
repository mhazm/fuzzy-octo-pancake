"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "@/components/ui/NotificationBell";
import { getCurrencyData } from "@/app/dashboard/currency/actions";
import {
  getSeasonPassSummary,
  type SeasonPassSummary,
} from "@/app/dashboard/season-pass/actions";
import { NismaraIcon, DiscordIcon } from "./icons/SocialMedia";
import {
  Menu,
  LayoutDashboard,
  User,
  LogOut,
  ExternalLink,
  Home,
  Calendar,
  CalendarDays,
  Briefcase,
  Truck,
  Users,
  Trophy,
  Medal,
  TrendingUp,
  FileSignature,
  ClipboardList,
  Ticket,
  Heart,
  Grid3X3,
  ShoppingCart,
  Gamepad2,
  Package,
  Fuel,
  Sparkles,
  FileText,
  Shield,
  User2,
  Sparkle,
  TruckIcon,
  Target,
  Gift,
  Coins,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function NavbarClient({
  session,
  isSeasonPassEnabled = true,
}: {
  session: any;
  isSeasonPassEnabled?: boolean;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [currency, setCurrency] = useState<number | null>(null);
  const [seasonPass, setSeasonPass] = useState<SeasonPassSummary | null>(null);

  // Note: If you need to close the menu on route change, you would normally use usePathname from next/navigation.
  // We'll keep the state simple for now without breaking existing code.

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && session?.user?.discordId) {
      getCurrencyData()
        .then((data) => setCurrency(data.balance))
        .catch((err) => console.error("Gagal mengambil currency:", err));

      if (isSeasonPassEnabled) {
        getSeasonPassSummary()
          .then((data) => setSeasonPass(data))
          .catch((err) => console.error("Gagal mengambil season pass:", err));
      } else {
        setSeasonPass(null);
      }
    }
  }, [mounted, session, isSeasonPassEnabled]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/dashboard");
  const effectiveIsScrolled = isScrolled && !isDashboard;

  // Standard top-level items (excluding Home and Events which are custom handled)
  const mainMenuItems = [
    { name: "Convoy", href: "/convoy", icon: Truck },
    { name: "Market", href: "/market", icon: ShoppingCart },
    { name: "TimeZone", href: "/timezone", icon: Gamepad2 },
  ];

  // Mobile-specific menu items (flattened)
  const rawMobileMenuItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Season Pass", href: "/dashboard/season-pass", icon: Trophy },
    { name: "Jobs Details", href: "/jobs", icon: Briefcase },
    { name: "Cargo Market", href: "/cargo-market", icon: Package },
    { name: "Fuel Market", href: "/fuel-market", icon: Fuel },
    { name: "Convoy", href: "/convoy", icon: Truck },
    { name: "Market", href: "/market", icon: ShoppingCart },
    { name: "Feeds", href: "/feeds", icon: Grid3X3, separator: true },
    { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
    { name: "Achievements", href: "/achievements", icon: Medal },
    { name: "Community Goals", href: "/community-goals", icon: Target },
    { name: "Giveaways", href: "/giveaways", icon: Gift },
    { name: "TimeZone", href: "/timezone", icon: Gamepad2, separator: true },
    {
      name: "Community Calendar",
      href: "/calendar",
      separator: true,
      icon: CalendarDays,
    },
    {
      name: "Currency Boost",
      href: "/currency-boost",
      icon: TrendingUp,
    },
    {
      name: "Special Contract",
      href: "/special-contracts",
      icon: FileSignature,
    },
    { name: "Surveys", href: "/surveys", icon: ClipboardList },
    { name: "Coupons", href: "/coupons", icon: Ticket },
  ];

  const mobileMenuItems = isSeasonPassEnabled
    ? rawMobileMenuItems
    : rawMobileMenuItems.filter((item) => item.href !== "/dashboard/season-pass");

  return (
    <>
      {/* Spacer to maintain document flow since header is fixed */}
      <div className="h-20 w-full shrink-0" />

      <header
        className={`fixed left-0 right-0 z-50 flex justify-center pointer-events-none transition-all duration-500 ease-out ${effectiveIsScrolled ? "top-4 px-4" : "top-0 px-0"}`}
      >
        <div
          className={`flex items-center justify-between pointer-events-auto transition-all duration-500 ease-out ${
            effectiveIsScrolled
              ? "w-max max-w-full rounded-full border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl h-16 px-4 sm:px-6 gap-8 xl:gap-16"
              : "w-full max-w-full rounded-none border-b border-border/20 bg-background/50 backdrop-blur-md h-20 px-4 sm:px-8 xl:px-12"
          }`}
        >
          {/* LOGO & DESKTOP NAV */}
          <div className="flex items-center gap-6 xl:gap-8">
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <div className="w-8 h-8 bg-linear-to-br from-primary to-accent-sky rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                <NismaraIcon className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight uppercase">
                Nismara{" "}
                <span className="text-accent-sky hidden sm:inline">
                  Transport
                </span>
              </span>
            </Link>

            <div className="hidden xl:flex items-center">
              <NavigationMenu>
                <NavigationMenuList className="gap-1">
                  {/* Home */}
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      render={<Link href="/" />}
                      className={navigationMenuTriggerStyle()}
                    >
                      <Home className="mr-2 h-4 w-4 text-muted-foreground" />
                      Home
                    </NavigationMenuLink>
                  </NavigationMenuItem>

                  {/* Jobs Mega Menu */}
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="bg-transparent hover:bg-muted/50 data-[state=open]:bg-muted/50">
                      <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
                      Jobs
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="w-[560px] p-5">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
                          <div className="p-1.5 rounded-lg bg-sky-500/15">
                            <Briefcase className="w-4 h-4 text-sky-400" />
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest text-sky-400">Jobs & Markets</p>
                            <p className="text-[11px] text-muted-foreground">Pekerjaan dan peluang kargo terbaik</p>
                          </div>
                        </div>
                        {/* Items */}
                        <ul className="grid grid-cols-1 gap-1">
                          <li>
                            <NavigationMenuLink
                              render={<Link href="/jobs" />}
                              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-all group/item"
                            >
                              <div className="w-9 h-9 shrink-0 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center group-hover/item:bg-sky-500/20 transition-colors">
                                <Briefcase className="w-4 h-4 text-sky-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-foreground leading-tight">Jobs Details</p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">Riwayat pekerjaan seluruh driver Nismara Transport</p>
                              </div>
                            </NavigationMenuLink>
                          </li>
                          <li>
                            <NavigationMenuLink
                              render={<Link href="/cargo-market" />}
                              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-all group/item"
                            >
                              <div className="w-9 h-9 shrink-0 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center group-hover/item:bg-orange-500/20 transition-colors">
                                <Package className="w-4 h-4 text-orange-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-foreground leading-tight">Cargo Market</p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">Pasar kargo dan logistik terbaik dari komunitas</p>
                              </div>
                            </NavigationMenuLink>
                          </li>
                          <li>
                            <NavigationMenuLink
                              render={<Link href="/fuel-market" />}
                              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-all group/item"
                            >
                              <div className="w-9 h-9 shrink-0 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center group-hover/item:bg-yellow-500/20 transition-colors">
                                <Fuel className="w-4 h-4 text-yellow-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-foreground leading-tight">Fuel Market</p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">Sistem transaksi bahan bakar komunitas yang terpusat</p>
                              </div>
                            </NavigationMenuLink>
                          </li>
                        </ul>
                        {/* Footer CTA */}
                        <div className="mt-4 pt-3 border-t border-border/50">
                          <NavigationMenuLink
                            render={<Link href="/jobs" />}
                            className="flex items-center justify-between px-3 py-2 rounded-xl bg-sky-500/8 hover:bg-sky-500/15 border border-sky-500/20 hover:border-sky-500/40 transition-all group/cta"
                          >
                            <span className="text-xs font-bold text-sky-400">Lihat semua riwayat job driver →</span>
                          </NavigationMenuLink>
                        </div>
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>

                  {/* Events Mega Menu */}
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="bg-transparent hover:bg-muted/50 data-[state=open]:bg-muted/50">
                      <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                      Events
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="w-[640px] p-5">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
                          <div className="p-1.5 rounded-lg bg-primary/15">
                            <Calendar className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest text-primary">Events & Program</p>
                            <p className="text-[11px] text-muted-foreground">Kegiatan, misi, dan reward eksklusif komunitas</p>
                          </div>
                        </div>
                        {/* Featured: Calendar */}
                        <NavigationMenuLink
                          render={<Link href="/calendar" />}
                          className="flex items-center gap-3 p-3 mb-3 rounded-xl bg-primary/8 border border-primary/20 hover:bg-primary/15 hover:border-primary/40 transition-all group/feat"
                        >
                          <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                            <CalendarDays className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-foreground leading-tight">Community Calendar <span className="ml-1 text-[10px] font-black uppercase tracking-wider text-primary bg-primary/15 px-1.5 py-0.5 rounded-full">Featured</span></p>
                            <p className="text-xs text-muted-foreground mt-0.5">Jadwal lengkap seluruh kegiatan, promo, dan konvoi rutin komunitas</p>
                          </div>
                        </NavigationMenuLink>
                        {/* Grid items */}
                        <ul className="grid grid-cols-2 gap-1">
                          <li>
                            <NavigationMenuLink
                              render={<Link href="/currency-boost" />}
                              className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-muted/60 transition-all group/item"
                            >
                              <div className="w-8 h-8 shrink-0 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover/item:bg-emerald-500/20 transition-colors">
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground leading-tight">Currency Boost</p>
                                <p className="text-[11px] text-muted-foreground line-clamp-1">Tingkatkan pendapatan NC selama event</p>
                              </div>
                            </NavigationMenuLink>
                          </li>
                          <li>
                            <NavigationMenuLink
                              render={<Link href="/special-contracts" />}
                              className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-muted/60 transition-all group/item"
                            >
                              <div className="w-8 h-8 shrink-0 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center group-hover/item:bg-violet-500/20 transition-colors">
                                <FileSignature className="w-3.5 h-3.5 text-violet-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground leading-tight">Special Contract</p>
                                <p className="text-[11px] text-muted-foreground line-clamp-1">Kontrak khusus berhadiah eksklusif</p>
                              </div>
                            </NavigationMenuLink>
                          </li>
                          <li>
                            <NavigationMenuLink
                              render={<Link href="/surveys" />}
                              className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-muted/60 transition-all group/item"
                            >
                              <div className="w-8 h-8 shrink-0 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover/item:bg-blue-500/20 transition-colors">
                                <ClipboardList className="w-3.5 h-3.5 text-blue-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground leading-tight">Surveys</p>
                                <p className="text-[11px] text-muted-foreground line-clamp-1">Ikuti survey, dapatkan imbalan NC</p>
                              </div>
                            </NavigationMenuLink>
                          </li>
                          <li>
                            <NavigationMenuLink
                              render={<Link href="/coupons" />}
                              className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-muted/60 transition-all group/item"
                            >
                              <div className="w-8 h-8 shrink-0 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center group-hover/item:bg-rose-500/20 transition-colors">
                                <Ticket className="w-3.5 h-3.5 text-rose-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground leading-tight">Coupons</p>
                                <p className="text-[11px] text-muted-foreground line-clamp-1">Kupon spesial untuk diskon atau hadiah</p>
                              </div>
                            </NavigationMenuLink>
                          </li>
                          <li>
                            <NavigationMenuLink
                              render={<Link href="/giveaways" />}
                              className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-muted/60 transition-all group/item col-span-2"
                            >
                              <div className="w-8 h-8 shrink-0 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover/item:bg-amber-500/20 transition-colors">
                                <Gift className="w-3.5 h-3.5 text-amber-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground leading-tight">Giveaways <span className="ml-1 text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full">New</span></p>
                                <p className="text-[11px] text-muted-foreground line-clamp-1">Event undian berhadiah spektakuler bagi seluruh driver</p>
                              </div>
                            </NavigationMenuLink>
                          </li>
                        </ul>
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>

                  {/* Community Mega Menu */}
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="bg-transparent hover:bg-muted/50 data-[state=open]:bg-muted/50">
                      <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                      Community
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="w-[580px] p-5">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
                          <div className="p-1.5 rounded-lg bg-indigo-500/15">
                            <Users className="w-4 h-4 text-indigo-400" />
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest text-indigo-400">Komunitas</p>
                            <p className="text-[11px] text-muted-foreground">Terhubung, bersaing, dan tumbuh bersama para driver</p>
                          </div>
                        </div>
                        {/* Items grid */}
                        <ul className="grid grid-cols-2 gap-1 mb-4">
                          <li>
                            <NavigationMenuLink
                              render={<Link href="/feeds" />}
                              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-all group/item"
                            >
                              <div className="w-9 h-9 shrink-0 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center group-hover/item:bg-pink-500/20 transition-colors">
                                <Grid3X3 className="w-4 h-4 text-pink-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-foreground leading-tight">Social Feeds</p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">Momen dan aktivitas berkendara komunitas</p>
                              </div>
                            </NavigationMenuLink>
                          </li>
                          <li>
                            <NavigationMenuLink
                              render={<Link href="/leaderboard" />}
                              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-all group/item"
                            >
                              <div className="w-9 h-9 shrink-0 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover/item:bg-amber-500/20 transition-colors">
                                <Trophy className="w-4 h-4 text-amber-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-foreground leading-tight">Leaderboard</p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">Peringkat driver terbaik komunitas</p>
                              </div>
                            </NavigationMenuLink>
                          </li>
                          <li>
                            <NavigationMenuLink
                              render={<Link href="/achievements" />}
                              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-all group/item"
                            >
                              <div className="w-9 h-9 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover/item:bg-emerald-500/20 transition-colors">
                                <Medal className="w-4 h-4 text-emerald-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-foreground leading-tight">Achievements</p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">Galeri lencana dan pencapaian driver</p>
                              </div>
                            </NavigationMenuLink>
                          </li>
                          <li>
                            <NavigationMenuLink
                              render={<Link href="/community-goals" />}
                              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-all group/item"
                            >
                              <div className="w-9 h-9 shrink-0 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover/item:bg-indigo-500/20 transition-colors">
                                <Target className="w-4 h-4 text-indigo-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-foreground leading-tight">Community Goals</p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">Capai target bersama seluruh komunitas</p>
                              </div>
                            </NavigationMenuLink>
                          </li>
                        </ul>
                        {/* Footer banner */}
                        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-pink-500/10 border border-indigo-500/20 p-4 flex items-center gap-4">
                          <div className="shrink-0 w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                            <Users className="w-5 h-5 text-indigo-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-foreground">Nismara Transport</p>
                            <p className="text-xs text-muted-foreground">Bergabung dan jadilah bagian dari komunitas driver terbaik</p>
                          </div>
                          <NavigationMenuLink
                            render={<Link href="/feeds" />}
                            className="ml-auto shrink-0 text-xs font-bold text-indigo-400 hover:text-indigo-300 whitespace-nowrap transition-colors"
                          >
                            Explore →
                          </NavigationMenuLink>
                        </div>
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>

                  {/* Other Main Links */}
                  {mainMenuItems.map((item) => (
                    <NavigationMenuItem key={item.name}>
                      <NavigationMenuLink
                        render={<Link href={item.href} />}
                        className={navigationMenuTriggerStyle()}
                      >
                        <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                        {item.name}
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  ))}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>

          {/* RIGHT SECTION: THEME & PROFILE */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link href="https://link.nismara.web.id/discord">
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl border border-border/50 hidden sm:inline-flex"
              >
                <DiscordIcon />
              </Button>
            </Link>
            {session && <NotificationBell />}

            <ThemeToggle />

            <div className="hidden sm:block h-6 w-px bg-border mx-1"></div>

            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      className="relative h-10 w-10 rounded-full focus-visible:ring-0"
                    />
                  }
                >
                  <Avatar className="h-9 w-9 border-2 border-primary/30 shadow-sm bg-card">
                    <AvatarImage
                      src={session.user?.image || ""}
                      alt={session.user?.name || "User"}
                    />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {session.user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-72 mt-2 p-2 rounded-2xl bg-card border border-border/50 shadow-xl"
                  align="end"
                >
                  <div className="bg-muted/80 backdrop-blur-md rounded-xl p-3 flex items-center gap-3 mb-2 border border-white/5">
                    <Avatar className="h-12 w-12 border border-primary/20 bg-primary/10 shrink-0">
                      <AvatarImage
                        src={session.user?.image || ""}
                        alt={session.user?.name || "User"}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-red-500 text-white font-bold">
                        {session.user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-sm text-foreground truncate block">
                        {session.user?.name}
                      </span>
                      <span className="text-xs text-muted-foreground truncate block capitalize">
                        {session.user?.role || "Driver"}
                      </span>
                      <span className="text-xs text-primary font-medium truncate block mt-0.5">
                        Level {session.user?.level || 1} •{" "}
                        {currency !== null
                          ? currency.toLocaleString("id-ID")
                          : "..."}{" "}
                        NC
                      </span>
                    </div>
                  </div>

                  <div className="px-1 py-1 space-y-1">
                    <DropdownMenuItem
                      className="cursor-pointer rounded-lg hover:bg-white/5 focus:bg-white/5"
                      render={
                        <Link
                          href="/dashboard"
                          className="flex items-center w-full"
                        />
                      }
                    >
                      <LayoutDashboard className="mr-3 h-4 w-4 text-slate-400" />
                      <span className="font-medium">Dashboard</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      className="cursor-pointer rounded-lg hover:bg-white/5 focus:bg-white/5"
                      render={
                        <Link
                          href={`/profile/${session.user?.truckyId || session.user?.driverData?.truckyId}`}
                          className="flex items-center w-full"
                        />
                      }
                    >
                      <User className="mr-3 h-4 w-4 text-slate-400" />
                      <span className="font-medium">Public Profile</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      className="cursor-pointer rounded-lg hover:bg-white/5 focus:bg-white/5"
                      render={
                        <Link
                          href="/teams"
                          className="flex items-center w-full"
                        />
                      }
                    >
                      <Users className="mr-3 h-4 w-4 text-slate-400" />
                      <span className="font-medium">Teams</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      className="cursor-pointer rounded-lg hover:bg-white/5 focus:bg-white/5"
                      render={
                        <Link
                          href="/dashboard/ticket"
                          className="flex items-center w-full"
                        />
                      }
                    >
                      <FileText className="mr-3 h-4 w-4 text-slate-400" />
                      <span className="font-medium">Tickets</span>
                    </DropdownMenuItem>

                    {(session.user?.role === "manager" ||
                      session.user?.role === "admin") && (
                      <DropdownMenuItem
                        className="cursor-pointer rounded-lg hover:bg-red-500/10 focus:bg-red-500/10"
                        render={
                          <Link
                            href="/dashboard/manage/payroll"
                            className="flex items-center w-full"
                          />
                        }
                      >
                        <Coins className="mr-3 h-4 w-4 text-red-400" />
                        <span className="font-medium text-red-400">
                          Payroll & KPI
                        </span>
                      </DropdownMenuItem>
                    )}

                    {(session.user?.role === "manager" ||
                      session.user?.role === "admin") && (
                      <DropdownMenuItem
                        className="cursor-pointer rounded-lg hover:bg-red-500/10 focus:bg-red-500/10"
                        render={
                          <Link
                            href="/dashboard/manage/tickets"
                            className="flex items-center w-full"
                          />
                        }
                      >
                        <FileText className="mr-3 h-4 w-4 text-red-400" />
                        <span className="font-medium text-red-400">
                          Manage Tiket
                        </span>
                      </DropdownMenuItem>
                    )}
                    {(session.user?.role === "manager" ||
                      session.user?.role === "admin") && (
                      <DropdownMenuItem
                        className="cursor-pointer rounded-lg hover:bg-red-500/10 focus:bg-red-500/10"
                        render={
                          <Link
                            href="/dashboard/manage/fleet"
                            className="flex items-center w-full"
                          />
                        }
                      >
                        <Truck className="mr-3 h-4 w-4 text-red-400" />
                        <span className="font-medium text-red-400">
                          Manage Fleet
                        </span>
                      </DropdownMenuItem>
                    )}
                    {(session.user?.role === "manager" ||
                      session.user?.role === "admin") && (
                      <DropdownMenuItem
                        className="cursor-pointer rounded-lg hover:bg-red-500/10 focus:bg-red-500/10"
                        render={
                          <Link
                            href="/dashboard/manage/events"
                            className="flex items-center w-full"
                          />
                        }
                      >
                        <Sparkle className="mr-3 h-4 w-4 text-red-400" />
                        <span className="font-medium text-red-400">
                          Manage Events
                        </span>
                      </DropdownMenuItem>
                    )}
                    {(session.user?.role === "manager" ||
                      session.user?.role === "admin") && (
                      <DropdownMenuItem
                        className="cursor-pointer rounded-lg hover:bg-red-500/10 focus:bg-red-500/10"
                        render={
                          <Link
                            href="/dashboard/manage/season-pass"
                            className="flex items-center w-full"
                          />
                        }
                      >
                        <Trophy className="mr-3 h-4 w-4 text-red-400" />
                        <span className="font-medium text-red-400">
                          Manage Season Pass
                        </span>
                      </DropdownMenuItem>
                    )}
                    {(session.user?.role === "manager" ||
                      session.user?.role === "admin") && (
                      <DropdownMenuItem
                        className="cursor-pointer rounded-lg hover:bg-red-500/10 focus:bg-red-500/10"
                        render={
                          <Link
                            href="/dashboard/manage/data"
                            className="flex items-center w-full"
                          />
                        }
                      >
                        <User2 className="mr-3 h-4 w-4 text-red-400" />
                        <span className="font-medium text-red-400">
                          Manage Data
                        </span>
                      </DropdownMenuItem>
                    )}
                  </div>

                  <div className="h-px bg-border my-2 mx-2" />

                  {/* EXCLUSIVE MEMBERSHIP & PASS SECTION */}
                  <div className="px-1 py-1 space-y-1.5">
                    {/* SEASON PASS EXCLUSIVE CARD */}
                    {isSeasonPassEnabled && (
                      <DropdownMenuItem
                        className={`cursor-pointer rounded-xl p-2.5 flex flex-col gap-1.5 group transition-all duration-200 ${
                          seasonPass?.isPremium
                            ? "bg-amber-500/10 hover:bg-amber-500/20 focus:bg-amber-500/20 border border-amber-500/30"
                            : "bg-white/[0.03] hover:bg-white/[0.07] focus:bg-white/[0.07] border border-white/5 hover:border-amber-500/30"
                        }`}
                        render={
                          <Link
                            href="/dashboard/season-pass"
                            className="block w-full"
                          />
                        }
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                                seasonPass?.isPremium
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-slate-800 text-slate-400 group-hover:text-amber-400 group-hover:bg-amber-500/10"
                              }`}
                            >
                              <Trophy className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span
                                className={`text-xs font-bold truncate leading-tight ${
                                  seasonPass?.isPremium
                                    ? "text-amber-400"
                                    : "text-foreground group-hover:text-amber-400 transition-colors"
                                }`}
                              >
                                Season Pass
                              </span>
                              <span className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">
                                {seasonPass
                                  ? `S${seasonPass.seasonNumber} • Level ${seasonPass.currentLevel}`
                                  : "Season 1 • Level 0"}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${
                              seasonPass?.isPremium
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs shadow-amber-500/20"
                                : "bg-slate-800/80 text-slate-400 border-slate-700/60 group-hover:border-slate-600"
                            }`}
                          >
                            {seasonPass?.isPremium ? "PREMIUM" : "FREE"}
                          </span>
                        </div>

                        {/* Mini progress bar (Level 0 - 30) */}
                        <div className="w-full bg-slate-800/80 rounded-full h-1 overflow-hidden mt-0.5">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              seasonPass?.isPremium
                                ? "bg-linear-to-r from-amber-500 to-yellow-400"
                                : "bg-slate-600 group-hover:bg-amber-400"
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  seasonPass?.currentLevel ? 4 : 2,
                                  Math.round(((seasonPass?.currentLevel ?? 0) / 30) * 100)
                                )
                              )}%`,
                            }}
                          />
                        </div>
                      </DropdownMenuItem>
                    )}

                    {/* NISMARA+ CARD */}
                    <DropdownMenuItem
                      className={`cursor-pointer rounded-xl p-2.5 flex items-center justify-between group transition-all duration-200 ${
                        session.user?.nismaraplus?.status
                          ? "bg-amber-400/10 hover:bg-amber-400/20 focus:bg-amber-400/20 border border-amber-400/20"
                          : "bg-white/[0.03] hover:bg-white/[0.07] focus:bg-white/[0.07] border border-white/5 hover:border-amber-400/30"
                      }`}
                      render={
                        <Link
                          href="/dashboard/nismaraplus"
                          className="flex items-center w-full"
                        />
                      }
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                            session.user?.nismaraplus?.status
                              ? "bg-amber-400/20 text-amber-400"
                              : "bg-slate-800 text-slate-400 group-hover:text-amber-400 group-hover:bg-amber-400/10"
                          }`}
                        >
                          <NismaraIcon className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span
                            className={`text-xs font-bold leading-tight truncate ${
                              session.user?.nismaraplus?.status
                                ? "text-amber-400"
                                : "text-foreground group-hover:text-amber-400 transition-colors"
                            }`}
                          >
                            Nismara+
                          </span>
                          {session.user?.nismaraplus?.status ? (
                            <span className="text-[9px] text-amber-500/80 uppercase tracking-widest font-black leading-tight mt-0.5">
                              Aktif s.d{" "}
                              {new Date(
                                session.user.nismaraplus.expiredAt
                              ).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">
                              Membership VIP
                            </span>
                          )}
                        </div>
                      </div>
                      {!session.user?.nismaraplus?.status && (
                        <span className="text-[9px] bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                          VIP
                        </span>
                      )}
                    </DropdownMenuItem>
                  </div>

                  <div className="h-px bg-border my-2 mx-2" />

                  <div className="px-1 pb-1">
                    <DropdownMenuItem
                      className="text-red-400 hover:text-red-300 focus:text-red-300 focus:bg-red-500/10 cursor-pointer flex items-center justify-center rounded-lg font-bold py-2.5 transition-colors"
                      onClick={() => signOut()}
                    >
                      Logout
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login" className="hidden sm:block">
                <Button className="font-bold rounded-xl shadow-lg shadow-primary/20">
                  Login
                </Button>
              </Link>
            )}

            {/* MOBILE TOGGLE (SHEET) */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon" className="xl:hidden" />
                }
              >
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[85vw] sm:w-[350px] overflow-y-auto"
              >
                <SheetHeader className="text-left mb-6">
                  <SheetTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-linear-to-br from-primary to-accent-sky rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                      <NismaraIcon className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-xl tracking-tight uppercase">
                      Nismara <span className="text-accent-sky">Transport</span>
                    </span>
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1.5">
                  {mobileMenuItems.map((item, index) => (
                    <div key={item.name}>
                      {item.separator && (
                        <div className="h-px bg-border/50 my-2" />
                      )}
                      <Link
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-between p-3 rounded-xl text-sm font-bold text-foreground/70 hover:bg-primary/10 hover:text-primary transition-all group/mobilenav"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-lg bg-muted group-hover/mobilenav:bg-background transition-colors">
                            <item.icon className="w-4 h-4" />
                          </div>
                          {item.name}
                        </div>
                        <ExternalLink className="w-4 h-4 opacity-0 group-hover/mobilenav:opacity-30 transition-opacity" />
                      </Link>
                    </div>
                  ))}

                  <div className="h-px bg-border/50 my-2" />

                  {/* DISCORD LINK ON MOBILE */}
                  <Link
                    href="https://link.nismara.web.id/discord"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between p-3 rounded-xl text-sm font-bold text-foreground/70 hover:bg-[#5865F2]/10 hover:text-[#5865F2] transition-all group/discord"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-muted group-hover/discord:bg-background transition-colors">
                        <DiscordIcon />
                      </div>
                      Discord Server
                    </div>
                    <ExternalLink className="w-4 h-4 opacity-0 group-hover/discord:opacity-30 transition-opacity" />
                  </Link>
                </nav>
                {!session && (
                  <div className="mt-8 border-t border-border pt-6 pb-4">
                    <Link
                      href="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Button
                        className="w-full font-bold shadow-lg shadow-primary/20"
                        size="lg"
                      >
                        Login Driver
                      </Button>
                    </Link>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
}
