import Link from "next/link";
import clientPromise from "@/lib/mongodb";
import { Calendar, Users, MapPin, ArrowRight } from "lucide-react";

async function getConvoys() {
  const client = await clientPromise;
  const db = client.db();

  // Menggunakan nama koleksi "convoylobby" huruf kecil
  const convoys = await db
    .collection("convoylobby")
    .find({ active: true })
    .sort({ meetupDate: 1 })
    .toArray();

  return convoys;
}

export default async function ConvoyListingPage() {
  const convoys = await getConvoys();
  const now = new Date();

  // Memisahkan convoy berdasarkan tanggal meetup
  const upcomingConvoys = convoys.filter((c) => new Date(c.meetupDate) >= now);
  const pastConvoys = convoys.filter((c) => new Date(c.meetupDate) < now);

  const renderConvoyCard = (convoy: any, isPast: boolean) => {
    const formattedDate = convoy.meetupDate
      ? new Date(convoy.meetupDate).toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Tanggal belum ditentukan";

    const formattedTime = convoy.meetupDate
      ? new Date(convoy.meetupDate).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    return (
      <div
        key={convoy._id.toString()}
        className="glass-panel rounded-2xl flex flex-col hover:-translate-y-1 transition-all duration-300 relative overflow-hidden border-border/50 shadow-lg group"
      >
        {/* Banner Image */}
        <div className="w-full h-40 bg-black/20 relative overflow-hidden border-b border-border/50">
          {convoy.imageUrl ? (
            <img
              src={convoy.imageUrl}
              alt={convoy.convoyName}
              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isPast ? "grayscale opacity-60" : ""}`}
            />
          ) : (
            <div className="absolute inset-0 bg-linear-to-br from-primary/20 to-accent-sky/20 flex items-center justify-center">
              <span className="text-foreground/30 font-bold tracking-widest uppercase text-xs">
                No Banner
              </span>
            </div>
          )}

          {/* Badge Game */}
          <div className="absolute top-4 left-4">
            <span
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-lg ${
                convoy.gameId === "2"
                  ? "bg-accent-sky text-background"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {convoy.gameId === "2" ? "ATS" : "ETS2"}
            </span>
          </div>

          {/* Badge Status */}
          <div className="absolute top-4 right-4">
            <span
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-lg backdrop-blur-md ${
                isPast
                  ? "bg-red-500/80 text-white"
                  : "bg-green-500/80 text-white"
              }`}
            >
              {isPast ? "Selesai" : "Upcoming"}
            </span>
          </div>
        </div>

        <div className="p-6 flex flex-col flex-1">
          <h2 className="text-xl font-black mb-2 text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {convoy.convoyName}
          </h2>
          <p className="text-sm text-foreground/60 mb-5 line-clamp-2 min-h-[2.5rem]">
            {convoy.description}
          </p>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-xs text-foreground/80 font-medium bg-black/10 p-2.5 rounded-xl border border-white/5">
              <MapPin className="w-4 h-4 text-accent-sky" />
              <span className="truncate">{convoy.sourceCity || "Unknown"}</span>
              <ArrowRight className="w-3 h-3 text-foreground/40" />
              <span className="truncate">
                {convoy.destinationCity || "Unknown"}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-foreground/80 font-medium bg-black/10 p-2.5 rounded-xl border border-white/5">
              <Calendar className="w-4 h-4 text-accent-lilac" />
              <span>
                {formattedDate} •{" "}
                <span className="font-bold text-foreground">
                  {formattedTime} WIB
                </span>
              </span>
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-border/40 flex justify-between items-center">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground/60">
              <Users className="w-4 h-4" />
              <span>{convoy.partisipan?.length || 0} Joined</span>
            </div>

            <Link
              href={`/convoy/${convoy.convoyUri}`}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg ${
                isPast
                  ? "bg-card border border-border text-foreground/60 hover:text-foreground"
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
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-black text-gradient uppercase tracking-tighter mb-2">
          Convoy Lobbies
        </h1>
        <p className="text-foreground/60 font-medium">
          Jadwal perjalanan bareng pengemudi Nismara Logistics.
        </p>
      </div>

      <div className="space-y-12">
        {/* UPCOMING CONVOYS */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">
              Jadwal Mendatang
            </h2>
            <div className="h-px bg-border flex-1"></div>
          </div>

          {upcomingConvoys.length === 0 ? (
            <div className="glass-panel p-10 rounded-3xl text-center border-dashed border-2 border-border/50">
              <p className="text-foreground/50 font-bold uppercase tracking-widest">
                Belum ada jadwal convoy baru.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingConvoys.map((c) => renderConvoyCard(c, false))}
            </div>
          )}
        </section>

        {/* PAST CONVOYS */}
        {pastConvoys.length > 0 && (
          <section className="opacity-80">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-xl font-black text-foreground/60 uppercase tracking-tight">
                Riwayat Selesai
              </h2>
              <div className="h-px bg-border/50 flex-1"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastConvoys.map((c) => renderConvoyCard(c, true))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
