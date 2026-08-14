import type { Metadata } from "next";
import Link from "next/link";
import {
  Trophy,
  Ticket,
  Zap,
  Coins,
  Sparkles,
  ArrowRight,
  Dices,
  Flag,
  Star,
  Clock,
  ChevronRight,
  Gamepad2,
  Gift,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Timezone — Game Zone",
  description:
    "Mainkan game seru di Nismara Transport! Ikuti Lotto untuk memenangkan jackpot besar, gosok Scratchers untuk hadiah instan, atau tantang keberuntunganmu di arena Drag Racing.",
};

const games = [
  {
    slug: "/lotto",
    title: "Nismara Lotto",
    subtitle: "Mega Jackpot Mingguan",
    description:
      "Tebak 4 angka keberuntunganmu dan menangkan hadiah jackpot puluhan ribu NC! Prize pool terus bertambah dari setiap tiket yang dibeli. Pengundian dilakukan setiap akhir pekan.",
    howToPlay: [
      "Beli tiket seharga 500 NC per lembar",
      "Pilih 4 angka unik dari 1 hingga 69",
      "Maksimal 10 tiket per periode",
      "Cocokkan angka saat pengundian untuk menang",
    ],
    prizes: [
      {
        tier: "Jackpot",
        desc: "4 angka cocok — 60% Prize Pool",
        color: "text-primary",
      },
      {
        tier: "Tier 2",
        desc: "3 angka cocok — 25% Prize Pool",
        color: "text-[--color-accent-sky]",
      },
      {
        tier: "Tier 3",
        desc: "2 angka cocok — 15% Prize Pool",
        color: "text-amber-400",
      },
    ],
    icon: Trophy,
    accentFrom: "from-primary",
    accentTo: "to-amber-500",
    accentBg: "bg-primary",
    accentBorder: "border-primary/30",
    accentGlow: "bg-primary/40",
    accentText: "text-primary",
    tag: "Jackpot",
    tagColor: "bg-primary/20 text-primary border-primary/30",
  },
  {
    slug: "/scratchers",
    title: "Scratch & Win",
    subtitle: "Gosok & Menang Instan",
    description:
      "Beli kartu gosok dan raih hadiah instan! Setiap kartu menyimpan peluang besar untuk mendapatkan NC, mulai dari hadiah kecil hingga jackpot rahasia. Keberuntungan ada di ujung jarimu.",
    howToPlay: [
      "Beli kartu gosok dengan NC",
      "Gosok area tersembunyi pada kartu",
      "Hadiah langsung masuk ke saldo NC-mu",
    ],
    prizes: [
      {
        tier: "Jackpot",
        desc: "Hadiah terbesar — sangat langka",
        color: "text-primary",
      },
      {
        tier: "Big Win",
        desc: "Hadiah besar — jarang muncul",
        color: "text-emerald-400",
      },
      {
        tier: "Small Win",
        desc: "Hadiah kecil — sering muncul",
        color: "text-amber-400",
      },
    ],
    icon: Ticket,
    accentFrom: "from-emerald-500",
    accentTo: "to-[--color-accent-sky]",
    accentBg: "bg-emerald-500",
    accentBorder: "border-emerald-500/30",
    accentGlow: "bg-emerald-500/40",
    accentText: "text-emerald-400",
    tag: "Instan",
    tagColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  {
    slug: "/racing",
    title: "Drag Racing",
    subtitle: "Arena Balap Truk",
    description:
      "Tantang keberuntunganmu di arena drag racing truk! Pilih truk favoritmu, pasang taruhan, dan saksikan balapan seru. Setiap truk punya peluang menang yang berbeda — strategi dan keberuntungan jadi kunci!",
    howToPlay: [
      "Masuk ke arena dan pilih truk taruhan",
      "Tentukan jumlah taruhan NC",
      "Saksikan balapan secara real-time",
      "Menang? NC langsung ditransfer ke saldo!",
    ],
    prizes: [
      {
        tier: "1st Place",
        desc: "Multiply taruhan berdasarkan odds",
        color: "text-primary",
      },
      {
        tier: "Taruhan",
        desc: "Pasang taruhan sesuai kantong",
        color: "text-[--color-accent-sky]",
      },
      {
        tier: "Odds",
        desc: "Setiap truk punya odds berbeda",
        color: "text-amber-400",
      },
    ],
    icon: Flag,
    accentFrom: "from-red-500",
    accentTo: "to-orange-500",
    accentBg: "bg-red-500",
    accentBorder: "border-red-500/30",
    accentGlow: "bg-red-500/40",
    accentText: "text-red-400",
    tag: "Live",
    tagColor: "bg-red-500/20 text-red-400 border-red-500/30",
  },
];

export default function TimezonePage() {
  return (
    <div className="min-h-screen">
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden pt-16 pb-24 px-4 md:px-8">
        {/* Ambient glow blobs */}
        <div className="pointer-events-none absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/30 blur-[160px] opacity-40" />
        <div className="pointer-events-none absolute -top-20 right-1/4 h-[400px] w-[400px] rounded-full bg-[--color-accent-sky]/20 blur-[140px] opacity-30" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 h-[300px] w-[600px] rounded-full bg-amber-500/10 blur-[120px] opacity-20" />

        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/25 text-primary px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.2em]">
            <Gamepad2 size={14} />
            Nismara Timezone
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9]">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-[--color-accent-sky] to-primary">
              GAME
            </span>
            <br />
            <span className="text-foreground">ZONE</span>
          </h1>

          {/* Subtitle */}
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Selamat datang di pusat hiburan Nismara Transport. Uji
            keberuntunganmu, gosok kartu, atau taruhkan strategimu di arena
            balap truk!
          </p>

          {/* Stats row */}
          <div className="flex flex-wrap justify-center gap-6 pt-4">
            {[
              { icon: Dices, label: "3 Games", sub: "Tersedia" },
              { icon: Coins, label: "NC", sub: "Mata Uang" },
              { icon: Gift, label: "Hadiah", sub: "Setiap Hari" },
            ].map((stat, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl px-5 py-3 shadow-lg"
              >
                <div className="p-2 rounded-xl bg-primary/10">
                  <stat.icon size={18} className="text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-foreground">
                    {stat.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    {stat.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Leaderboard Button */}
          <div className="flex justify-center mt-10">
            <Link
              href="/timezone/leaderboard"
              className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white px-8 py-4 rounded-2xl shadow-xl shadow-amber-500/20 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/40 hover:-translate-y-1 font-black uppercase tracking-widest"
            >
              <Trophy className="text-amber-100 group-hover:scale-110 transition-transform duration-300" size={24} />
              <span>Lihat Leaderboard TimeZone</span>
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-amber-600 blur opacity-30 group-hover:opacity-60 transition duration-300 rounded-2xl -z-10" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── GAME CARDS ─── */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-24 space-y-12">
        {/* Section header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Sparkles size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">
              Pilih Permainanmu
            </h2>
            <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] font-bold">
              Klik salah satu untuk mulai bermain
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {games.map((game, idx) => (
            <Link key={game.slug} href={game.slug} className="group block">
              <div
                className={`relative overflow-hidden rounded-3xl bg-card border border-border/50 shadow-xl hover:shadow-2xl transition-all duration-500 hover:border-border`}
              >
                {/* Glow effect on hover */}
                <div
                  className={`pointer-events-none absolute -top-32 -right-32 h-64 w-64 rounded-full ${game.accentGlow} blur-[100px] opacity-0 group-hover:opacity-40 transition-opacity duration-700`}
                />
                <div
                  className={`pointer-events-none absolute -bottom-32 -left-32 h-64 w-64 rounded-full ${game.accentGlow} blur-[100px] opacity-0 group-hover:opacity-20 transition-opacity duration-700`}
                />

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-0">
                  {/* Left — Game Icon & Title */}
                  <div
                    className={`lg:col-span-4 p-8 md:p-10 flex flex-col justify-between bg-gradient-to-br ${game.accentFrom} ${game.accentTo} relative overflow-hidden`}
                  >
                    {/* Decorative patterns */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-4 right-4 w-32 h-32 border-2 border-white/30 rounded-full" />
                      <div className="absolute bottom-8 left-4 w-20 h-20 border-2 border-white/20 rounded-full" />
                      <div className="absolute top-1/2 right-1/4 w-16 h-16 border border-white/20 rounded-lg rotate-45" />
                    </div>

                    <div className="relative z-10">
                      {/* Tag */}
                      <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20 mb-6">
                        <Zap size={10} />
                        {game.tag}
                      </span>

                      {/* Icon */}
                      <div className="mb-6">
                        <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-500">
                          <game.icon
                            size={40}
                            className="text-white drop-shadow-lg"
                          />
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight mb-2 drop-shadow-lg">
                        {game.title}
                      </h3>
                      <p className="text-white/70 text-sm font-bold uppercase tracking-widest">
                        {game.subtitle}
                      </p>
                    </div>

                    {/* CTA */}
                    <div className="relative z-10 mt-8">
                      <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-white/20 transition-all group-hover:gap-3">
                        Main Sekarang
                        <ArrowRight
                          size={14}
                          className="transition-transform group-hover:translate-x-1"
                        />
                      </span>
                    </div>
                  </div>

                  {/* Right — Description & Rules */}
                  <div className="lg:col-span-8 p-8 md:p-10 space-y-8">
                    {/* Description */}
                    <div>
                      <p className="text-foreground/90 text-base md:text-lg leading-relaxed">
                        {game.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* How to play */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className={game.accentText} />
                          <h4 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">
                            Cara Bermain
                          </h4>
                        </div>
                        <div className="space-y-2.5">
                          {game.howToPlay.map((step, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <div
                                className={`flex-shrink-0 w-6 h-6 rounded-lg bg-gradient-to-br ${game.accentFrom} ${game.accentTo} flex items-center justify-center text-white text-[10px] font-black shadow-md`}
                              >
                                {i + 1}
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed pt-0.5">
                                {step}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Prizes */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Star size={14} className={game.accentText} />
                          <h4 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">
                            Hadiah
                          </h4>
                        </div>
                        <div className="space-y-2.5">
                          {game.prizes.map((prize, i) => (
                            <div
                              key={i}
                              className="bg-muted/30 border border-border/50 rounded-xl p-3 hover:bg-muted/50 transition-colors"
                            >
                              <p
                                className={`text-xs font-black uppercase tracking-wider mb-0.5 ${prize.color}`}
                              >
                                {prize.tier}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {prize.desc}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom notice */}
        <div className="text-center pt-8">
          <div className="inline-flex items-center gap-2 bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl px-6 py-3 shadow-lg">
            <Sparkles size={14} className="text-primary" />
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
              Semua permainan menggunakan{" "}
              <span className="text-primary">Nismara Coin (NC)</span> sebagai
              mata uang. Kamu harus menjadi{" "}
              <span className="text-foreground">Driver terdaftar</span> untuk
              bermain.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
