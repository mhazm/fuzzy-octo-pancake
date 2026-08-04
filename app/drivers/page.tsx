import { Metadata } from "next";
import clientPromise from "@/lib/mongodb";
import { getCompanyMembersMap } from "@/lib/trucky";
import DriversClient from "./DriversClient";

export const metadata: Metadata = {
  title: "Daftar Driver - Nismara Transport",
  description:
    "Lihat daftar lengkap seluruh armada pengemudi yang tergabung dalam Nismara Transport.",
};

export const revalidate = 1800; // Cache 30 menit

export default async function DriversPage() {
  const client = await clientPromise;
  const db = client.db();
  const guildId = process.env.DISCORD_GUILD_ID;

  // Fetch driverlinks
  const driverLinks = await db
    .collection("driverlinks")
    .find({ guildId })
    .toArray();

  // Extract user IDs to fetch their details efficiently
  const userIds = driverLinks.map((link) => link.userId);

  // Fetch only users who are in driverlinks to get names, nismaraplus status, avatars, etc.
  const webUsers = await db
    .collection("users")
    .find({ discordId: { $in: userIds } })
    .toArray();

  // Ambil data Trucky menggunakan map cached
  const NISMARA_COMPANY_ID = process.env.TRUCKY_COMPANY_ID || "4138";
  const membersMap = await getCompanyMembersMap(Number(NISMARA_COMPANY_ID));

  // Map Data
  const drivers = driverLinks.map((link) => {
    const webUser = webUsers.find((u) => u.discordId === link.userId);
    const truckyData = membersMap[link.truckyId] || {};

    // Role (Prioritaskan dari Trucky API, fallback ke users DB, fallback ke Trucky fallback)
    const truckyRoleName = truckyData.role
      ? typeof truckyData.role === "object"
        ? truckyData.role.name
        : truckyData.role
      : null;
    const truckyRoleColor =
      truckyData.role && typeof truckyData.role === "object"
        ? truckyData.role.color
        : "#64748b";

    // Rank (Prioritaskan dari Trucky API, fallback ke users DB, fallback ke Trucky fallback)
    const truckyRankName = truckyData.rank
      ? typeof truckyData.rank === "object"
        ? truckyData.rank.name
        : truckyData.rank
      : null;
    const truckyRankColor =
      truckyData.rank && typeof truckyData.rank === "object"
        ? truckyData.rank.color
        : "#64748b";

    return {
      truckyId: link.truckyId,
      name:
        webUser?.name ||
        link.truckyName ||
        truckyData.username ||
        "Unknown Driver",
      image:
        webUser?.image ||
        webUser?.avatarUrl ||
        truckyData.avatar_url ||
        "https://cdn.truckyapp.com/public/default-avatar.png",
      role: truckyRoleName || webUser?.truckyRole || "Driver",
      roleColor: truckyRoleColor || webUser?.truckyRoleColor || "#64748b",
      rank: truckyRankName || webUser?.truckyRank || "Member",
      rankColor: truckyRankColor || webUser?.truckyRankColor || "#64748b",
      isNismaraPlus: webUser?.nismaraplus?.status === true,
    };
  });

  // Urutkan (sort) opsional: bisa berdasarkan Nismara+ lalu nama
  const sortedDrivers = drivers.sort((a, b) => {
    if (a.isNismaraPlus !== b.isNismaraPlus) {
      return a.isNismaraPlus ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <main className="min-h-screen pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-primary/20 rounded-2xl mb-4 border border-primary/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
            Driver Kebanggan{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
              Nismara
            </span>
          </h1>
          <p className="text-lg text-slate-300">
            Kenali lebih dekat para pengemudi tangguh yang menjadi ujung tombak
            Nismara Transport. Total {sortedDrivers.length} pengemudi siap
            mengantarkan kargo ke seluruh dunia.
          </p>
        </div>

        <DriversClient drivers={sortedDrivers} />
      </div>
    </main>
  );
}
