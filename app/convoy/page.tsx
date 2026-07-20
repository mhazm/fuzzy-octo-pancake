export const dynamic = "force-dynamic";

import Link from "next/link";
import clientPromise from "@/lib/mongodb";
import {
  Calendar,
  Users,
  MapPin,
  ArrowRight,
  Sparkles,
  Zap,
  History,
  Truck,
} from "lucide-react";

async function getConvoys() {
  const client = await clientPromise;
  const db = client.db();

  const convoys = await db
    .collection("convoylobby")
    .find({ active: true })
    .sort({ meetupDate: 1 })
    .toArray();

  return convoys;
}

export default async function ConvoyListingPage() {
  const convoys = await getConvoys();

  const now = new Date().getTime();
  const DURATION_MS = 2 * 60 * 60 * 1000; // 2 Jam

  const upcomingConvoys = convoys.filter((c) => {
    if (!c.meetupDate) return false;
    return new Date(c.meetupDate).getTime() > now;
  });

  const ongoingConvoys = convoys.filter((c) => {
    if (!c.meetupDate) return false;
    const startTime = new Date(c.meetupDate).getTime();
    return now >= startTime && now < startTime + DURATION_MS;
  });

  const pastConvoys = convoys.filter((c) => {
    if (!c.meetupDate) return false;
    const startTime = new Date(c.meetupDate).getTime();
    return now >= startTime + DURATION_MS;
  });

  const renderConvoyCard = (
    convoy: any,
    status: "upcoming" | "ongoing" | "past",
  ) => {
    const meetDate = new Date(convoy.meetupDate);
    const formattedDate = meetDate.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Jakarta",
    });
    const formattedTime = meetDate.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    });

    const isPast = status === "past";

    return (
      <div
        key={convoy._id.toString()}
        className={`group relative glass-panel rounded-3xl overflow-hidden border-border/50 hover:border-primary transition-all duration-500 shadow-2xl ${isPast ? "hover:-translate-y-1" : "hover:-translate-y-2"}`}
      >
        {/* Banner Area (Sesuai Style Event) */}
        <div className="relative h-60 w-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent z-10" />

          {convoy.imageUrl ? (
            <img
              src={convoy.imageUrl}
              alt={convoy.convoyName}
              className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${isPast ? "grayscale opacity-50" : ""}`}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent-sky/20 flex items-center justify-center">
              <Truck className="w-12 h-12 text-primary/30" />
            </div>
          )}

          {/* Badges Z-20 */}
          <div className="absolute top-4 left-4 z-20 flex gap-2">
            <span
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg ${convoy.gameId === "2" ? "bg-accent-sky text-background" : "bg-primary text-primary-foreground"}`}
            >
              {convoy.gameId === "2" ? "ATS" : "ETS2"}
            </span>
          </div>

          <div className="absolute top-4 right-4 z-20">
            <span
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg backdrop-blur-md ${
                status === "ongoing"
                  ? "bg-amber-500 text-white animate-pulse"
                  : status === "past"
                    ? "bg-card text-foreground/50 border border-border"
                    : "bg-green-500/90 text-white"
              }`}
            >
              {status === "ongoing"
                ? "Sedang Berjalan"
                : status === "past"
                  ? "Selesai"
                  : "Upcoming"}
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 md:p-8 relative z-20 -mt-6">
          <h3 className="text-2xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors line-clamp-1">
            {convoy.convoyName}
          </h3>
          <p className="text-sm text-foreground/60 mb-6 line-clamp-2 min-h-[2.5rem]">
            {convoy.description}
          </p>

          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-3 text-xs text-foreground/80 font-medium bg-card/50 p-3 rounded-xl border border-border/50 shadow-inner">
              <MapPin className="w-4 h-4 text-accent-sky" />
              <span className="truncate">
                {convoy.sourceCity || "Kota Asal"}
              </span>
              <ArrowRight className="w-3 h-3 text-foreground/40 shrink-0" />
              <span className="truncate">
                {convoy.destinationCity || "Kota Tujuan"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-foreground/80 font-medium bg-card/50 p-3 rounded-xl border border-border/50 shadow-inner">
              <Calendar className="w-4 h-4 text-accent-lilac" />
              <span>
                {formattedDate} •{" "}
                <span className="font-bold text-foreground">
                  {formattedTime} WIB
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-5 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground/60">
              <Users className="w-4 h-4 text-primary/70" />
              <span>{convoy.partisipan?.length || 0} Pengemudi</span>
            </div>
            <Link
              href={`/convoy/${convoy.convoyUri}`}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg ${
                isPast
                  ? "bg-card border border-border text-foreground/60 hover:text-foreground hover:border-foreground/30"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
              }`}
            >
              {isPast ? "Lihat Log" : "Detail Sesi"}
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen pt-24 pb-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section (Sama persis dengan Event Page) */}
        <div className="mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            <Truck className="w-4 h-4" /> Nismara Convoy Hub
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4">
            Jadwal Mabar <span className="text-gradient">Logistics</span>
          </h1>
          <p className="text-foreground/60 max-w-2xl mx-auto">
            Persiapkan trukmu dan bergabung dalam barisan pengiriman Nismara ke
            seluruh Eropa dan Amerika.
          </p>
        </div>

        <div className="space-y-20">
          {/* ONGOING CONVOYS */}
          {ongoingConvoys.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <Zap className="w-6 h-6 text-amber-500 animate-pulse" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  Sedang Berjalan
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {ongoingConvoys.map((c) => renderConvoyCard(c, "ongoing"))}
              </div>
            </section>
          )}

          {/* UPCOMING CONVOYS */}
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                Jadwal Mendatang
              </h2>
            </div>

            {upcomingConvoys.length === 0 ? (
              <div className="glass-panel p-12 rounded-3xl text-center border-dashed border-border/50">
                <p className="text-foreground/50 italic">
                  Belum ada jadwal convoy baru yang dipublikasikan. Stay tuned!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {upcomingConvoys.map((c) => renderConvoyCard(c, "upcoming"))}
              </div>
            )}
          </section>

          {/* PAST CONVOYS */}
          {pastConvoys.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-card border border-border/50 rounded-lg">
                  <History className="w-6 h-6 text-foreground/50" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  Riwayat Selesai
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 opacity-90">
                {pastConvoys.map((c) => renderConvoyCard(c, "past"))}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
