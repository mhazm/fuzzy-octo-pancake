import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  MapPin,
  Truck,
  ArrowLeft,
  Clock,
  Info,
  Users,
} from "lucide-react";
import JoinConvoyButton from "./JoinConvoyButton";

async function getConvoyDetails(uri: string) {
  const client = await clientPromise;
  const db = client.db();
  return await db.collection("convoylobby").findOne({ convoyUri: uri });
}

// Fungsi untuk mengambil data profil user dari partisipan
async function getParticipantsData(discordIds: string[]) {
  if (discordIds.length === 0) return [];
  const client = await clientPromise;
  const db = client.db();

  return await db
    .collection("users")
    .find({
      discordId: { $in: discordIds },
    })
    .toArray();
}

export default async function ConvoyDetailPage({
  params,
}: {
  params: Promise<{ uri: string }>;
}) {
  const { uri } = await params;
  const convoy = await getConvoyDetails(uri);

  if (!convoy) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  const isUserDriver = !!(session?.user?.isDriver && session?.user?.driverData);

  const currentTruckyId = session?.user?.driverData?.truckyId?.toString();
  const currentDiscordId = session?.user?.discordId?.toString();

  const isAlreadyJoined =
    convoy.partisipan?.some(
      (p: any) =>
        (currentTruckyId && p.truckyId === currentTruckyId) ||
        (currentDiscordId && p.discordId === currentDiscordId),
    ) || false;

  // Persiapkan pemetaan profil pengemudi yang bergabung
  const partisipanRaw = convoy.partisipan || [];
  const validDiscordIds = partisipanRaw
    .map((p: any) => p.discordId)
    .filter(Boolean);

  const participantsData = await getParticipantsData(validDiscordIds);
  const usersMap = new Map();
  participantsData.forEach((user) => {
    usersMap.set(user.discordId?.toString(), user);
  });

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isPast = new Date(convoy.meetupDate) < new Date();

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      <Link
        href="/convoy"
        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-foreground/50 hover:text-primary transition-colors bg-card/50 px-4 py-2.5 rounded-xl border border-border/50 w-fit backdrop-blur-sm"
      >
        <ArrowLeft size={14} /> Kembali ke Daftar
      </Link>

      <div className="glass-panel rounded-[2rem] relative overflow-hidden border border-border/50 shadow-2xl bg-card/40 mb-6">
        <div className="w-full h-48 md:h-72 bg-black/40 relative border-b border-border/50">
          {convoy.imageUrl ? (
            <img
              src={convoy.imageUrl}
              alt="Banner"
              className="w-full h-full object-cover opacity-80"
            />
          ) : (
            <div className="absolute inset-0 bg-linear-to-br from-primary/30 to-accent-sky/30"></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent"></div>

          <div className="absolute bottom-6 left-6 right-6 md:left-10 md:right-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-lg ${
                    convoy.gameId === "2"
                      ? "bg-accent-sky text-background"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {convoy.gameId === "2" ? "ATS" : "ETS2"}
                </span>
                <span className="bg-background/80 backdrop-blur-md text-foreground px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                  {convoy.typeConvoy}
                </span>
                {isPast && (
                  <span className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                    Sesi Berakhir
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white drop-shadow-xl">
                {convoy.convoyName}
              </h1>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-10">
          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 mb-8 text-foreground/80 leading-relaxed font-medium text-sm whitespace-pre-line">
            <Info className="w-5 h-5 text-primary mb-2 inline-block mr-2" />
            {convoy.description}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* Kolom Kiri */}
            <div className="flex flex-col gap-6 h-full">
              <div className="bg-black/10 border border-white/5 rounded-2xl p-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-accent-sky flex items-center gap-2 mb-5">
                  <MapPin size={16} /> Detail Ekspedisi
                </h3>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center pt-1">
                    <div className="w-3 h-3 rounded-full bg-accent-sky shadow-[0_0_10px_rgba(var(--color-accent-sky),0.5)]" />
                    <div className="w-0.5 h-14 bg-border/60" />
                    <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--color-primary),0.5)]" />
                  </div>
                  <div className="flex flex-col justify-between text-sm font-bold space-y-5">
                    <div>
                      <p className="text-foreground text-base">
                        {convoy.sourceCity || "Kota Asal"}
                      </p>
                      <p className="text-[10px] text-foreground/40 font-semibold uppercase tracking-wider mt-0.5">
                        {convoy.sourceCompany || "Perusahaan Asal"}
                      </p>
                    </div>
                    <div>
                      <p className="text-foreground text-base">
                        {convoy.destinationCity || "Kota Tujuan"}
                      </p>
                      <p className="text-[10px] text-foreground/40 font-semibold uppercase tracking-wider mt-0.5">
                        {convoy.destinationCompany || "Perusahaan Tujuan"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-black/10 border border-white/5 rounded-2xl p-6 text-sm flex-grow">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-accent-lilac flex items-center gap-2 mb-4">
                  <Truck size={16} /> Data Muatan
                </h3>
                <div className="space-y-3 font-semibold">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-foreground/50 text-xs">
                      Jenis Kargo
                    </span>
                    <span className="text-foreground text-right">
                      {convoy.cargoName || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-foreground/50 text-xs">
                      Bobot Tonase
                    </span>
                    <span className="text-foreground bg-card/50 px-2 py-1 rounded-md border border-border/50 text-xs font-black tracking-wider">
                      {convoy.cargoMass
                        ? `${convoy.cargoMass.toLocaleString("id-ID")} KG`
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-foreground/50 text-xs">
                      Estimasi Jarak
                    </span>
                    <span className="text-foreground text-accent-sky font-black tracking-wider">
                      {convoy.plannedDistanceKm
                        ? `${convoy.plannedDistanceKm} KM`
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Kolom Kanan */}
            <div className="flex flex-col gap-6 h-full">
              <div className="bg-black/10 border border-white/5 rounded-2xl p-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-5">
                  <Calendar size={16} /> Penjadwalan Sesi
                </h3>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-card/50 border border-border/50 rounded-xl">
                      <Clock className="w-5 h-5 text-foreground/60" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">
                        Jadwal Kumpul (Meetup)
                      </p>
                      <p className="text-sm font-bold text-foreground">
                        {convoy.meetupDate
                          ? `${formatDate(convoy.meetupDate)}`
                          : "TBD"}
                      </p>
                      <p className="text-lg font-black text-primary">
                        {convoy.meetupDate
                          ? `${formatTime(convoy.meetupDate)} WIB`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-card/50 border border-border/50 rounded-xl">
                      <Truck className="w-5 h-5 text-foreground/60" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">
                        Jadwal Berangkat (Start)
                      </p>
                      <p className="text-sm font-bold text-foreground">
                        {convoy.startDate
                          ? `${formatDate(convoy.startDate)}`
                          : "TBD"}
                      </p>
                      <p className="text-lg font-black text-accent-sky">
                        {convoy.startDate
                          ? `${formatTime(convoy.startDate)} WIB`
                          : ""}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-black/20 border border-border/80 rounded-2xl p-8 flex flex-col justify-center items-center text-center space-y-5 flex-grow mt-auto shadow-inner">
                <div className="space-y-1">
                  <h4 className="font-black text-foreground text-3xl">
                    {partisipanRaw.length}
                  </h4>
                  <p className="text-[10px] font-bold text-foreground/50 uppercase tracking-widest">
                    Pengemudi Tergabung
                  </p>
                </div>

                <div className="w-full pt-2">
                  <JoinConvoyButton
                    convoyId={convoy._id.toString()}
                    isLoggedIn={!!session}
                    isDriver={isUserDriver}
                    isJoined={isAlreadyJoined}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEKSI DAFTAR PARTISIPAN BARU */}
      {partisipanRaw.length > 0 && (
        <div className="glass-panel p-6 md:p-8 rounded-[2rem] border-border/50 bg-card/20 shadow-xl mt-8">
          <h2 className="text-lg font-black text-foreground mb-6 flex items-center gap-2 border-b border-border/40 pb-4">
            <Users className="text-accent-sky w-5 h-5" /> Barisan Pengemudi
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {partisipanRaw.map((p: any, idx: number) => {
              // Ambil data user dari Map yang sudah kita fetch sebelumnya
              const userDetail = usersMap.get(p.discordId?.toString());

              return (
                <Link
                  href={`/profile/${p.truckyId}`}
                  key={idx}
                  className="flex items-center gap-4 bg-black/20 hover:bg-primary/10 border border-white/5 hover:border-primary/40 p-4 rounded-2xl transition-all group"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-card border-2 border-border/50 group-hover:border-primary transition-colors shrink-0">
                    {userDetail?.image ? (
                      <img
                        src={userDetail.image}
                        alt={userDetail.name || "Driver"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary font-bold">
                        {(userDetail?.name || "D").charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {userDetail?.name || "Driver Nismara"}
                    </p>
                    <p className="text-[10px] font-semibold text-foreground/50 uppercase tracking-widest truncate mt-0.5">
                      Trucky ID: {p.truckyId}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
