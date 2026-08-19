import clientPromise from "@/lib/mongodb";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTruckyFullJobData, getCompanyMembersMap } from "@/lib/trucky";
import IncidentLogs from "@/components/IncidentLogs";
import AppealButton from "./AppealButton";
import {
  ArrowLeft,
  Truck,
  Navigation,
  Fuel,
  ShieldAlert,
  Gauge,
  Zap,
  AlertCircle,
  Boxes,
  Timer,
  Weight,
  User,
  Calendar,
  Clock,
  Coins,
  TrendingDown,
  CheckCircle,
  Star,
  HelpCircle,
} from "lucide-react";

// Helper Format Waktu (Durasi)
function formatDuration(seconds: number) {
  if (!seconds) return "-";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}j ${m}m ${s}d`;
  return `${m}m ${s}d`;
}

// Helper Waktu WIB
function formatWIB(dateInput: string | Date | undefined) {
  if (!dateInput) return "-";
  const d = new Date(dateInput);
  return d.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

// Komponen Render Bintang Hardcore
function HardcoreStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={14}
          className={
            star <= Math.round(rating)
              ? "fill-yellow-500 text-yellow-500"
              : "text-slate-300 dark:text-gray-600"
          }
        />
      ))}
      <span className="text-xs font-bold ml-2 text-foreground">
        {rating.toFixed(2)}
      </span>
    </div>
  );
}

export const revalidate = 600;

export default async function JobDetailPage(props: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await props.params;
  const client = await clientPromise;
  const db = client.db();

  const localJob = await db.collection("jobhistories").findOne({
    $or: [{ jobId: jobId }, { jobId: Number(jobId) }],
  });

  const trucky = await getTruckyFullJobData(jobId);

  if (!localJob && !trucky.details) notFound();

  const details = trucky.details || {};
  const events = trucky.events || [];
  const isCompleted =
    localJob?.jobStatus === "COMPLETED" || details?.status === "completed";

  const gameMode = localJob?.gameMode || "Unknown Lobby";

  // Check if there is an assigned trucky vehicle or Nismara fleet
  let internalFleet = null;
  const fleetObjId = localJob?.fleet_data?.fleet_id;
  const legacyVehicleId =
    localJob?.vehicleId || details?.vehicle?.id?.toString();

  if (fleetObjId || legacyVehicleId) {
    const matchQuery = fleetObjId
      ? { _id: fleetObjId }
      : { id: legacyVehicleId };

    internalFleet = await db
      .collection("fleets")
      .aggregate([
        { $match: matchQuery },
        {
          $lookup: {
            from: "fleetstores",
            localField: "model",
            foreignField: "_id",
            as: "modelInfo",
          },
        },
        { $unwind: { path: "$modelInfo", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "fleetbrands",
            localField: "modelInfo.brand",
            foreignField: "_id",
            as: "brandInfo",
          },
        },
        { $unwind: { path: "$brandInfo", preserveNullAndEmptyArrays: true } },
      ])
      .toArray();
    if (internalFleet && internalFleet.length > 0) {
      internalFleet = internalFleet[0];
    } else {
      internalFleet = null;
    }
  }

  // Kalkulasi Rata-rata Damage (Truk + Trailer + Kargo)
  const vDamage = details?.vehicle_damage || 0;
  const tDamage = details?.trailers_damage || 0;
  const cDamage = details?.cargo_damage || 0;
  const avgDamage = ((vDamage + tDamage + cDamage) / 3).toFixed(1);

  // Prioritas Data Driver
  const truckyId = localJob?.truckyId || details?.user_id;
  const discordId = localJob?.driverId;

  let driverName = `Driver #${discordId || truckyId}`;
  let driverAvatar = null;
  let driverRank = "Driver";
  let rankColor = "#6b7280";

  if (truckyId || discordId) {
    const mongoUser = await db.collection("users").findOne({
      $or: [
        { truckyId: truckyId },
        { truckyId: Number(truckyId) },
        { id: discordId },
        { discordId: discordId },
      ],
    });

    if (mongoUser && mongoUser.name) {
      driverName = mongoUser.name;
      driverAvatar = mongoUser.image || null;
      const membersMap = await getCompanyMembersMap(35643);
      const member = membersMap[Number(truckyId)];
      if (member) {
        driverRank = member.rank?.name || driverRank;
        rankColor = member.rank?.color || rankColor;
      }
    } else if (truckyId) {
      const membersMap = await getCompanyMembersMap(35643);
      const member = membersMap[Number(truckyId)];
      if (member) {
        driverName = member.username || member.name || driverName;
        driverAvatar = member.avatar_url || null;
        driverRank = member.rank?.name || driverRank;
        rankColor = member.rank?.color || rankColor;
      }
    }
  }

  // 1. Definisikan objek warna secara terpisah
  const statusMap = {
    COMPLETED:
      "text-green-600 bg-green-100 border-green-200 dark:text-green-400 dark:bg-green-400/10 dark:border-green-400/20",
    ONGOING:
      "text-blue-600 bg-blue-100 border-blue-200 dark:text-blue-400 dark:bg-blue-400/10 dark:border-blue-400/20 animate-pulse",
    CANCELED:
      "text-red-600 bg-red-100 border-red-200 dark:text-red-400 dark:bg-red-400/10 dark:border-red-400/20",
  };

  // 2. Ambil warnanya. TypeScript sekarang tidak akan protes.
  const statusColor =
    statusMap[localJob?.jobStatus as keyof typeof statusMap] ||
    "text-slate-600 bg-slate-100 border-slate-200 dark:text-gray-400 dark:bg-gray-400/10 dark:border-gray-400/20";

  const getLobbyInfo = (id: string) => {
    return id === "truckersmp"
      ? {
          name: "Truckers MP",
          color: "text-accent-sky",
          bg: "bg-accent-sky/10",
        }
      : {
          name: "SinglePlayer / Convoy",
          color: "text-accent-lilac",
          bg: "bg-accent-lilac/10",
        };
  };

  const gameLobby = getLobbyInfo(gameMode);

  return (
    <main className="min-h-screen pt-32 pb-20 px-4 bg-background transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        {/* Header & Status */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/jobs"
            className="flex items-center gap-2 text-slate-500 hover:text-primary font-bold text-sm transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Kembali ke Daftar Job
          </Link>
          <div className="flex items-center gap-3">
            <AppealButton jobId={jobId} driverId={discordId} />
            <div
              className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${statusColor}`}
            >
              {localJob?.jobStatus || details?.status || "UNKNOWN"}
            </div>
            <div
              className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${gameLobby.color}`}
            >
              {gameLobby.name}
            </div>
          </div>
        </div>

        {/* --- DRIVER & ROUTE INFO --- */}
        <div className="glass-panel p-8 lg:p-10 rounded-[3rem] border-primary/20 bg-card mb-8 relative overflow-hidden">
          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-slate-200 dark:border-white/5">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 dark:bg-card border-2 border-slate-200 dark:border-white/10 shrink-0">
              {driverAvatar ? (
                <img
                  src={driverAvatar}
                  alt={driverName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-white/5">
                  <User
                    size={24}
                    className="text-slate-400 dark:text-gray-500"
                  />
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
                Assigned Driver
              </p>
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                {driverName}
                <span
                  className="text-[9px] px-2 py-0.5 rounded uppercase tracking-wider border"
                  style={{
                    color: rankColor,
                    borderColor: `${rankColor}50`,
                    backgroundColor: `${rankColor}10`,
                  }}
                >
                  {driverRank}
                </span>
              </h3>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
            <div className="text-center lg:text-left">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">
                Source
              </p>
              <h2 className="text-3xl font-black text-foreground">
                {localJob?.sourceCity || details?.source_city}
              </h2>
              <p className="text-primary font-bold text-sm">
                {localJob?.sourceCompany || details?.source_company}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-full h-px bg-linear-to-r from-transparent via-primary/50 to-transparent relative">
                <Navigation className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-1" />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                {localJob?.game || details?.game_name || "Simulator"}
              </span>
            </div>

            <div className="text-center lg:text-right">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">
                Destination
              </p>
              <h2 className="text-3xl font-black text-foreground">
                {localJob?.destinationCity || details?.destination_city}
              </h2>
              <p className="text-primary font-bold text-sm">
                {localJob?.destinationCompany || details?.destination_company}
              </p>
            </div>
          </div>
        </div>

        {/* --- QUICK STATS GRID --- */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatBox
            icon={<Navigation className="text-blue-500 dark:text-blue-400" />}
            label={localJob?.statsType || "Distance"}
            value={`${(details?.real_distance || localJob?.plannedDistanceKm || 0).toLocaleString()} km`}
          />
          <StatBox
            icon={<Weight className="text-orange-500 dark:text-orange-400" />}
            label="Weight"
            value={`${localJob?.cargoMass || details?.cargo_weight || 0} T`}
          />
          <StatBox
            icon={<Clock className="text-yellow-500 dark:text-yellow-400" />}
            label="Duration"
            value={formatDuration(localJob?.durationSeconds)}
          />
          <StatBox
            icon={<Fuel className="text-green-500 dark:text-green-400" />}
            label="Fuel"
            value={`${details?.fuel_used_l?.toFixed(1) || 0} L`}
          />
          <StatBox
            icon={<ShieldAlert className="text-red-500 dark:text-red-400" />}
            label="Avg Damage"
            value={`${avgDamage}%`}
          />
          <StatBox
            icon={<CheckCircle className="text-primary" />}
            label="Market"
            value={localJob?.marketType?.split(" ")[0] || "-"}
          />
        </div>

        {/* --- MAIN CONTENT GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* --- FINANCIAL & PENALTY BREAKDOWN --- */}
            {isCompleted && (
              <>
                {(localJob?.nc || localJob?.ncCost) && (
                  <div className="glass-panel p-8 rounded-[2.5rem] border-primary/20 bg-card">
                    <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-3">
                      <Coins className="text-primary w-5 h-5" /> Rincian
                      Finansial (Nismara Coins)
                    </h3>
                    <div className="space-y-3">
                      <BreakdownRow
                        label="Base Earning"
                        value={localJob?.nc?.base}
                        color="text-green-600 dark:text-green-400"
                      />
                      <BreakdownRow
                        label="Special Contract Bonus"
                        value={localJob?.nc?.special}
                        color="text-yellow-600 dark:text-yellow-400"
                      />
                      <BreakdownRow
                        label="Hardcore Bonus"
                        value={localJob?.nc?.hardcore}
                        color="text-purple-600 dark:text-purple-400"
                      />
                      <BreakdownRow
                        label="Event Bonus"
                        value={localJob?.nc?.event}
                        color="text-blue-600 dark:text-blue-400"
                      />
                      <BreakdownRow
                        label="Nismara Plus Bonus"
                        value={localJob?.nc?.nismaraplus}
                        color="text-blue-600 dark:text-blue-400"
                      />
                      <BreakdownRow
                        label="Discord Booster Bonus"
                        value={localJob?.nc?.booster}
                        color="text-blue-600 dark:text-blue-400"
                      />

                      {/* Pengeluaran */}
                      <BreakdownRow
                        label="Biaya Sewa"
                        value={localJob?.ncCost?.rent}
                        isPenalty
                      />
                      <BreakdownRow
                        label="Biaya Servis"
                        value={localJob?.ncCost?.service}
                        isPenalty
                      />
                      <BreakdownRow
                        label="Biaya Bahan Bakar"
                        value={localJob?.ncCost?.fuel}
                        isPenalty
                      />
                      <BreakdownRow
                        label={
                          localJob?.fines_events &&
                          localJob.fines_events.length > 0 ? (
                            <div className="flex items-center gap-1 relative group cursor-help">
                              <span>Denda / Fines</span>
                              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-56 p-3 bg-slate-800 text-slate-200 text-xs rounded-xl shadow-2xl z-20 border border-slate-700">
                                <p className="font-bold text-white border-b border-slate-600 pb-1.5 mb-1.5">
                                  Rincian Denda:
                                </p>
                                <ul className="space-y-1">
                                  {localJob.fines_events.map(
                                    (fine: any, idx: number) => (
                                      <li
                                        key={fine._id || idx}
                                        className="flex justify-between items-center gap-2"
                                      >
                                        <span className="truncate">
                                          {fine.offenceName}
                                        </span>
                                        <span className="text-red-400 font-bold shrink-0">
                                          -{fine.amount}
                                        </span>
                                      </li>
                                    ),
                                  )}
                                </ul>
                              </div>
                            </div>
                          ) : (
                            "Denda / Fines"
                          )
                        }
                        value={localJob?.ncCost?.fines}
                        isPenalty
                      />

                      {/* Total Pengeluaran */}
                      <BreakdownRow
                        label="Penalti Menggunakan Kendaraan Harus di Services"
                        value={localJob?.maintenance_penalty}
                        isPenalty
                      />

                      {/* Diskon Pengeluaran */}
                      <BreakdownRow
                        label="Diskon Asuransi Servis"
                        value={localJob?.discount?.insurance}
                        color="text-green-600 dark:text-green-400"
                      />
                      <BreakdownRow
                        label="Diskon Nismara Plus"
                        value={localJob?.discount?.nismaraplus}
                        color="text-green-600 dark:text-green-400"
                      />

                      {/* Hasil Bersih */}
                      <div className="border-t border-slate-200 dark:border-white/10 pt-4 mt-4 flex justify-between items-center">
                        <span className="font-black text-foreground uppercase text-sm tracking-wider">
                          Pendapatan Bersih
                        </span>
                        <span
                          className={`text-3xl font-black ${
                            (localJob?.nc?.total || 0) -
                              (localJob?.ncCost?.total || 0) >=
                            0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {(localJob?.nc?.total || 0) -
                            (localJob?.ncCost?.total || 0) >=
                          0
                            ? "+"
                            : ""}
                          {(
                            (localJob?.nc?.total || 0) -
                            (localJob?.ncCost?.total || 0)
                          ).toLocaleString()}{" "}
                          NC
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Penalty Section */}
            {isCompleted && (
              <div>
                {(localJob?.penalty?.total || 0) > 0 ? (
                  <div className="glass-panel p-8 rounded-[2.5rem] border-orange-200 bg-orange-50 dark:border-orange-500/20 dark:bg-orange-500/5">
                    <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-3">
                      <AlertCircle className="text-orange-600 dark:text-orange-400 w-5 h-5" />{" "}
                      Penalti Poin (Pelanggaran)
                    </h3>
                    <div className="space-y-3">
                      <BreakdownRow
                        label="Vehicle Damage"
                        value={localJob?.penalty?.vehicle}
                        isPenalty
                      />
                      <BreakdownRow
                        label="Trailer Damage"
                        value={localJob?.penalty?.trailer}
                        isPenalty
                      />
                      <BreakdownRow
                        label="Cargo Damage"
                        value={localJob?.penalty?.cargo}
                        isPenalty
                      />
                      <BreakdownRow
                        label="Speeding Violations"
                        value={localJob?.penalty?.speed}
                        isPenalty
                      />
                      <BreakdownRow
                        label="Distance Issues"
                        value={localJob?.penalty?.distance}
                        isPenalty
                      />
                      <div className="border-t border-orange-200 dark:border-orange-500/20 pt-3 mt-3 flex justify-between items-center">
                        <span className="font-bold text-foreground uppercase text-xs">
                          Total Poin Penalti
                        </span>
                        <span className="text-2xl font-black text-orange-600 dark:text-orange-400">
                          +{localJob?.penalty?.total || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="glass-panel p-6 rounded-2xl border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/5 flex justify-center items-center gap-3">
                    <CheckCircle className="text-emerald-500 w-6 h-6" />
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      Pekerjaan bersih, tidak menghasilkan poin penalti.
                    </span>
                  </div>
                )}
              </div>
            )}
            <div className="glass-panel p-8 rounded-[2.5rem] border-slate-200 dark:border-white/5 bg-card">
              <h3 className="text-xl font-bold text-foreground mb-8 flex items-center gap-3">
                <AlertCircle className="text-red-500 dark:text-red-400 w-5 h-5" />{" "}
                Catatan Insiden
              </h3>
              <IncidentLogs events={events} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-panel p-8 rounded-[2.5rem] border-slate-200 dark:border-white/5 bg-card">
              <h3 className="text-lg font-bold text-foreground mb-6">
                Waktu Pengiriman
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 py-2 border-b border-slate-200 dark:border-white/5">
                  <Calendar className="text-slate-400 w-4 h-4" />
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">
                      Mulai
                    </p>
                    <p className="text-xs font-bold text-foreground">
                      {formatWIB(localJob?.startedAt || details?.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 py-2">
                  <Calendar className="text-slate-400 w-4 h-4" />
                  <div className="flex-1">
                    <p className="text-[10px] text-foreground/50 font-bold uppercase">
                      Selesai
                    </p>
                    <p className="text-xs font-bold text-foreground">
                      {formatWIB(localJob?.completedAt || details?.updated_at)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel p-8 rounded-[2.5rem] border-slate-200 dark:border-white/5 bg-card">
              <h3 className="text-lg font-bold text-foreground mb-6">Mode</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-white/5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">
                    Special Contract
                  </span>
                  <span
                    className={`text-xs font-black px-2 py-0.5 rounded ${localJob?.isSpecialContract ? "bg-primary/20 text-primary" : "bg-slate-100 dark:bg-white/5 text-slate-500"}`}
                  >
                    {localJob?.isSpecialContract ? "YES" : "NO"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">
                    Hardcore Mode
                  </span>
                  {localJob?.isHardcore ? (
                    <HardcoreStars rating={localJob.hardcoreRating || 0} />
                  ) : (
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500">
                      NO
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="glass-panel p-8 rounded-[2.5rem] border-slate-200 dark:border-white/5 bg-card">
              <h3 className="text-lg font-bold text-foreground mb-6">
                Detail Kendaraan
              </h3>
              <div className="space-y-4">
                {internalFleet ? (
                  <div className="flex flex-col mb-4">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">
                      Kendaraan
                    </span>
                    <Link
                      href={`/dashboard/fleet/${internalFleet.id}`}
                      className="text-primary hover:underline font-medium text-sm flex items-center gap-1 w-fit"
                    >
                      {internalFleet.brandInfo?.name || "-"}{" "}
                      {internalFleet.modelInfo?.name || ""}{" "}
                      <span className="text-xs font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded ml-1">
                        {internalFleet.fleet_number}
                      </span>
                    </Link>
                  </div>
                ) : (
                  <DetailItem
                    label="Kendaraan"
                    value={`${details?.vehicle_brand_name || "-"} ${details?.vehicle_model_name || ""}`}
                  />
                )}
                <DetailItem
                  label="Odometer Kendaraan"
                  value={
                    internalFleet
                      ? `${Math.round(internalFleet.odometer || 0).toLocaleString()} km`
                      : `${(details?.vehicle_odometer_end || 0).toLocaleString()} km`
                  }
                />
                <div className="flex flex-col mb-4">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">
                    Kargo
                  </span>
                  {details?.game_id && details?.cargo_id ? (
                    <Link
                      href={`/cargo-market/${details.game_id}/${details.cargo_id}`}
                      className="text-primary hover:underline font-medium text-sm w-fit"
                    >
                      {details.cargo_name || "Tidak diketahui"}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-slate-800 dark:text-white">
                      {details?.cargo_name || "Tidak diketahui"}
                    </span>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-slate-200 dark:border-white/5 space-y-3">
                  <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                    Rincian Damage
                  </h4>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 dark:text-gray-400 font-medium">
                      Truk Utama
                    </span>
                    <span
                      className={`${vDamage > 0 ? "text-red-500 dark:text-red-400" : "text-green-600 dark:text-green-400"} font-bold`}
                    >
                      {vDamage}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 dark:text-gray-400 font-medium">
                      Trailer
                    </span>
                    <span
                      className={`${tDamage > 0 ? "text-red-500 dark:text-red-400" : "text-green-600 dark:text-green-400"} font-bold`}
                    >
                      {tDamage}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 dark:text-gray-400 font-medium">
                      Muatan (Cargo)
                    </span>
                    <span
                      className={`${cDamage > 0 ? "text-red-500 dark:text-red-400" : "text-green-600 dark:text-green-400"} font-bold`}
                    >
                      {cDamage}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatBox({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="glass-panel p-5 rounded-3xl border-slate-200 dark:border-white/5 bg-card">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5">
          {icon}
        </div>
        <p className="text-[9px] text-slate-500 dark:text-gray-400 font-bold uppercase tracking-widest truncate">
          {label}
        </p>
      </div>
      <p className="text-xl font-black text-foreground truncate">{value}</p>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-200 dark:border-white/5 pb-2">
      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  color = "text-foreground",
  isPenalty = false,
}: {
  label: React.ReactNode;
  value: number;
  color?: string;
  isPenalty?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center text-sm border-b border-slate-200 dark:border-white/5 pb-2">
      <span className="text-slate-600 dark:text-gray-400">{label}</span>
      <span
        className={`font-bold ${isPenalty ? "text-red-600 dark:text-red-400" : color}`}
      >
        {isPenalty ? "-" : "+"}
        {value}{" "}
      </span>
    </div>
  );
}
