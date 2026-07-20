import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Timer,
  History,
  Users,
  Edit3,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

async function getConvoyData() {
  const client = await clientPromise;
  const db = client.db();
  return await db
    .collection("convoylobby")
    .find({})
    .sort({ meetupDate: -1 })
    .toArray();
}

export default async function ManageConvoyPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || session.user.role === "user") {
    redirect("/dashboard");
  }

  const convoys = await getConvoyData();
  const now = new Date();

  const upcoming = convoys.filter((c) => new Date(c.meetupDate) >= now);
  const past = convoys.filter((c) => new Date(c.meetupDate) < now);

  const getGameInfo = (id: string) => {
    return id === "2"
      ? { name: "ATS", color: "text-accent-sky", bg: "bg-accent-sky/10" }
      : { name: "ETS2", color: "text-accent-lilac", bg: "bg-accent-lilac/10" };
  };

  const getTypeColor = (type: string) => {
    return type?.toLowerCase() === "bulanan"
      ? "text-amber-500 border-amber-500/30"
      : "text-emerald-500 border-emerald-500/30";
  };

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* HEADER SECTION (Gaya Contract) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase italic">
            Convoy Management
          </h1>
          <p className="text-foreground/50 font-bold uppercase text-[10px] tracking-[0.2em]">
            Logistics Coordination • Fleet Control
          </p>
        </div>
        <Link
          href="/dashboard/manage/events/convoy/create"
          className="bg-primary text-primary-foreground px-8 py-4 rounded-[2rem] font-black uppercase tracking-tighter transition-all flex items-center gap-3 shadow-xl hover:scale-105 active:scale-95"
        >
          <Plus size={20} /> Create New Convoy
        </Link>
      </div>

      {/* UPCOMING CONVOYS TABLE */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-foreground uppercase italic flex items-center gap-2">
          <Timer className="text-accent-sky" size={20} /> Jadwal Mendatang
        </h2>

        <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-2xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-foreground/5 text-foreground/30 text-[10px] font-black uppercase tracking-widest border-b border-border">
              <tr>
                <th className="px-8 py-5">Game</th>
                <th className="px-8 py-5">Informasi Convoy</th>
                <th className="px-8 py-5">Jadwal Meetup</th>
                <th className="px-8 py-5">Drivers</th>
                <th className="px-8 py-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {upcoming.length > 0 ? (
                upcoming.map((convoy) => {
                  const game = getGameInfo(convoy.gameId);
                  const type = convoy.typeConvoy || "Mingguan";

                  return (
                    <tr
                      key={convoy._id.toString()}
                      className="hover:bg-foreground/[0.02] transition-all group"
                    >
                      <td className="px-8 py-5">
                        <span
                          className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border border-border ${game.color} ${game.bg}`}
                        >
                          {game.name}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <p className="font-black text-foreground uppercase text-base italic leading-none mb-1">
                          {convoy.convoyName}
                        </p>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-widest border rounded px-2 py-0.5 ${getTypeColor(type)}`}
                        >
                          Tipe: {type}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground">
                            {formatDate(convoy.meetupDate)} WIB
                          </span>
                          <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">
                            {convoy.sourceCity || "Unknown"} ➔{" "}
                            {convoy.destinationCity || "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2 font-black text-accent-sky">
                          <Users size={16} className="text-foreground/30" />
                          {convoy.partisipan?.length || 0}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/convoy/${convoy.convoyUri}`}
                            className="p-3 bg-foreground/5 hover:bg-accent-sky hover:text-background text-accent-sky rounded-2xl transition-all shadow-sm"
                            title="Lihat Detail"
                          >
                            <ExternalLink size={16} />
                          </Link>
                          <Link
                            href={`/dashboard/manage/events/convoy/edit/${convoy.convoyUri}`}
                            className="p-3 bg-foreground/5 hover:bg-primary hover:text-primary-foreground text-primary rounded-2xl transition-all shadow-sm"
                            title="Edit Convoy"
                          >
                            <Edit3 size={16} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-8 py-10 text-center text-foreground/30 font-black uppercase tracking-widest text-xs"
                  >
                    Tidak ada jadwal convoy mendatang.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAST CONVOYS HISTORY */}
      <div className="space-y-4 opacity-80 hover:opacity-100 transition-opacity">
        <h2 className="text-xl font-black text-foreground uppercase italic flex items-center gap-2">
          <History className="text-foreground/20" size={20} /> Riwayat Selesai
        </h2>

        <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-foreground/5 text-foreground/30 text-[10px] font-black uppercase tracking-widest border-b border-border">
              <tr>
                <th className="px-8 py-5">Game</th>
                <th className="px-8 py-5">Informasi Convoy</th>
                <th className="px-8 py-5">Drivers</th>
                <th className="px-8 py-5 text-right">Selesai Pada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {past.length > 0 ? (
                past.map((convoy) => {
                  const game = getGameInfo(convoy.gameId);
                  const type = convoy.typeConvoy || "Mingguan";

                  return (
                    <tr
                      key={convoy._id.toString()}
                      className="hover:bg-foreground/[0.02] transition-all"
                    >
                      <td className="px-8 py-5">
                        <span
                          className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border border-border ${game.color} ${game.bg}`}
                        >
                          {game.name}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <p className="font-black text-foreground uppercase">
                          {convoy.convoyName}
                        </p>
                        <p className="text-[10px] font-bold text-foreground/50 uppercase tracking-tighter mt-1">
                          {type}
                        </p>
                      </td>
                      <td className="px-8 py-5 tabular-nums">
                        <span className="font-black text-foreground/60">
                          {convoy.partisipan?.length || 0} Joined
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right flex flex-col items-end gap-2">
                        <span className="text-foreground/40 font-mono text-[10px] font-black uppercase">
                          {formatDate(convoy.meetupDate)}
                        </span>
                        <Link
                          href={`/convoy/${convoy.convoyUri}`}
                          className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-foreground/40 hover:text-foreground transition-colors"
                        >
                          Lihat Log <ChevronRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-8 py-8 text-center text-foreground/30 font-bold uppercase text-xs tracking-widest"
                  >
                    Belum ada riwayat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
