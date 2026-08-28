import clientPromise from "@/lib/mongodb";
import { slugify } from "@/lib/utils";
import Link from "next/link";
import {
  FileText,
  Target,
  Users,
  Award,
  ChevronRight,
  ChevronLeft,
  Anchor,
  Truck,
  History,
  TrendingUp,
  Package,
  CheckCircle,
  Sparkles,
  Globe,
  SearchX,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { getCompanyMembersMap } from "@/lib/trucky";

export default async function SpecialContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const page = Math.max(1, parseInt((resolvedParams.page as string) || "1", 10));
  const limit = 4;
  const skip = (page - 1) * limit;

  const client = await clientPromise;
  const db = client.db();

  const guildId = process.env.DISCORD_GUILD_ID;

  // Ambil kontrak aktif (ongoing)
  const activeContracts = await db
    .collection("contracts")
    .find({ guildId, isActive: true })
    .toArray();

  // Ambil history kontrak, dengan paginasi
  const totalHistoryCount = await db.collection("contracts").countDocuments({ guildId, isActive: false });
  const totalPages = Math.ceil(totalHistoryCount / limit) || 1;
  const offset = (page - 1) * limit;

  const historyContracts = await db
    .collection("contracts")
    .find({ guildId, isActive: false })
    .sort({ endAt: -1 })
    .skip(offset)
    .limit(limit)
    .toArray();

  // =========================================================================
  // LOGIKA ENRICHMENT MVP DATA (Sinkronisasi Profil Driver Terpilih)
  // =========================================================================

  const mvpDiscordIds = historyContracts
    .map(
      (h) =>
        h.contributors?.sort((a: any, b: any) => b.totalNC - a.totalNC)[0]
          ?.driverId,
    )
    .filter(Boolean);

  // Menggunakan 'userId' sesuai struktur database Anda
  const driverLinks = await db
    .collection("driverlinks")
    .find({ userId: { $in: mvpDiscordIds } })
    .toArray();

  const discordToTruckyMap = driverLinks.reduce((acc: any, link: any) => {
    acc[link.userId] = link.truckyId;
    return acc;
  }, {});

  const NISMARA_COMPANY_ID = 35643;
  const membersMap = await getCompanyMembersMap(NISMARA_COMPANY_ID);

  const formatDate = (dateInput: any) => {
    if (!dateInput) return "-";
    const date = dateInput.$date
      ? new Date(dateInput.$date)
      : new Date(dateInput);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getGameName = (gameId: string) => {
    if (gameId === "1") return "Euro Truck Simulator 2";
    if (gameId === "2") return "American Truck Simulator";
    return "Truck Simulator";
  };

  return (
    <main className="min-h-screen pt-24 pb-20 bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/20 rounded-lg">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-sm font-bold text-primary uppercase tracking-widest">
              Global Assignment
            </h2>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-6">
            Special <span className="text-gradient">Contracts</span>
          </h1>
          <p className="text-gray-400 max-w-3xl text-lg leading-relaxed">
            Misi khusus dengan target kolektif. Selesaikan pengiriman ke tujuan
            yang ditentukan untuk mencatatkan nama armada Nismara di papan
            sejarah.
          </p>
        </div>

        {/* SECTION 1: KONTRAK AKTIF */}
        <section className="mb-24">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-2 h-8 bg-primary rounded-full" />
            <h2 className="text-2xl font-bold text-foreground">Kontrak Berjalan</h2>
          </div>

          {activeContracts.length === 0 ? (
            /* REWORKED EMPTY STATE: Desain Informatif & Elegan */
            <div className="relative glass-panel rounded-[3rem] p-12 overflow-hidden border-dashed border-primary/20 bg-primary/2">
              {/* Background Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center text-center max-w-xl mx-auto">
                <div className="w-20 h-20 rounded-3xl bg-card border border-border/50 flex items-center justify-center mb-6 shadow-2xl">
                  <ShieldAlert className="w-10 h-10 text-primary/50" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">
                  Belum ada Special Contract
                </h3>
                <p className="text-gray-400 leading-relaxed mb-8">
                  Saat ini tidak ada kontrak khusus yang sedang berlangsung. Tim
                  logistik kami sedang mengevaluasi rute baru dan mempersiapkan
                  penugasan berikutnya.
                </p>
                <div className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-black/20 border border-white/5">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-bold text-primary uppercase tracking-widest">
                    Sistem Memantau Aktivitas Kargo
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {activeContracts.map((contract) => (
                <Link
                  key={contract._id.toString()}
                  href={`/special-contracts/${slugify(contract.contractName)}`}
                  className="group"
                >
                  <div className="relative glass-panel rounded-[2.5rem] overflow-hidden border-primary/20 hover:border-primary/50 transition-all duration-500 shadow-2xl p-8 flex flex-col md:flex-row gap-8">
                    <div className="w-full md:w-48 h-48 rounded-3xl overflow-hidden bg-card border border-border/50 shrink-0">
                      <img
                        src={contract.imageUrl}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        alt={contract.contractName}
                      />
                    </div>
                    <div className="flex-1">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border mb-3 inline-block ${contract.gameId === "1" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : "bg-orange-500/10 text-orange-400 border-orange-500/30"}`}
                      >
                        {getGameName(contract.gameId)}
                      </span>
                      <h3 className="text-2xl font-bold text-foreground mb-1">
                        {contract.contractName}
                      </h3>
                      <p className="text-accent-sky font-medium mb-6 flex items-center gap-2 text-sm uppercase">
                        <Anchor className="w-4 h-4" /> {contract.companyName}
                      </p>
                      <div className="w-full py-4 bg-primary text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                        Detail Kontrak <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 2: ACHIEVEMENT HALL (RIWAYAT) */}
        <section>
          <div className="flex items-center gap-3 mb-10">
            <div className="p-2 bg-card rounded-lg border border-border">
              <History className="w-6 h-6 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              Special Contract History
            </h2>
          </div>

          <div className="space-y-8">
            {historyContracts.map((history) => {
              const topDriverRaw = history.contributors?.sort(
                (a: any, b: any) => b.totalNC - a.totalNC,
              )[0];

              // Mencocokkan data MVP dengan Trucky Profil
              const truckyId = discordToTruckyMap[topDriverRaw?.driverId];
              const truckyData = truckyId ? membersMap[Number(truckyId)] : null;
              const mvpName =
                truckyData?.name ||
                `Driver ${topDriverRaw?.driverId?.slice(-4)}`;
              const mvpAvatar = truckyData?.avatar_url || null;

              return (
                <div
                  key={history._id.toString()}
                  className="glass-panel rounded-[2.5rem] overflow-hidden hover:border-primary/50 transition-all duration-300 shadow-xl group"
                >
                  <Link
                    href={`/special-contracts/${slugify(history.contractName)}`}
                  >
                    <div className="p-6 md:p-8 pb-6 flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-border/40 bg-card/20">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${history.gameId === "1" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"}`}
                          >
                            <Globe className="w-3 h-3" />{" "}
                            {getGameName(history.gameId)}
                          </span>
                          <span className="text-[10px] text-gray-500 font-medium">
                            Selesai pada {formatDate(history.updatedAt || history.endAt)}
                          </span>
                        </div>
                        <h4 className="text-2xl font-extrabold text-foreground">
                          {history.contractName}
                        </h4>
                        <p className="text-accent-sky text-sm font-medium mt-1 uppercase tracking-wider">
                          {history.companyName}
                        </p>
                      </div>
                    </div>

                    <div className="p-6 md:p-8 bg-black/10 grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="text-center md:text-left">
                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">
                          Partisipan
                        </p>
                        <p className="text-xl font-bold text-foreground flex items-center justify-center md:justify-start gap-2">
                          <Users className="w-4 h-4 text-accent-sky" />{" "}
                          {history.contributors?.length || 0}
                        </p>
                      </div>
                      <div className="text-center md:text-left">
                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">
                          Total NC
                        </p>
                        <p className="text-xl font-bold text-foreground flex items-center justify-center md:justify-start gap-2">
                          <TrendingUp className="w-4 h-4 text-primary" />{" "}
                          {history.totalNCEarned?.toLocaleString("id-ID")}
                        </p>
                      </div>
                      <div className="text-center md:text-left">
                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">
                          Jarak Tempuh
                        </p>
                        <p className="text-xl font-bold text-foreground flex items-center justify-center md:justify-start gap-2">
                          <Truck className="w-4 h-4 text-accent-lilac" />{" "}
                          {history.totalDistance?.toLocaleString("id-ID")}km
                        </p>
                      </div>
                      <div className="text-center md:text-left">
                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">
                          Massa Kargo
                        </p>
                        <p className="text-xl font-bold text-foreground flex items-center justify-center md:justify-start gap-2">
                          <Package className="w-4 h-4 text-green-400" />{" "}
                          {history.totalMass?.toLocaleString("id-ID")}t
                        </p>
                      </div>
                    </div>

                    {topDriverRaw && (
                      <div className="p-6 md:px-8 border-t border-primary/10 bg-linear-to-r from-primary/10 to-transparent flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full border-2 border-primary overflow-hidden bg-card">
                              {mvpAvatar ? (
                                <img
                                  src={mvpAvatar}
                                  alt={mvpName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary font-bold">
                                  {mvpName.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1 shadow-lg">
                              <Sparkles className="w-2.5 h-2.5 text-black" />
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] text-primary font-bold uppercase tracking-widest flex items-center gap-1.5">
                              <Award className="w-3 h-3" /> MVP Contributor
                            </p>
                            <p className="text-lg font-bold text-foreground leading-tight">
                              {mvpName}
                            </p>
                          </div>
                        </div>
                        <div className="text-center sm:text-right">
                          <p className="text-xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-yellow-400 to-yellow-600">
                            +{topDriverRaw.totalNC.toLocaleString("id-ID")} NC
                          </p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase">
                            {topDriverRaw.jobs} Jobs Completed
                          </p>
                        </div>
                      </div>
                    )}
                  </Link>
                </div>
              );
            })}

            {/* KONTROL PAGINASI */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-12 mb-4">
                {page > 1 ? (
                  <Link
                    href={`/special-contracts?page=${page - 1}`}
                    className="p-3 bg-card border border-border rounded-xl hover:bg-muted transition-colors shadow-sm"
                  >
                    <ChevronLeft className="w-5 h-5 text-foreground" />
                  </Link>
                ) : (
                  <div className="p-3 bg-card border border-border rounded-xl opacity-50 cursor-not-allowed shadow-sm">
                    <ChevronLeft className="w-5 h-5 text-foreground" />
                  </div>
                )}
                
                <span className="text-sm font-bold text-foreground bg-card border border-border px-5 py-2.5 rounded-xl shadow-sm">
                  Halaman {page} dari {totalPages}
                </span>

                {page < totalPages ? (
                  <Link
                    href={`/special-contracts?page=${page + 1}`}
                    className="p-3 bg-card border border-border rounded-xl hover:bg-muted transition-colors shadow-sm"
                  >
                    <ChevronRight className="w-5 h-5 text-foreground" />
                  </Link>
                ) : (
                  <div className="p-3 bg-card border border-border rounded-xl opacity-50 cursor-not-allowed shadow-sm">
                    <ChevronRight className="w-5 h-5 text-foreground" />
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
