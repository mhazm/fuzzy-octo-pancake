import React from "react";
import { Metadata } from "next";
import clientPromise from "@/lib/mongodb";
import {
  Truck,
  Activity,
  History,
  Coins,
  XCircle,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Medal,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import ShareButton from "./ShareButton";
import UserBadges from "@/components/icons/UserBadges";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const client = await clientPromise;
  const db = client.db();

  const fleetData = await db
    .collection("fleets")
    .aggregate([
      { $match: { id: id } },
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
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "ownerInfo",
        },
      },
      { $unwind: { path: "$ownerInfo", preserveNullAndEmptyArrays: true } },
    ])
    .toArray();

  if (!fleetData || fleetData.length === 0) {
    return { title: "Truk Tidak Ditemukan" };
  }

  const fleet = fleetData[0];
  const title = `${fleet.customName || fleet.fleet_name || fleet.modelInfo?.name}`;
  const description = `Lihat profil armada epik pelat ${fleet.fleet_number} milik ${fleet.ownerInfo?.name || "Driver"} di ekosistem Nismara Transport.`;
  const image =
    fleet.customImage ||
    fleet.modelInfo?.photo_url ||
    "https://nismara.web.id/img/nismara_bg.png";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [image],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export const revalidate = 120;

export default async function PublicFleetProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const page = parseInt((resolvedSearchParams.page as string) || "1", 10);
  const limit = 5;
  const skip = (page - 1) * limit;

  const client = await clientPromise;
  const db = client.db();

  // Get fleet by truckyId (id) with Owner Info
  const fleetData = await db
    .collection("fleets")
    .aggregate([
      { $match: { id: id } },
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
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "ownerInfo",
        },
      },
      { $unwind: { path: "$ownerInfo", preserveNullAndEmptyArrays: true } },
    ])
    .toArray();

  if (!fleetData || fleetData.length === 0) {
    return notFound();
  }

  const fleet = fleetData[0];

  // Fetch paginated Job History
  const jobHistories = await db
    .collection("jobhistories")
    .find({ vehicleId: fleet.id, status: "completed" })
    .sort({ completedAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  const allJobsCount = await db
    .collection("jobhistories")
    .countDocuments({ vehicleId: fleet.id, status: "completed" });
  const cancelledJobsCount = await db
    .collection("jobhistories")
    .countDocuments({ vehicleId: fleet.id, status: "cancelled" });
  const totalPages = Math.ceil(allJobsCount / limit);

  // Calculate Revenue
  const revenueAggregation = await db
    .collection("jobhistories")
    .aggregate([
      { $match: { vehicleId: fleet.id, status: "completed" } },
      { $group: { _id: null, totalRevenue: { $sum: "$nc.total" } } },
    ])
    .toArray();
  const totalNCRevenue = revenueAggregation[0]?.totalRevenue || 0;

  // Components Data - Simplified for public
  const odometer = fleet.odometer || 0;
  const baseIntervals = fleet.modelInfo?.component_cost_unfix_wear || {
    engine: 45000,
    tires: 20000,
    transmission: 80000,
    brakes: 25000,
  };
  const thresholds = fleet.maintenance || baseIntervals;
  const wear = fleet.wear || {
    unfix_engine: 0,
    unfix_tires: 0,
    unfix_transmission: 0,
    unfix_brakes: 0,
  };

  const needsService =
    odometer >= thresholds.engine ||
    odometer >= thresholds.tires ||
    odometer >= thresholds.transmission ||
    odometer >= thresholds.brakes ||
    wear.unfix_engine >= 100 ||
    wear.unfix_tires >= 100 ||
    wear.unfix_transmission >= 100 ||
    wear.unfix_brakes >= 100;

  const activeOrder = await db.collection("fleetmaintenanceorders").findOne({
    fleetId: fleet._id,
    status: { $in: ["pending", "waiting", "in_service"] },
  });

  const isHealthy = !needsService && !activeOrder;

  return (
    <div className="min-h-screen bg-background">
      {/* Header Banner */}
      <div className="w-full bg-card border-b border-border/50 py-12 relative z-50">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-background to-transparent z-0" />

        {/* Owner Floating Card */}
        <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="flex items-center gap-6">
            {fleet.brandInfo?.logo_url ? (
              <div className="w-24 h-24 bg-background/80 backdrop-blur-md rounded-2xl border border-border/50 flex items-center justify-center p-3 shadow-xl">
                <img
                  src={fleet.brandInfo.logo_url}
                  alt={fleet.brandInfo.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-24 h-24 bg-background/80 backdrop-blur-md rounded-2xl border border-border/50 flex items-center justify-center shadow-xl">
                <Truck size={40} className="text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter drop-shadow-lg">
                {fleet.customName || fleet.modelInfo?.name}
              </h1>
              {fleet.customName && (
                <p className="text-muted-foreground font-bold uppercase text-xs tracking-wider mt-1">
                  Model Asli: {fleet.modelInfo?.name}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span className="bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                  Plat: {fleet.fleet_number}
                </span>
                <span className="text-muted-foreground font-bold uppercase text-[10px] tracking-[0.2em]">
                  ID: {fleet.id}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 w-full md:w-auto mt-4 md:mt-0 relative z-50">
            <ShareButton
              title={`${fleet.fleet_name} - Nismara Transport`}
              text={`Lihat truk epik ${fleet.fleet_number} di Nismara Transport!`}
            />

            {fleet.ownerInfo && (
              <Link
                href={`/profile/${fleet.ownerInfo.truckyId}`}
                className="flex items-center gap-3 bg-background/60 backdrop-blur-sm border border-border/50 rounded-full pl-2 pr-5 py-1.5 shadow-sm hover:bg-card hover:border-primary/50 transition-colors group/owner"
              >
                <img
                  src={fleet.ownerInfo.image || "/img/default_avatar.jpg"}
                  alt={fleet.ownerInfo.name}
                  className="w-8 h-8 rounded-full border border-primary/30 object-cover group-hover/owner:border-primary transition-colors"
                />
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">
                    Dimiliki Oleh
                  </span>
                  <span className="text-sm font-black text-foreground leading-tight flex items-center gap-1.5 group-hover/owner:text-primary transition-colors">
                    {fleet.ownerInfo.name}
                    <UserBadges
                      role={fleet.ownerInfo.discordRole || fleet.ownerInfo.role}
                      isManager={
                        fleet.ownerInfo.discordRole === "manager" ||
                        fleet.ownerInfo.discordRole === "admin" ||
                        fleet.ownerInfo.role === "manager"
                      }
                      isBooster={
                        fleet.ownerInfo.booster || fleet.ownerInfo.isBooster
                      }
                      isNismaraPlus={fleet.ownerInfo.nismaraplus?.status}
                      nismaraPlusStartedAt={
                        fleet.ownerInfo.nismaraplus?.startedAt
                      }
                      truckyRank={fleet.ownerInfo.truckyRank}
                      className="w-3.5 h-3.5"
                    />
                  </span>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8 py-10 animate-in fade-in duration-700">
        {/* TOP ROW: Image Showcase & Main Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Image Showcase */}
          <div className="lg:col-span-2 aspect-[16/9] relative bg-card border border-border/50 rounded-3xl flex items-center justify-center p-6 shadow-2xl overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />

            {/* Badges Overlay */}
            <div className="absolute top-6 left-6 z-30 flex flex-col gap-2">
              {odometer > 100000 && (
                <div className="bg-amber-500/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg flex items-center gap-2">
                  <Medal size={14} /> Veteran Truck
                </div>
              )}
              {totalNCRevenue > 1000000 && (
                <div className="bg-emerald-500/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg flex items-center gap-2">
                  <Coins size={14} /> Millionaire Maker
                </div>
              )}
            </div>

            {fleet.customImage || fleet.modelInfo?.photo_url ? (
              <img
                src={fleet.customImage || fleet.modelInfo?.photo_url}
                alt={fleet.modelInfo?.name || "Truk"}
                className="w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-20 group-hover:scale-110 transition-transform duration-[1500ms] ease-out"
              />
            ) : (
              <Truck size={80} className="text-muted-foreground/20 z-20" />
            )}

            {/* Vehicle Health Status */}
            <div className="absolute bottom-6 right-6 z-30">
              {isHealthy ? (
                <div className="bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg">
                  <ShieldCheck size={18} />
                  <span className="text-xs font-black uppercase tracking-wider">
                    Kondisi Prima 100%
                  </span>
                </div>
              ) : (
                <div className="bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-400 px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg animate-pulse">
                  <AlertTriangle size={18} />
                  <span className="text-xs font-black uppercase tracking-wider">
                    Perlu Servis
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Stats Summary */}
          <div className="lg:col-span-1 bg-card border border-border/50 rounded-3xl p-8 shadow-xl flex flex-col justify-center space-y-8 relative overflow-hidden">
            {/* Decorative Background Icon */}
            <Activity
              size={200}
              className="absolute -bottom-10 -right-10 text-primary/5 z-0"
            />

            <div className="relative z-10 space-y-6">
              <div>
                <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-1">
                  Total Jarak Tempuh
                </h3>
                <div className="text-4xl font-black text-foreground flex items-end gap-2">
                  {odometer.toLocaleString("id-ID")}{" "}
                  <span className="text-lg text-muted-foreground mb-1">KM</span>
                </div>
              </div>

              <div className="w-full h-px bg-border/50" />

              <div>
                <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-1">
                  Total Pendapatan
                </h3>
                <div className="text-3xl font-black text-emerald-500 flex items-end gap-2">
                  {totalNCRevenue.toLocaleString("id-ID")}{" "}
                  <span className="text-base font-bold mb-1">NC</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="bg-background/50 border border-border/50 rounded-2xl p-4 text-center">
                  <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                    Job Selesai
                  </span>
                  <span className="text-xl font-black text-primary">
                    {allJobsCount}
                  </span>
                </div>
                <div className="bg-background/50 border border-border/50 rounded-2xl p-4 text-center">
                  <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                    Job Batal
                  </span>
                  <span className="text-xl font-black text-red-500">
                    {cancelledJobsCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: Job History */}
        <div className="bg-card border border-border/50 rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
              <History size={24} className="text-primary" /> Riwayat Perjalanan
            </h2>

            {totalPages > 1 && (
              <div className="flex items-center gap-2 bg-background/50 border border-border/50 rounded-lg p-1">
                <Link
                  href={`?page=${Math.max(1, page - 1)}`}
                  className={`p-1.5 rounded-md ${page <= 1 ? "text-muted-foreground pointer-events-none" : "hover:bg-card text-foreground"}`}
                >
                  <ArrowLeft size={16} />
                </Link>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-3">
                  Hal {page} dari {totalPages}
                </span>
                <Link
                  href={`?page=${Math.min(totalPages, page + 1)}`}
                  className={`p-1.5 rounded-md ${page >= totalPages ? "text-muted-foreground pointer-events-none" : "hover:bg-card text-foreground"}`}
                >
                  <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>

          {jobHistories.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {jobHistories.map((job) => (
                <Link
                  href={`/jobs/${job.jobId || job._id}`}
                  key={job._id.toString()}
                  className="bg-background/40 border border-border/50 p-5 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-muted/30 hover:border-primary/30 transition-colors group block"
                >
                  <div className="flex-1">
                    <h3 className="font-black text-base md:text-lg text-foreground group-hover:text-primary transition-colors">
                      {job.sourceCity}{" "}
                      <span className="text-muted-foreground font-normal mx-1">
                        &rarr;
                      </span>{" "}
                      {job.destinationCity}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground uppercase tracking-wider font-bold">
                      <object>
                        <Link
                          href={`/cargo-market/${job.game?.toLowerCase().includes("american") ? "2" : "1"}/${job.cargoId}`}
                          className="bg-background px-2 py-1 rounded-md border border-border/50 hover:bg-card hover:text-primary transition-colors cursor-pointer"
                        >
                          {job.cargoName}
                        </Link>
                      </object>
                      <span>{job.distanceKm} KM</span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right flex flex-col justify-center">
                    <p className="font-black text-emerald-500 text-lg">
                      +{job.nc?.total?.toLocaleString("id-ID") || 0} NC
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">
                      {new Date(job.completedAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground bg-background/30 rounded-2xl border border-border/50 border-dashed">
              <History size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm font-black uppercase tracking-widest">
                Truk ini belum pernah berjalan
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
