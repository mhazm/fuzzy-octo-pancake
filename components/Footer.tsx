import Link from "next/link";
import {
  DiscordIcon,
  InstagramIcon,
  YoutubeIcon,
} from "@/components/icons/SocialMedia"; // Sesuaikan path icon Anda
import { NismaraIcon } from "@/components/icons/SocialMedia";
import {
  Mail,
  Globe,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Heart,
} from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-card/30 backdrop-blur-md border-t border-border/50 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* KOLOM 1: ABOUT & LOGO */}
          <div className="space-y-8">
            <div className="flex items-center gap-5">
              <NismaraIcon className="w-10 h-10 text-primary" />
              <span className="text-2xl font-black text-(-primary-foreground) uppercase tracking-tighter">
                Nismara <span className="text-primary">Transport</span>
              </span>
            </div>
            <p className="text-sm font-medium text-foreground/50 leading-relaxed">
              Ekosistem logistik virtual terintegrasi untuk komunitas simulasi.
              Menghubungkan driver melalui teknologi pelacakan real-time dan
              ekonomi virtual yang dinamis.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://link.nismara.web.id/discord"
                className="p-2.5 bg-white/5 rounded-xl text-foreground/40 hover:text-primary hover:bg-primary/10 transition-all"
              >
                <DiscordIcon className="w-5 h-5" />
              </a>
              <a
                href="https://link.nismara.web.id/instagram"
                className="p-2.5 bg-white/5 rounded-xl text-foreground/40 hover:text-pink-500 hover:bg-pink-500/10 transition-all"
              >
                <InstagramIcon className="w-5 h-5" />
              </a>
              <a
                href="https://link.nismara.web.id/youtube"
                className="p-2.5 bg-white/5 rounded-xl text-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-all"
              >
                <YoutubeIcon className="w-5 h-5" />
              </a>
              <a
                href="/support-us"
                className="p-2.5 bg-white/5 rounded-xl text-foreground/40 hover:text-pink-500 hover:bg-pink-500/10 transition-all"
              >
                <Heart className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* KOLOM 2: QUICK NAVIGATION */}
          <div>
            <h4 className="text-[10px] font-black text-(-primary-foreground) uppercase tracking-[0.3em] mb-8 italic">
              Navigation
            </h4>
            <ul className="space-y-4">
              {[
                { name: "Dashboard", href: "/dashboard" },
                { name: "Leaderboard", href: "/dashboard/leaderboard" },
                { name: "Special Contract", href: "/special-contract" },
                { name: "All Jobs", href: "/jobs" },
                { name: "Teams", href: "/teams" },
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm font-bold text-foreground/40 hover:text-accent-sky flex items-center gap-2 group transition-all"
                  >
                    <ChevronRight
                      size={14}
                      className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all"
                    />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* KOLOM 3: LEGAL & RESOURCES */}
          <div>
            <h4 className="text-[10px] font-black text-(-primary-foreground) uppercase tracking-[0.3em] mb-8 italic">
              Legal & Support
            </h4>
            <ul className="space-y-4">
              {[
                { name: "Terms of Service", href: "/terms" },
                { name: "Privacy Policy", href: "/privacy" },
                { name: "Cookie Policy", href: "/cookies" },
                { name: "Frequently Asked Questions", href: "/faq" },
                { name: "Knowledge Base", href: "/kb" },
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm font-bold text-foreground/40 hover:text-accent-lilac transition-all"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* KOLOM 4: CONTACT & STATUS */}
          <div className="space-y-8">
            <div>
              <h4 className="text-[10px] font-black text-(-primary-foreground) uppercase tracking-[0.3em] mb-6 italic">
                Contact Us
              </h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm font-bold text-foreground/40">
                  <Mail size={16} className="text-primary" />
                  <span>support@nismara.web.id</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-bold text-foreground/40">
                  <Globe size={16} className="text-accent-sky" />
                  <span>www.nismara.web.id</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION PARTNER */}
        <div className="py-10 border-t border-border/30">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex flex-col items-center md:items-start gap-2">
              <h4 className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.4em]">
                Partners
              </h4>
              <p className="text-[10px] font-bold text-foreground/10 uppercase">
                Integrasi Teknologi & Platform Simulasi
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-12 items-center grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
              <img
                src="https://hub.truckyapp.com/assets/trucky_hub_red.png"
                alt="Trucky Logo"
                className="h-6 w-auto object-contain"
              />
              <div className="flex items-center gap-2 text-white/50">
                <DiscordIcon className="w-9 h-9" />
                <span className="text-xs font-black tracking-widest">
                  DISCORD
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="pt-10 border-t border-border/30 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-[10px] font-black text-foreground/20 uppercase tracking-[0.2em] flex items-center gap-4">
            <span>&copy; {currentYear} NISMARA GROUP</span>
            <span className="hidden md:block w-1 h-1 bg-border rounded-full"></span>
            <span className="hidden md:block italic">
              More than just a Transport
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-accent-sky/40"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-accent-lilac/40"></span>
            </div>
            <p className="text-[10px] font-black text-foreground/20 uppercase tracking-widest">
              Made with ♡ from{" "}
              <span className="text-foreground/40 hover:text-primary transition-colors cursor-pointer">
                Lemper
              </span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
