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
  CalendarHeart,
  Crown,
  Edit3,
} from "lucide-react";
import JoinConvoyButton from "./JoinConvoyButton";
import ClaimRewardButton from "./ClaimRewardButton";
import EndConvoyButton from "./EndConvoyButton";
import UserBadges from "@/components/icons/UserBadges";





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
  const isManager = session?.user?.role === "manager" || session?.user?.role === "admin";

  const currentTruckyId = session?.user?.driverData?.truckyId?.toString();
  const currentDiscordId = session?.user?.discordId?.toString();

  const isAlreadyJoined = Boolean(
    session?.user &&
      convoy.partisipan?.some(
        (p: any) =>
          p.discordId === session.user.discordId ||
          p.truckyId === session.user.truckyId,
      ),
  );

  const participantData = session?.user ? convoy.partisipan?.find(
    (p: any) => p.discordId === session.user.discordId
  ) : null;
  const hasClaimed = Boolean(participantData?.claimedReward);

  // Persiapkan pemetaan profil pengemudi yang bergabung beserta panitia
  const partisipanRaw = convoy.partisipan || [];
  const interestedIds = convoy.interested || [];

  const allDiscordIds = Array.from(
    new Set([
      ...partisipanRaw.map((p: any) => p.discordId),
      ...interestedIds,
      convoy.setBy,
      convoy.roadCaptain,
      convoy.sweeper,
    ].filter(Boolean))
  );

  const allUsersData = await getParticipantsData(allDiscordIds);
  const usersMap = new Map();
  allUsersData.forEach((user) => {
    usersMap.set(user.discordId?.toString(), user);
  });

  const now = new Date().getTime();
  const startTime = new Date(convoy.meetupDate).getTime();
  const DURATION_MS = 2 * 60 * 60 * 1000;

  const isBeforeMeetup = now < startTime;
  const isPast = convoy.isEnded || now >= startTime + DURATION_MS;
  const isOngoing = !isPast && now >= startTime;

  const isInterested = currentDiscordId
    ? convoy.interested?.includes(currentDiscordId)
    : false;

  // Attendees diproses di atas

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Jakarta",
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    });
  };

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
                {isOngoing && (
                  <span className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider animate-pulse">
                    Sedang Berjalan
                  </span>
                )}
                {isPast && (
                  <span className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider">
                    Sesi Berakhir
                  </span>
                )}
                <span className="bg-white/20 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
                  {convoy.gameplayType || "Convoy Lobby"}
                  {convoy.gameplayType === "TruckersMP" && convoy.serverName ? ` - ${convoy.serverName}` : ""}
                  {convoy.gameplayType !== "TruckersMP" && convoy.lobbyId ? ` - ID: ${convoy.lobbyId}` : ""}
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white drop-shadow-xl">
                {convoy.convoyName}
              </h1>
            </div>
            {isManager && (
              <Link
                href={`/dashboard/manage/events/convoy/edit/${convoy.convoyUri}`}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shrink-0 mb-2 md:mb-0"
              >
                <Edit3 size={16} /> Edit Convoy
              </Link>
            )}
          </div>
        </div>

        <div className="p-6 md:p-10">
          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 mb-8 text-foreground/80 leading-relaxed font-medium text-sm whitespace-pre-line">
            <Info className="w-5 h-5 text-primary mb-2 inline-block mr-2" />
            {convoy.description}
          </div>

          {/* Grid Penanggung Jawab & Road Captain */}
          <div className={`grid grid-cols-1 md:grid-cols-2 ${convoy.sweeper ? 'lg:grid-cols-3' : ''} gap-6 mb-8`}>
            {/* Road Captain */}
            <div className="flex items-center gap-4 bg-black/10 border border-white/5 rounded-2xl p-5 hover:border-emerald-500/30 transition-colors">
              {convoy.roadCaptain && usersMap.has(convoy.roadCaptain) ? (
                <>
                  <Link href={`/profile/${usersMap.get(convoy.roadCaptain)?.truckyId || '#'}`} className="relative shrink-0 w-14 h-14 block hover:opacity-80 transition-opacity">
                    {usersMap.get(convoy.roadCaptain)?.image ? (
                      <img
                        src={usersMap.get(convoy.roadCaptain).image}
                        alt="Road Captain"
                        className="w-full h-full rounded-full object-cover border-2 border-emerald-500/50"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-black border-2 border-emerald-500/50">
                        {usersMap.get(convoy.roadCaptain)?.name?.charAt(0) || "R"}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-background">
                      <Crown size={12} />
                    </div>
                  </Link>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-0.5">
                      Road Captain
                    </p>
                    <div className="flex items-center gap-2">
                      <Link href={`/profile/${usersMap.get(convoy.roadCaptain)?.truckyId || '#'}`} className="text-base font-bold text-foreground hover:text-primary transition-colors">
                        {usersMap.get(convoy.roadCaptain)?.name}
                      </Link>
                      <UserBadges 
                        role={usersMap.get(convoy.roadCaptain)?.discordRole} 
                        isBooster={usersMap.get(convoy.roadCaptain)?.isBooster === true} 
                        isNismaraPlus={usersMap.get(convoy.roadCaptain)?.nismaraplus?.status === true} 
                        nismaraPlusStartedAt={usersMap.get(convoy.roadCaptain)?.nismaraplus?.startedAt}
                        truckyRank={usersMap.get(convoy.roadCaptain)?.truckyRank}
                        className="w-4 h-4" 
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3 text-foreground/40 italic">
                  <div className="w-14 h-14 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center">
                    <Users size={20} className="opacity-50" />
                  </div>
                  <div className="text-xs">Belum ada Road Captain</div>
                </div>
              )}
            </div>

            {/* Penanggung Jawab */}
            <div className="flex items-center gap-4 bg-black/10 border border-white/5 rounded-2xl p-5 hover:border-accent-lilac/30 transition-colors">
              {convoy.setBy && usersMap.has(convoy.setBy) ? (
                <>
                  <Link href={`/profile/${usersMap.get(convoy.setBy)?.truckyId || '#'}`} className="relative shrink-0 w-14 h-14 block hover:opacity-80 transition-opacity">
                    {usersMap.get(convoy.setBy)?.image ? (
                      <img
                        src={usersMap.get(convoy.setBy).image}
                        alt="Penanggung Jawab"
                        className="w-full h-full rounded-full object-cover border-2 border-accent-lilac/50"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-accent-lilac/20 flex items-center justify-center text-accent-lilac font-black border-2 border-accent-lilac/50">
                        {usersMap.get(convoy.setBy)?.name?.charAt(0) || "P"}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 bg-accent-lilac text-white p-1 rounded-full border-2 border-background">
                      <Crown size={12} />
                    </div>
                  </Link>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-accent-lilac mb-0.5">
                      Penanggung Jawab
                    </p>
                    <div className="flex items-center gap-2">
                      <Link href={`/profile/${usersMap.get(convoy.setBy)?.truckyId || '#'}`} className="text-base font-bold text-foreground hover:text-primary transition-colors">
                        {usersMap.get(convoy.setBy)?.name}
                      </Link>
                      <UserBadges 
                        role={usersMap.get(convoy.setBy)?.discordRole} 
                        isBooster={usersMap.get(convoy.setBy)?.isBooster === true} 
                        isNismaraPlus={usersMap.get(convoy.setBy)?.nismaraplus?.status === true} 
                        nismaraPlusStartedAt={usersMap.get(convoy.setBy)?.nismaraplus?.startedAt}
                        truckyRank={usersMap.get(convoy.setBy)?.truckyRank}
                        className="w-4 h-4" 
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3 text-foreground/40 italic">
                  <div className="w-14 h-14 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center">
                    <Users size={20} className="opacity-50" />
                  </div>
                  <div className="text-xs">Belum ada Penanggung Jawab</div>
                </div>
              )}
            </div>

            {/* Sweeper */}
            {convoy.sweeper && (
              <div className="flex items-center gap-4 bg-black/10 border border-white/5 rounded-2xl p-5 hover:border-sky-500/30 transition-colors">
                {usersMap.has(convoy.sweeper) ? (
                  <>
                    <Link href={`/profile/${usersMap.get(convoy.sweeper)?.truckyId || '#'}`} className="relative shrink-0 w-14 h-14 block hover:opacity-80 transition-opacity">
                      {usersMap.get(convoy.sweeper)?.image ? (
                        <img
                          src={usersMap.get(convoy.sweeper).image}
                          alt="Sweeper"
                          className="w-full h-full rounded-full object-cover border-2 border-sky-500/50"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-sky-500/20 flex items-center justify-center text-sky-500 font-black border-2 border-sky-500/50">
                          {usersMap.get(convoy.sweeper)?.name?.charAt(0) || "S"}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 bg-sky-500 text-white p-1 rounded-full border-2 border-background">
                        <Crown size={12} />
                      </div>
                    </Link>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-sky-500 mb-0.5">
                        Sweeper
                      </p>
                      <div className="flex items-center gap-2">
                        <Link href={`/profile/${usersMap.get(convoy.sweeper)?.truckyId || '#'}`} className="text-base font-bold text-foreground hover:text-primary transition-colors">
                          {usersMap.get(convoy.sweeper)?.name}
                        </Link>
                        <UserBadges 
                          role={usersMap.get(convoy.sweeper)?.discordRole} 
                          isBooster={usersMap.get(convoy.sweeper)?.isBooster === true} 
                          isNismaraPlus={usersMap.get(convoy.sweeper)?.nismaraplus?.status === true} 
                          nismaraPlusStartedAt={usersMap.get(convoy.sweeper)?.nismaraplus?.startedAt}
                          truckyRank={usersMap.get(convoy.sweeper)?.truckyRank}
                          className="w-4 h-4" 
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3 text-foreground/40 italic">
                    <div className="w-14 h-14 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center">
                      <Users size={20} className="opacity-50" />
                    </div>
                    <div className="text-xs">Sweeper tidak ditemukan</div>
                  </div>
                )}
              </div>
            )}
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
                        ? `${convoy.cargoMass.toLocaleString("id-ID")} Ton`
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

              {/* REWARD PANEL */}
              <div className="bg-black/10 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Crown size={64} className="text-emerald-500" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2 mb-4 relative z-10">
                  <Crown size={16} /> Informasi Hadiah (NC)
                </h3>
                <div className="space-y-3 font-semibold relative z-10">
                  <div className="flex justify-between items-center border-b border-emerald-500/10 pb-2">
                    <span className="text-emerald-100/50 text-xs">
                      Base Partisipan
                    </span>
                    <span className="text-emerald-400 font-black tracking-wider text-sm">
                      {convoy.rewards?.participantBase || (convoy.typeConvoy === "Bulanan" ? 2000 : 1000)} NC
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-emerald-500/10 pb-2">
                    <span className="text-emerald-100/50 text-xs">
                      Multiplier per Partisipan
                    </span>
                    <span className="text-emerald-400 font-black tracking-wider text-sm">
                      +{convoy.rewards?.participantMultiplier || 150} NC
                    </span>
                  </div>
                  {(convoy.rewards?.manager || 3000) > 0 && (
                    <div className="flex justify-between items-center border-b border-emerald-500/10 pb-2">
                      <span className="text-emerald-100/50 text-xs">
                        Bonus Manager
                      </span>
                      <span className="text-emerald-400 font-black tracking-wider text-sm">
                        {convoy.rewards?.manager || 3000} NC
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-100/50 text-xs">
                      Bonus Staff (RC / Sweeper)
                    </span>
                    <span className="text-emerald-400 font-black tracking-wider text-sm">
                      {convoy.rewards?.rc || 1500} NC
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

                <div className="w-full">
                  {!isPast ? (
                    <div className="w-full">
                      <JoinConvoyButton
                        convoyId={convoy._id.toString()}
                        isLoggedIn={!!session}
                        isDriver={isUserDriver}
                        isJoined={isAlreadyJoined}
                        isBeforeMeetup={isBeforeMeetup}
                        isInterested={isInterested}
                      />
                    </div>
                  ) : (
                    <div className="w-full flex flex-col gap-3">
                      <div className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-500 font-black uppercase text-xs rounded-xl text-center">
                        Sesi Sudah Berakhir
                      </div>
                      {isAlreadyJoined && (
                        <ClaimRewardButton convoyId={convoy._id.toString()} hasClaimed={hasClaimed} />
                      )}
                    </div>
                  )}
                  {/* End Convoy Button */}
                  {!isPast && (isManager || currentDiscordId === convoy.setBy || currentDiscordId === convoy.roadCaptain) && (
                    <div className="mt-4">
                      <EndConvoyButton convoyId={convoy._id.toString()} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEKSI DAFTAR ATTENDEES (SAYA INGIN HADIR) */}
      {interestedIds.length > 0 && (
        <div className="relative z-10 hover:z-50 glass-panel p-6 md:p-8 rounded-[2rem] border-border/50 bg-card/20 shadow-xl mt-8 transition-all">
          <h2 className="text-lg font-black text-foreground mb-6 flex items-center gap-2 border-b border-border/40 pb-4">
            <CalendarHeart className="text-emerald-500 w-5 h-5" /> Daftar Hadir
          </h2>

          <div className="flex flex-wrap gap-3">
            {interestedIds.map((discordId: string, idx: number) => {
              const userDetail = usersMap.get(discordId);
              const isRoadCaptain = convoy.roadCaptain === discordId;

              return (
                <Link
                  href={
                    userDetail?.truckyId
                      ? `/profile/${userDetail.truckyId}`
                      : "#"
                  }
                  key={idx}
                  className={`relative z-0 hover:z-50 flex items-center gap-2 px-4 py-2 rounded-xl border ${isRoadCaptain ? "bg-emerald-500/10 border-emerald-500/30" : "bg-black/20 border-white/5"} hover:border-primary transition-colors`}
                >
                  {userDetail?.image ? (
                    <img
                      src={userDetail.image}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">
                      {userDetail?.name?.charAt(0) || "?"}
                    </div>
                  )}
                  <span
                    className={`text-xs font-bold ${isRoadCaptain ? "text-emerald-400" : "text-foreground"}`}
                  >
                    {userDetail?.name || "Unknown"}
                  </span>
                  <UserBadges 
                    role={userDetail?.discordRole} 
                    isBooster={userDetail?.isBooster === true} 
                    isNismaraPlus={userDetail?.nismaraplus?.status === true} 
                    nismaraPlusStartedAt={userDetail?.nismaraplus?.startedAt}
                    truckyRank={userDetail?.truckyRank}
                    className="w-3 h-3 ml-0.5" 
                  />
                  {isRoadCaptain && (
                    <Crown size={12} className="text-emerald-400 ml-1" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* SEKSI DAFTAR PARTISIPAN BARU */}
      {partisipanRaw.length > 0 && (
        <div className="relative z-0 hover:z-50 glass-panel p-6 md:p-8 rounded-[2rem] border-border/50 bg-card/20 shadow-xl mt-8 transition-all">
          <h2 className="text-lg font-black text-foreground mb-6 flex items-center gap-2 border-b border-border/40 pb-4">
            <Users className="text-accent-sky w-5 h-5" /> Barisan Pengemudi
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {partisipanRaw.map((p: any, idx: number) => {
              const userDetail = usersMap.get(p.discordId?.toString());

              return (
                <div
                  key={idx}
                  className="relative z-0 hover:z-50 flex items-center gap-4 bg-black/20 border border-white/5 p-4 rounded-2xl group"
                >
                  {/* Avatar sebagai Link */}
                  <Link
                    href={`/profile/${p.truckyId}`}
                    className="w-12 h-12 rounded-full overflow-hidden bg-card border-2 border-border/50 hover:border-primary transition-colors shrink-0"
                  >
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
                  </Link>

                  <div className="flex-1 min-w-0">
                    {/* Nama sebagai Link */}
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/profile/${p.truckyId}`}
                        className="text-sm font-bold text-foreground truncate hover:text-primary transition-colors block"
                      >
                        {userDetail?.name || "Driver Nismara"}
                      </Link>
                      <UserBadges 
                        role={userDetail?.discordRole} 
                        isBooster={userDetail?.isBooster === true} 
                        isNismaraPlus={userDetail?.nismaraplus?.status === true} 
                        nismaraPlusStartedAt={userDetail?.nismaraplus?.startedAt}
                        truckyRank={userDetail?.truckyRank}
                        className="w-3.5 h-3.5 shrink-0" 
                      />
                    </div>

                    {/* Job ID sebagai Link */}
                    <p className="text-[10px] font-semibold text-foreground/50 uppercase tracking-widest truncate mt-0.5">
                      <Link
                        href={`/jobs/${p.jobId}`}
                        className="text-[10px] font-black uppercase text-primary hover:underline"
                      >
                        Job #{p.jobId}
                      </Link>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
