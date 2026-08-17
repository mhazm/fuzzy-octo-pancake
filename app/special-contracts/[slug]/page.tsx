import clientPromise from "@/lib/mongodb";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Target,
  Award,
  Truck,
  Package,
  Globe,
  Anchor,
  Crown,
  Sparkles,
  Users,
} from "lucide-react";
import { getCompanyMembersMap } from "@/lib/trucky";
import UserBadges from "@/components/icons/UserBadges";





export default async function ContractDetailPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  const client = await clientPromise;
  const db = client.db();

  // 1. Pencarian Kontrak dengan Regex Fleksibel (Menangani spasi/tanda hubung)
  const flexiblePattern = slug.split("-").join("[ -]");
  const query = {
    contractName: { $regex: new RegExp(`^${flexiblePattern}$`, "i") },
  };

  let contract = await db.collection("contracts").findOne(query);
  if (!contract) {
    contract = await db.collection("contracthistories").findOne(query);
  }

  if (!contract) {
    notFound();
  }

  const isHistory = !!contract.closedAt;
  const rawContributors = contract.contributors || [];

  // =========================================================================
  // 2. ENRICH DATA (Sinkronisasi Discord ID -> Trucky ID -> Profil API)
  // =========================================================================

  const discordIds = rawContributors.map((c: any) => c.driverId);

  // MENCARI DI DRIVERLINKS MENGGUNAKAN FIELD 'userId'
  const driverLinks = await db
    .collection("driverlinks")
    .find({ userId: { $in: discordIds } })
    .toArray();

  // Mapping Discord ID ke Trucky ID menggunakan field 'userId'
  const discordToTruckyMap = driverLinks.reduce((acc: any, link: any) => {
    acc[link.userId] = link.truckyId;
    return acc;
  }, {});

  const NISMARA_COMPANY_ID = 35643;
  const membersMap = await getCompanyMembersMap(NISMARA_COMPANY_ID);
  const mongoUsers = await db.collection("users").find({}).toArray();

  const contributors = rawContributors.map((contributor: any) => {
    const discordId = contributor.driverId;

    const mongoUser = mongoUsers.find((u: any) => {
      // 1. Coba cari berdasarkan Trucky ID
      if (
        contributor.truckyId &&
        (u.truckyId === contributor.truckyId ||
          u.truckyId === Number(contributor.truckyId))
      )
        return true;
      // 2. Coba cari berdasarkan Discord ID (driverId dari bot history)
      if (
        discordId &&
        (u.id === discordId ||
          u.discordId === discordId ||
          (u.image && u.image.includes(discordId)))
      )
        return true;
      return false;
    });

    const tId = discordToTruckyMap[contributor.driverId];
    const truckyData = tId ? membersMap[Number(tId)] : null;

    return {
      ...contributor,
      truckyId: tId || null,
      driverName:
        mongoUser?.name ||
        truckyData?.name ||
        `Driver ${contributor.driverId.slice(-4)}`,
      avatarUrl: mongoUser?.image || truckyData?.avatar_url || null,
      nismaraplus: mongoUser?.nismaraplus || null,
      discordRole: mongoUser?.discordRole || null,
      role: mongoUser?.role || null,
      serverBooster: mongoUser?.serverBooster || false,
      truckyRank: truckyData?.role?.name || truckyData?.role || null,
    };
  });

  return (
    <main className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/special-contracts"
          className="flex items-center gap-2 text-gray-500 hover:text-primary mb-8 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Kembali ke Daftar Special Contract
        </Link>

        {/* Hero Banner Kontrak */}
        <div className="glass-panel rounded-[3rem] overflow-hidden border-primary/20 mb-12 shadow-2xl relative">
          <div className="relative h-72 md:h-96 w-full">
            <img
              src={contract.imageUrl || "https://i.imgur.com/iMTOi8Z.png"}
              alt={contract.contractName}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-background via-background/20 to-transparent" />
            <div className="absolute bottom-8 left-8 right-8">
              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border shadow-lg ${
                    contract.gameId === "1"
                      ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                      : "bg-orange-500/20 text-orange-400 border-orange-500/30"
                  }`}
                >
                  <Globe className="w-3 h-3 inline mr-1" />
                  {contract.gameId === "1"
                    ? "Euro Truck Simulator 2"
                    : "American Truck Simulator"}
                </span>
                {isHistory && (
                  <span className="px-3 py-1 rounded-full bg-card/80 text-gray-400 text-[10px] font-bold border border-border uppercase">
                    Archive
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-md">
                {contract.contractName}
              </h1>
              <p className="text-accent-sky font-bold flex items-center gap-2 mt-2 uppercase tracking-widest text-sm">
                <Anchor className="w-4 h-4" /> {contract.companyName}
              </p>
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-card/20 backdrop-blur-md">
            <div className="flex flex-col items-center p-4 rounded-2xl bg-white/5 border border-white/10">
              <Users className="text-primary mb-2" />
              <p className="text-[10px] text-gray-500 font-bold uppercase">
                Partisipan
              </p>
              <p className="text-xl font-bold text-white">
                {contributors.length} Driver
              </p>
            </div>
            <div className="flex flex-col items-center p-4 rounded-2xl bg-white/5 border border-white/10">
              <Truck className="text-accent-sky mb-2" />
              <p className="text-[10px] text-gray-500 font-bold uppercase">
                Total Jarak
              </p>
              <p className="text-xl font-bold text-white">
                {(contract.totalDistance || 0).toLocaleString("id-ID")} km
              </p>
            </div>
            <div className="flex flex-col items-center p-4 rounded-2xl bg-white/5 border border-white/10">
              <Package className="text-green-500 mb-2" />
              <p className="text-[10px] text-gray-500 font-bold uppercase">
                Total Massa
              </p>
              <p className="text-xl font-bold text-white">
                {(contract.totalMass || 0).toLocaleString("id-ID")} t
              </p>
            </div>
          </div>
        </div>

        {/* Leaderboard Kontributor */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3 px-4">
            <Award className="text-yellow-500" />
            {isHistory ? "Final Rankings" : "Top Contributors"}
          </h2>

          <div className="grid gap-4">
            {contributors
              .sort((a: any, b: any) => b.totalNC - a.totalNC)
              .map((driver: any, index: number) => {
                const isTop = index === 0;
                return (
                  <Link
                    href={`/profile/${driver.truckyId}`}
                    key={driver.truckyId}
                    className="relative z-0 hover:z-50"
                  >
                    <div
                      key={driver.driverId}
                      className={`glass-panel p-4 md:p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:bg-white/[0.04] border-border/50 ${
                        isTop
                          ? "border-yellow-500/30 bg-yellow-500/[0.02] shadow-[0_0_30px_rgba(234,179,8,0.05)]"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-6 w-full md:w-auto">
                        <div
                          className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${
                            isTop
                              ? "bg-yellow-500 text-black shadow-yellow-500/40"
                              : "bg-card text-gray-500 border border-border"
                          }`}
                        >
                          {isTop ? <Crown className="w-6 h-6" /> : index + 1}
                        </div>

                        <div className="relative">
                          <div
                            className={`w-14 h-14 rounded-full border-2 overflow-hidden bg-card ${isTop ? "border-yellow-500" : "border-primary/20"}`}
                          >
                            {driver.avatarUrl ? (
                              <img
                                src={driver.avatarUrl}
                                alt={driver.driverName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold">
                                {driver.driverName.charAt(0)}
                              </div>
                            )}
                          </div>
                          {isTop && (
                            <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1 shadow-lg z-10">
                              <Sparkles className="w-3 h-3 text-black" />
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-lg font-bold text-white leading-tight">
                              {driver.driverName}
                            </p>
                            <div className="flex items-center gap-1">
                              <UserBadges 
                                isManager={driver.discordRole === "manager" || driver.role === "admin" || driver.role === "manager"}
                                isNismaraPlus={driver.nismaraplus?.status}
                                nismaraPlusStartedAt={driver.nismaraplus?.startedAt}
                                isBooster={driver.serverBooster}
                                truckyRank={driver.truckyRank}
                                className="w-5 h-5"
                              />
                            </div>
                          </div>
                          <p className="text-[10px] text-gray-500 font-mono mt-1">
                            {driver.truckyId
                              ? `Trucky ID: ${driver.truckyId}`
                              : `Discord ID: ${driver.driverId}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-border/40 pt-4 md:pt-0">
                        <div className="text-center md:text-right">
                          <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">
                            Performance
                          </p>
                          <p className="text-sm font-bold text-gray-300">
                            {driver.totalDistance.toLocaleString("id-ID")}km{" "}
                            <span className="text-gray-600">/</span>{" "}
                            {driver.totalMass}t
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-2xl font-black ${isTop ? "text-yellow-500" : "text-primary"}`}
                          >
                            +{driver.totalNC.toLocaleString("id-ID")}
                            <span className="text-xs ml-1 font-bold">NC</span>
                          </p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase">
                            {driver.jobs} Jobs Done
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>
      </div>
    </main>
  );
}
