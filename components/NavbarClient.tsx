"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import ThemeToggle from "./ThemeToggle";
import { NismaraIcon, DiscordIcon } from "./icons/SocialMedia";
import {
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  User,
  LogOut,
  ExternalLink,
} from "lucide-react";

export default function NavbarClient({ session }: { session: any }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const menuItems = [
    { name: "Home", href: "/" },
    { name: "Events", href: "/events" },
    { name: "Jobs", href: "/jobs" },
    { name: "Convoy", href: "/convoy" },
    { name: "Special Contract", href: "/special-contracts" },
    { name: "Teams", href: "/teams" },
    { name: "Leaderboard", href: "/leaderboard" },
  ];

  // Menutup dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="w-full border-b border-border/50 bg-background/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* LOGO & DESKTOP NAV */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-linear-to-br from-primary to-accent-sky rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
              <NismaraIcon className="w-5 h-5"></NismaraIcon>
            </div>
            <span className="font-bold text-xl tracking-tight uppercase">
              Nismara <span className="text-accent-sky">Transport</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-medium text-foreground/70 hover:text-primary transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* RIGHT SECTION: THEME & PROFILE */}
        <div className="flex items-center gap-2 sm:gap-4"></div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="https://link.nismara.web.id/discord"
            className="p-2.5 rounded-xl transition-all border"
          >
            <DiscordIcon />
          </Link>
          <ThemeToggle />

          <div className="hidden sm:block h-6 w-px bg-border mx-1"></div>

          {session ? (
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-foreground/5 transition-all"
              >
                <div className="w-9 h-9 rounded-full border-2 border-primary/30 overflow-hidden bg-card">
                  {session.user?.image ? (
                    <img
                      src={session.user.image}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold bg-primary/10">
                      {session.user?.name?.charAt(0)}
                    </div>
                  )}
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-foreground/50 transition-transform ${isProfileOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* DROPDOWN MENU */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 glass-panel rounded-2xl border border-border shadow-xl py-2 animate-in fade-in zoom-in-95">
                  <div className="px-4 py-2 border-b border-border/50 mb-1">
                    <p className="text-sm font-bold truncate">
                      {session.user?.name}
                    </p>
                    <p className="text-[10px] text-primary font-medium uppercase tracking-tighter">
                      {session.user?.role || "Driver"}
                    </p>
                  </div>
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-primary/10 text-foreground/80 hover:text-primary transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                  </Link>
                  <Link
                    href={`/profile/${session.user?.driverData?.truckyId}`}
                    className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-primary/10 text-foreground/80 hover:text-primary transition-colors"
                  >
                    <User className="w-4 h-4" /> Public Profile
                  </Link>
                  <div className="border-t border-border/50 my-1"></div>
                  <button
                    onClick={() => signOut()}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-lg shadow-primary/20"
            >
              Login
            </Link>
          )}

          {/* MOBILE TOGGLE */}
          <button
            className="md:hidden p-2 text-foreground/70 hover:text-primary"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU OVERLAY */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-lg animate-in slide-in-from-top-4">
          <nav className="flex flex-col p-4 gap-1">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between p-3 rounded-xl text-sm font-bold text-foreground/70 hover:bg-primary/10 hover:text-primary transition-all"
              >
                {item.name} <ExternalLink className="w-4 h-4 opacity-30" />
              </Link>
            ))}
            {!session && (
              <Link
                href="/login"
                className="mt-4 p-4 text-center rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg"
              >
                Login Driver
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
