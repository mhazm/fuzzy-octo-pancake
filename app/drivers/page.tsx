import { Metadata } from "next";
import clientPromise from "@/lib/mongodb";
import { getCompanyMembersMap } from "@/lib/trucky";
import DriversClient from "./DriversClient";

export const metadata: Metadata = {
  title: "Daftar Driver & Anggota Armada",
  description:
    "Lihat daftar lengkap seluruh armada pengemudi profesional yang tergabung dalam Nismara Transport.",
  openGraph: {
    title: "Daftar Driver & Anggota Armada",
    description:
      "Lihat daftar lengkap seluruh armada pengemudi profesional yang tergabung dalam Nismara Transport.",
    url: "https://transport.nismara.web.id/drivers",
    siteName: "Nismara Transport",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "https://images.nismara.my.id/227300_188.jpg",
        width: 1200,
        height: 630,
        alt: "Daftar Driver Nismara Transport",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Daftar Driver & Anggota Armada",
    description:
      "Lihat daftar lengkap seluruh armada pengemudi profesional yang tergabung dalam Nismara Transport.",
    images: ["https://images.nismara.my.id/227300_188.jpg"],
  },
};

export const revalidate = 1800; // Cache 30 menit

export default async function DriversPage() {
  const client = await clientPromise;
  const db = client.db();
  const guildId = process.env.DISCORD_GUILD_ID;

  // Ambil data Trucky VTC resmi sebagai sumber utama (136 driver)
  const NISMARA_COMPANY_ID = process.env.TRUCKY_COMPANY_ID || "35643";
  const membersMap = await getCompanyMembersMap(Number(NISMARA_COMPANY_ID));
  const truckyMembers = Object.values(membersMap);

  // Fetch driverlinks dan webUsers untuk memperkaya data profil & badge Nismara+
  const driverLinks = await db
    .collection("driverlinks")
    .find({ guildId })
    .toArray();

  const userIds = driverLinks.map((link) => link.userId);
  const webUsers = await db
    .collection("users")
    .find({ discordId: { $in: userIds } })
    .toArray();

  const driverLinkByTruckyId = new Map<number, any>();
  for (const dl of driverLinks) {
    driverLinkByTruckyId.set(Number(dl.truckyId), dl);
  }

  const webUserByDiscordId = new Map<string, any>();
  for (const u of webUsers) {
    webUserByDiscordId.set(String(u.discordId), u);
  }

  // Map seluruh 136 anggota resmi Trucky VTC
  const drivers = truckyMembers.map((member: any) => {
    const link = driverLinkByTruckyId.get(Number(member.id));
    const webUser = link ? webUserByDiscordId.get(String(link.userId)) : null;

    // Role (Prioritaskan dari Trucky API, fallback ke users DB, fallback ke Trucky fallback)
    const truckyRoleName = member.role
      ? typeof member.role === "object"
        ? member.role?.name
        : member.role
      : null;
    const truckyRoleColor =
      member.role && typeof member.role === "object"
        ? member.role?.color
        : "#64748b";

    // Rank (Prioritaskan dari Trucky API, fallback ke users DB, fallback ke Trucky fallback)
    const truckyRankName = member.rank
      ? typeof member.rank === "object"
        ? member.rank?.name
        : member.rank
      : null;
    const truckyRankColor =
      member.rank && typeof member.rank === "object"
        ? member.rank?.color
        : "#64748b";

    return {
      truckyId: member.id,
      name:
        webUser?.name ||
        link?.truckyName ||
        member.name ||
        member.username ||
        "Unknown Driver",
      image:
        webUser?.image ||
        webUser?.avatarUrl ||
        member.avatar_url ||
        "https://cdn.truckyapp.com/public/default-avatar.png",
      role: truckyRoleName || webUser?.truckyRole || "Driver",
      roleColor: truckyRoleColor || webUser?.truckyRoleColor || "#64748b",
      rank: truckyRankName || webUser?.truckyRank || "Member",
      rankColor: truckyRankColor || webUser?.truckyRankColor || "#64748b",
      isNismaraPlus: webUser?.nismaraplus?.status === true,
      nismaraPlusStartedAt: webUser?.nismaraplus?.startedAt,
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
