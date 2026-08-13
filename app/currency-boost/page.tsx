import clientPromise from "@/lib/mongodb";
import { Calendar, Clock, User, Zap, History, Sparkles } from "lucide-react";

export const revalidate = 300;

export default async function EventsPage() {
  const client = await clientPromise;
  const db = client.db();

  // 1. Ambil Event Aktif (Collection: ncevents)
  const activeEvents = await db.collection("ncevents").find({}).toArray();

  // 2. Ambil Riwayat Event (Collection: nceventhistories)
  const historyEvents = await db
    .collection("nceventhistories")
    .find({})
    .sort({ endDate: -1 })
    .limit(6)
    .toArray();

  const formatDate = (dateInput: any) => {
    if (!dateInput) return "-";
    const date = dateInput.$date
      ? new Date(dateInput.$date)
      : new Date(dateInput);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <main className="min-h-screen pt-24 pb-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" /> Nismara Special Program
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-(-foreground) mb-4">
            Event Nismara <span className="text-gradient">Transport</span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Ikuti berbagai event eksklusif untuk mendapatkan bonus Nismara Coins
          </p>
        </div>

        {/* Section 1: Active Events */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Zap className="w-6 h-6 text-green-400 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-primary">Event Aktif</h2>
          </div>

          {activeEvents.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl text-center border-dashed border-border">
              <p className="text-gray-500 italic">
                Saat ini tidak ada event yang sedang berlangsung. Tunggu kejutan
                berikutnya!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {activeEvents.map((event) => (
                <div
                  key={event._id.toString()}
                  className="group relative glass-panel rounded-3xl overflow-hidden border-primary/30 hover:border-primary transition-all duration-500 shadow-2xl"
                >
                  {/* Event Image */}
                  <div className="relative h-64 w-full overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
                    <img
                      src={event.imageUrl}
                      alt={event.nameEvent}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute top-4 right-4 z-20 px-4 py-2 rounded-xl bg-primary text-(-foreground) font-bold shadow-lg flex items-center gap-2">
                      <Zap className="w-4 h-4" /> {event.multiplier}x Bonus
                    </div>
                  </div>

                  {/* Event Content */}
                  <div className="p-8 relative z-20">
                    <h3 className="text-2xl font-bold text-(-foreground) mb-4 group-hover:text-primary transition-colors">
                      {event.nameEvent}
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Calendar className="w-4 h-4 text-accent-sky" />
                        <span>Mulai: {formatDate(event.setAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Clock className="w-4 h-4 text-accent-sky" />
                        <span>Selesai: {formatDate(event.endAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <User className="w-3 h-3" />
                        <span>Organizer ID: {event.setBy}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 2: History Events */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-card rounded-lg">
              <History className="w-6 h-6 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-(-foreground)">
              Riwayat Event
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {historyEvents.map((event) => (
              <div
                key={event._id.toString()}
                className="glass-panel rounded-2xl overflow-hidden group hover:-translate-y-1 transition-all duration-300"
              >
                <div className="relative h-40">
                  <div className="absolute inset-0 bg-black/40 grayscale group-hover:grayscale-0 transition-all" />
                  <img
                    src={event.imageUrl}
                    alt={event.nameEvent}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-card/80 backdrop-blur-md text-[10px] text-gray-300 border border-border">
                    Selesai
                  </div>
                </div>
                <div className="p-5">
                  <h4 className="font-bold text-(-foreground) mb-2 truncate">
                    {event.nameEvent}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{" "}
                      {formatDate(event.endDate)}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                      {event.multiplier}x Multiplier
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
