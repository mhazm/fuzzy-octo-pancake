// app/dashboard/manage/users/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import { getCompanyMembersMap } from "@/lib/trucky";
import ManageUsersTable from "./ManageUsersTable";
import { Users, UserCheck, UserMinus, Globe, Shield, User } from "lucide-react";

export default async function ManageUsersPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "manager") {
    redirect("/dashboard");
  }

  const client = await clientPromise;
  const db = client.db();
  const guildId = process.env.DISCORD_GUILD_ID;

  // 1. Fetch data secara paralel
  const [driverLinks, webUsers] = await Promise.all([
    db.collection("driverlinks").find({ guildId }).toArray(),
    db.collection("users").find({}).toArray(),
  ]);

  const membersMap = await getCompanyMembersMap(35643);

  // 2. Transformasi & Gabungkan Data
  const combinedData = driverLinks.map((link) => {
    const truckyData = membersMap[link.truckyId] || {};
    const webData = webUsers.find(
      (wu) => String(wu.truckyId) === String(link.truckyId),
    );

    return {
      id: link._id.toString(),
      truckyId: link.truckyId,
      discordId: link.userId || webData?.discordId,
      name:
        webData?.name || link.truckyName || truckyData.username || "Unknown",
      image: webData?.image || truckyData.avatar_url || null,
      role:
        typeof truckyData?.role === "object"
          ? truckyData.role.name
          : truckyData?.role || "Driver",
      isWebActive: !!webData,
      isOnLeave: webData?.isOnLeave || false,
      joinDate: truckyData.joinDate || link.createdAt,
    };
  });

  // 3. Perhitungan Statistik Berdasarkan Combined Data
  const stats = [
    {
      label: "Total Drivers",
      value: combinedData.length,
      icon: <Users size={24} />,
      color: "from-blue-600/20 to-blue-400/5",
      border: "border-blue-500/20",
      text: "text-blue-400",
    },
    {
      label: "Active Drivers",
      value: combinedData.filter((d) => !d.isOnLeave).length,
      icon: <UserCheck size={24} />,
      color: "from-emerald-600/20 to-emerald-400/5",
      border: "border-emerald-500/20",
      text: "text-emerald-400",
    },
    {
      label: "On Leave",
      value: combinedData.filter((d) => d.isOnLeave).length,
      icon: <UserMinus size={24} />,
      color: "from-orange-600/20 to-orange-400/5",
      border: "border-orange-500/20",
      text: "text-orange-400",
    },
    {
      label: "Web Registered",
      value: combinedData.filter((d) => d.isWebActive).length,
      icon: <Globe size={24} />,
      color: "from-accent-lilac/20 to-purple-400/5",
      border: "border-accent-lilac/20",
      text: "text-accent-lilac",
    },
  ];

  return (
    <main className="p-6 space-y-10 animate-in fade-in duration-700">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-lilac/10 rounded-lg text-accent-lilac">
              <Users size={20} />
            </div>
            <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase">
              Driver Management
            </h1>
          </div>
          <p className="text-foreground/40 font-bold uppercase text-[10px] tracking-[0.2em] ml-11">
            Nismara Transport • Management Driver
          </p>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div
            key={i}
            className={`glass-panel p-6 rounded-[2rem] border ${stat.border} bg-gradient-to-br ${stat.color} relative overflow-hidden group hover:scale-[1.02] transition-all duration-300`}
          >
            <div className="flex justify-between items-start relative z-10">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-foreground/40 uppercase tracking-widest">
                  {stat.label}
                </p>
                <p className="text-4xl font-black text-foreground italic tabular-nums">
                  {stat.value}
                </p>
              </div>
              <div
                className={`p-3 rounded-2xl bg-white/5 ${stat.text} group-hover:rotate-12 transition-transform`}
              >
                {stat.icon}
              </div>
            </div>
            {/* Background Accent */}
            <div
              className={`absolute -bottom-4 -right-4 w-24 h-24 blur-3xl opacity-20 bg-current ${stat.text}`}
            />
          </div>
        ))}
      </div>

      {/* TABLE SECTION */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <div className="h-px bg-white/10 flex-1" />
          <span className="text-[10px] font-black text-foreground/20 uppercase tracking-[0.3em]">
            Driver Directory
          </span>
          <div className="h-px bg-white/10 flex-1" />
        </div>
        <ManageUsersTable initialData={combinedData} />
      </div>
    </main>
  );
}
