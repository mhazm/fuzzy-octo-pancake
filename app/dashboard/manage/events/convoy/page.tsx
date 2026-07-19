import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  PlusCircle,
  Calendar,
  Users,
  Edit3,
  ExternalLink,
  CheckCircle2,
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

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter">
            Manage Convoy
          </h1>
          <p className="text-foreground/50 text-sm">
            Kelola seluruh sesi convoy Nismara Transport.
          </p>
        </div>
        <Link
          href="/dashboard/manage/events/convoy/create"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
        >
          <PlusCircle size={18} /> Buat Convoy Baru
        </Link>
      </div>

      {/* Upcoming Table */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2 text-accent-sky">
          <Calendar size={20} /> Jadwal Mendatang ({upcoming.length})
        </h2>

        <div className="glass-panel rounded-2xl overflow-hidden border border-border/50">
          <table className="w-full text-left text-sm">
            <thead className="bg-card/50 text-foreground/40 uppercase text-[10px] font-black tracking-widest border-b border-border/50">
              <tr>
                <th className="px-6 py-4">Nama Convoy</th>
                <th className="px-6 py-4">Game</th>
                <th className="px-6 py-4">Waktu Meetup</th>
                <th className="px-6 py-4">Partisipan</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {upcoming.length > 0 ? (
                upcoming.map((convoy) => (
                  <tr
                    key={convoy._id.toString()}
                    className="hover:bg-primary/5 transition-colors group"
                  >
                    <td className="px-6 py-4 font-bold">{convoy.convoyName}</td>
                    <td className="px-6 py-4 font-medium text-foreground/60">
                      {convoy.gameId === "2" ? "ATS" : "ETS2"}
                    </td>
                    <td className="px-6 py-4 text-foreground/60">
                      {new Date(convoy.meetupDate).toLocaleString("id-ID")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-foreground/60">
                        <Users size={14} /> {convoy.partisipan?.length || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/convoy/${convoy.convoyUri}`}
                          className="p-2 bg-black/20 hover:bg-accent-sky/20 text-accent-sky rounded-lg transition-all"
                          title="Lihat Detail"
                        >
                          <ExternalLink size={16} />
                        </Link>
                        <Link
                          href={`/dashboard/manage/events/convoy/edit/${convoy.convoyUri}`}
                          className="p-2 bg-black/20 hover:bg-primary/20 text-primary rounded-lg transition-all"
                          title="Edit Convoy"
                        >
                          <Edit3 size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-foreground/30 font-medium"
                  >
                    Tidak ada convoy mendatang.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Past Table (Dibuat senada) */}
      <section className="space-y-4 opacity-70">
        <h2 className="text-lg font-bold flex items-center gap-2 text-foreground/60">
          <CheckCircle2 size={20} /> Riwayat Selesai ({past.length})
        </h2>

        <div className="glass-panel rounded-2xl overflow-hidden border border-border/50">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-border/30">
              {past.map((convoy) => (
                <tr
                  key={convoy._id.toString()}
                  className="hover:bg-foreground/5 transition-colors"
                >
                  <td className="px-6 py-4 font-bold text-foreground/70">
                    {convoy.convoyName}
                  </td>
                  <td className="px-6 py-4 text-foreground/50">
                    {new Date(convoy.meetupDate).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-6 py-4 text-foreground/50">
                    {convoy.partisipan?.length || 0} Drivers
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/convoy/${convoy.convoyUri}`}
                      className="text-foreground/40 hover:text-foreground underline"
                    >
                      Lihat Log
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
