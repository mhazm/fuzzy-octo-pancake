"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "@/components/ui/NotificationBell";
import { getCurrencyData } from "@/app/dashboard/currency/actions";
import { NismaraIcon, DiscordIcon } from "./icons/SocialMedia";
import {
  Menu,
  LayoutDashboard,
  User,
  LogOut,
  ExternalLink,
  Home,
  Calendar,
  Briefcase,
  Truck,
  Users,
  Trophy,
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

export default function NavbarClient({ session }: { session: any }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [currency, setCurrency] = useState<number | null>(null);

  // Note: If you need to close the menu on route change, you would normally use usePathname from next/navigation.
  // We'll keep the state simple for now without breaking existing code.

  useEffect(() => {
    if (session?.user?.discordId) {
      getCurrencyData()
        .then((data) => setCurrency(data.balance))
        .catch((err) => console.error("Gagal mengambil currency:", err));
    }
  }, [session]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Standard top-level items (excluding Home and Events which are custom handled)
  const mainMenuItems = [
    { name: "Convoy", href: "/convoy", icon: Truck },
    { name: "Gallery", href: "/gallery", icon: Grid3X3 },
    { name: "Market", href: "/market", icon: ShoppingCart },
    { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
    { name: "TimeZone", href: "/timezone", icon: Gamepad2 },
  ];

  // Mobile-specific menu items (flattened)
  const mobileMenuItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Jobs Details", href: "/jobs", icon: Briefcase },
    { name: "Cargo Market", href: "/cargo-market", icon: Package },
    { name: "Fuel Market", href: "/fuel-market", icon: Fuel },
    { name: "Convoy", href: "/convoy", icon: Truck },
    { name: "Gallery", href: "/gallery", icon: Grid3X3 },
    { name: "Market", href: "/market", icon: ShoppingCart },
    { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
    { name: "TimeZone", href: "/timezone", icon: Gamepad2 },
    {
      name: "Currency Boost",
      href: "/currency-boost",
      separator: true,
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

  return (
    <>
      {/* Spacer to maintain document flow since header is fixed */}
      <div className="h-20 w-full shrink-0" />

      <header
        className={`fixed left-0 right-0 z-50 flex justify-center pointer-events-none transition-all duration-500 ease-out ${isScrolled ? "top-4 px-4" : "top-0 px-0"}`}
      >
        <div
          className={`flex items-center justify-between pointer-events-auto transition-all duration-500 ease-out ${
            isScrolled
              ? "w-max max-w-full rounded-full border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl h-16 px-4 sm:px-6 gap-8 lg:gap-16"
              : "w-full max-w-full rounded-none border-b border-border/20 bg-background/50 backdrop-blur-md h-20 px-4 sm:px-8 lg:px-12"
          }`}
        >
          {/* LOGO & DESKTOP NAV */}
          <div className="flex items-center gap-6 lg:gap-8">
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

            <div className="hidden lg:flex items-center">
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
                      <div className="flex w-[400px] gap-4 p-4 lg:w-[600px]">
                        <ul className="grid w-full lg:w-2/3 grid-cols-1 lg:grid-cols-2 gap-2">
                          <li>
                            <NavigationMenuLink
                              render={<Link href="/jobs" />}
                              className="flex h-full w-full flex-col items-start gap-1 p-3"
                            >
                              <div className="flex items-center gap-2 font-medium">
                                <Briefcase className="w-4 h-4 text-primary" />
                                Jobs Details
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                Jelajahi lowongan pekerjaan yang tersedia di
                                Nismara Transport.
                              </p>
                            </NavigationMenuLink>
                          </li>
                          <li>
                            <NavigationMenuLink
                              render={<Link href="/cargo-market" />}
                              className="flex h-full w-full flex-col items-start gap-1 p-3"
                            >
                              <div className="flex items-center gap-2 font-medium">
                                <Package className="w-4 h-4 text-primary" />
                                Cargo Market
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                Akses pasar kargo dan logistik terbaik dari
                                komunitas.
                              </p>
                            </NavigationMenuLink>
                          </li>
                          <li>
                            <NavigationMenuLink
                              render={<Link href="/fuel-market" />}
                              className="flex h-full w-full flex-col items-start gap-1 p-3"
                            >
                              <div className="flex items-center gap-2 font-medium">
                                <Fuel className="w-4 h-4 text-primary" />
                                Fuel Market
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                Sistem transaksi bahan bakar terpusat.
                              </p>
                            </NavigationMenuLink>
                          </li>
                        </ul>
                        <div className="hidden lg:block w-1/3 rounded-lg overflow-hidden relative bg-muted group/image">
                          <img
                            src="https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=400&q=80"
                            alt="Jobs"
                            className="object-cover w-full h-full opacity-80 transition-transform duration-500 group-hover/image:scale-110"
                          />
                          <div className="absolute inset-0 bg-linear-to-t from-background/90 via-background/20 to-transparent flex items-end p-4">
                            <div className="space-y-1">
                              <span className="font-bold text-sm text-foreground block">
                                Jobs & Markets
                              </span>
                              <span className="text-xs text-muted-foreground block">
                                Find the best opportunities
                              </span>
                            </div>
                          </div>
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
                      <div className="flex w-[400px] gap-4 p-4 lg:w-[600px]">
                        <ul className="grid w-full lg:w-2/3 grid-cols-1 lg:grid-cols-2 gap-2">
                          <li>
                            <NavigationMenuLink
                              render={<Link href="/currency-boost" />}
                              className="flex h-full w-full flex-col items-start gap-1 p-3"
                            >
                              <div className="flex items-center gap-2 font-medium">
                                <TrendingUp className="w-4 h-4 text-primary" />
                                Currency Boost
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                Tingkatkan pendapatan NC Anda selama event.
                              </p>
                            </NavigationMenuLink>
                          </li>
                          <li>
                            <NavigationMenuLink
                              render={<Link href="/special-contracts" />}
                              className="flex h-full w-full flex-col items-start gap-1 p-3"
                            >
                              <div className="flex items-center gap-2 font-medium">
                                <FileSignature className="w-4 h-4 text-primary" />
                                Special Contract
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                Selesaikan kontrak khusus dan raih hadiah
                                eksklusif.
                              </p>
                            </NavigationMenuLink>
                          </li>
                          <li>
                            <NavigationMenuLink
                              render={<Link href="/surveys" />}
                              className="flex h-full w-full flex-col items-start gap-1 p-3"
                            >
                              <div className="flex items-center gap-2 font-medium">
                                <ClipboardList className="w-4 h-4 text-primary" />
                                Surveys
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                Ikuti survey untuk mendapatkan imbalan NC.
                              </p>
                            </NavigationMenuLink>
                          </li>
                          <li>
                            <NavigationMenuLink
                              render={<Link href="/coupons" />}
                              className="flex h-full w-full flex-col items-start gap-1 p-3"
                            >
                              <div className="flex items-center gap-2 font-medium">
                                <Ticket className="w-4 h-4 text-primary" />
                                Coupons
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                Klaim kupon spesial untuk diskon atau hadiah.
                              </p>
                            </NavigationMenuLink>
                          </li>
                        </ul>
                        <div className="hidden lg:block w-1/3 rounded-lg overflow-hidden relative bg-muted group/image">
                          <img
                            src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=400&q=80"
                            alt="Events"
                            className="object-cover w-full h-full opacity-80 transition-transform duration-500 group-hover/image:scale-110"
                          />
                          <div className="absolute inset-0 bg-linear-to-t from-background/90 via-background/20 to-transparent flex items-end p-4">
                            <div className="space-y-1">
                              <span className="font-bold text-sm text-foreground block">
                                Special Events
                              </span>
                              <span className="text-xs text-muted-foreground block">
                                Explore our limited time offerings
                              </span>
                            </div>
                          </div>
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
                  className="w-64 mt-2 p-2 rounded-2xl bg-card border border-border/50 shadow-xl"
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

                    {(session.user?.role === "manager" || session.user?.role === "admin") && (
                      <DropdownMenuItem
                        className="cursor-pointer rounded-lg hover:bg-red-500/10 focus:bg-red-500/10"
                        render={
                          <Link
                            href="/dashboard/manage"
                            className="flex items-center w-full"
                          />
                        }
                      >
                        <Shield className="mr-3 h-4 w-4 text-red-400" />
                        <span className="font-medium text-red-400">Manager Hub</span>
                      </DropdownMenuItem>
                    )}
                  </div>

                  <div className="h-px bg-border my-2 mx-2" />

                  <div className="px-1 py-1">
                    <DropdownMenuItem
                      className={`cursor-pointer rounded-lg hover:bg-white/5 focus:bg-white/5 flex items-center justify-between group ${session.user?.nismaraplus?.status ? "bg-amber-400/10 hover:bg-amber-400/20 focus:bg-amber-400/20 border border-amber-400/20" : ""}`}
                      render={
                        <Link
                          href="/dashboard/nismaraplus"
                          className="flex items-center w-full"
                        />
                      }
                    >
                      <div className="flex items-center">
                        <NismaraIcon
                          className={`mr-3 h-4 w-4 ${session.user?.nismaraplus?.status ? "text-amber-400" : "text-slate-400 group-hover:text-amber-400 transition-colors"}`}
                        />
                        <div className="flex flex-col">
                          <span
                            className={`font-medium leading-none ${session.user?.nismaraplus?.status ? "text-amber-400 font-bold" : "group-hover:text-amber-400 transition-colors"}`}
                          >
                            Nismara+
                          </span>
                          {session.user?.nismaraplus?.status && (
                            <span className="text-[9px] text-amber-500/80 uppercase tracking-widest font-black mt-1">
                              Aktif s.d{" "}
                              {new Date(
                                session.user.nismaraplus.expiredAt,
                              ).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      {!session.user?.nismaraplus?.status && (
                        <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
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
                  <Button variant="ghost" size="icon" className="lg:hidden" />
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
