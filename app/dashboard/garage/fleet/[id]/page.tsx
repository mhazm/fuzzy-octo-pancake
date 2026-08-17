import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import {
  Truck,
  Activity,
  AlertCircle,
  History,
  Wrench,
  Calendar,
  Coins,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import FleetMaintenanceClient from "./FleetMaintenanceClient";
import ToggleDriverClient from "./ToggleDriverClient";

export const metadata = {
  title: "Fleet Detail",
};



export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function FleetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    redirect("/auth/signin");
  }

  const client = await clientPromise;
  const db = client.db();

  const user = await db
    .collection("users")
    .findOne({ discordId: session.user.discordId });
  if (!user) redirect("/auth/signin");

  // --- AUTO MIGRATION UNTUK TRUK LAMA ---
  // Jika truk ini tidak memiliki atribut owner, jadikan driver saat ini sebagai owner-nya
  const fleetCheck = await db.collection("fleets").findOne({ id: id });
  if (fleetCheck && !fleetCheck.owner && fleetCheck.driver) {
    await db.collection("fleets").updateOne({ id: id }, { $set: { owner: fleetCheck.driver } });
  }
  // ---------------------------------------

  // Get fleet by truckyId (id)
  const fleetData = await db
    .collection("fleets")
    .aggregate([
      { $match: { id: id, $or: [{ driver: user._id }, { owner: user._id }] } },
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

  if (!fleetData || fleetData.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold">
          Fleet not found or you don't have access.
        </h1>
        <Link
          href="/dashboard/garage/fleet"
          className="text-primary mt-4 block"
        >
          &larr; Back to Fleet
        </Link>
      </div>
    );
  }

  const fleet = fleetData[0];

  const jobHistories = await db
    .collection("jobhistories")
    .find({ "fleet_data.fleet_id": fleet._id, status: "completed" })
    .sort({ completedAt: -1 })
    .limit(10)
    .toArray();

  const maintenanceHistories = await db
    .collection("fleetmaintenanceorders")
    .find({ fleetId: fleet._id, status: "completed" })
    .sort({ maintenanceEndAt: -1 })
    .limit(10)
    .toArray();

  const allJobsCount = await db
    .collection("jobhistories")
    .countDocuments({ "fleet_data.fleet_id": fleet._id, status: "completed" });

  // Calculate Revenue
  const revenueAggregation = await db
    .collection("jobhistories")
    .aggregate([
      { $match: { "fleet_data.fleet_id": fleet._id, status: "completed" } },
      { $group: { _id: null, totalRevenue: { $sum: "$nc.total" } } },
    ])
    .toArray();
  const totalNCRevenue = revenueAggregation[0]?.totalRevenue || 0;

  // Determine which parts need maintenance based on Odometer vs Maintenance Threshold
  const odometer = fleet.odometer || 0;

  // Base intervals from store (defaulting to safe values if not set)
  const baseIntervals = fleet.modelInfo?.component_cost_unfix_wear || {
    engine: 45000,
    tires: 20000,
    transmission: 80000,
    brakes: 25000,
  };

  // Cost to maintain from store
  const maintenanceCost = fleet.modelInfo?.component_cost_maintenance || {
    engine: 2000,
    tires: 500,
    transmission: 1500,
    brakes: 800,
  };

  const thresholds = fleet.maintenance || baseIntervals;

  const needsEngine = odometer >= thresholds.engine;
  const needsTires = odometer >= thresholds.tires;
  const needsTransmission = odometer >= thresholds.transmission;
  const needsBrakes = odometer >= thresholds.brakes;

  const wear = fleet.wear || {
    unfix_engine: 0,
    unfix_tires: 0,
    unfix_transmission: 0,
    unfix_brakes: 0,
  };

  const replaceCost = fleet.modelInfo?.component_cost_unfix_wear || {
    engine: 40000,
    tires: 30000,
    transmission: 60000,
    brakes: 40000,
  };

  const needsReplaceEngine = wear.unfix_engine >= 100;
  const needsReplaceTires = wear.unfix_tires >= 100;
  const needsReplaceTransmission = wear.unfix_transmission >= 100;
  const needsReplaceBrakes = wear.unfix_brakes >= 100;

  const isReplaceNeeded =
    needsReplaceEngine ||
    needsReplaceTires ||
    needsReplaceTransmission ||
    needsReplaceBrakes;
  const isMaintenanceNeeded =
    needsEngine || needsTires || needsTransmission || needsBrakes;

  const totalComponentCost = isReplaceNeeded
    ? (needsReplaceEngine ? replaceCost.engine : 0) +
      (needsReplaceTires ? replaceCost.tires : 0) +
      (needsReplaceTransmission ? replaceCost.transmission : 0) +
      (needsReplaceBrakes ? replaceCost.brakes : 0)
    : (needsEngine ? maintenanceCost.engine : 0) +
      (needsTires ? maintenanceCost.tires : 0) +
      (needsTransmission ? maintenanceCost.transmission : 0) +
      (needsBrakes ? maintenanceCost.brakes : 0);

  const adminFee = 500;
  const orderType = isReplaceNeeded ? "replace" : "maintenance";

  let serviceDuration = 0;
  if (isReplaceNeeded) {
    if (needsReplaceEngine) serviceDuration += 9;
    if (needsReplaceTires) serviceDuration += 3;
    if (needsReplaceTransmission) serviceDuration += 15;
    if (needsReplaceBrakes) serviceDuration += 3;
  } else {
    if (needsEngine) serviceDuration += 3;
    if (needsTires) serviceDuration += 1;
    if (needsTransmission) serviceDuration += 5;
    if (needsBrakes) serviceDuration += 1;
  }

  // Check if there is already an ongoing or pending maintenance order
  const activeOrder = await db.collection("fleetmaintenanceorders").findOne({
    fleetId: fleet._id,
    status: { $in: ["pending", "waiting", "in_service"] },
  });

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-10 pb-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Link
            href="/dashboard/garage/fleet"
            className="text-muted-foreground hover:text-primary flex items-center gap-2 mb-2 text-sm font-bold uppercase tracking-wider"
          >
            <ArrowLeft size={16} /> Kembali
          </Link>
          <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase italic flex items-center gap-3">
            {fleet.modelInfo?.name}
          </h1>
          <p className="text-foreground/40 font-bold uppercase text-[10px] tracking-[0.2em]">
            Plat: {fleet.fleet_number} • ID: {fleet.id}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {String(fleet.owner) === String(user._id) && (
            <ToggleDriverClient
              fleetId={fleet.id}
              isAssignedToMe={String(fleet.driver) === String(user._id)}
            />
          )}

          {activeOrder ? (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-6 py-3 rounded-xl flex items-center gap-3">
              <Wrench size={20} className="animate-pulse" />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest">
                  Status Servis
                </p>
                <p className="text-sm font-black uppercase">
                  {activeOrder.status === "pending"
                    ? "Menunggu Konfirmasi Manager"
                    : activeOrder.status === "waiting"
                      ? "Dalam Daftar Tunggu (Garasi)"
                      : "Sedang Diservis"}
                </p>
                {activeOrder.status === "in_service" &&
                  activeOrder.maintenanceEndAt && (
                    <p className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">
                      Estimasi Selesai:{" "}
                      {new Date(
                        activeOrder.maintenanceEndAt,
                      ).toLocaleDateString("id-ID")}
                    </p>
                  )}
              </div>
            </div>
          ) : isReplaceNeeded || isMaintenanceNeeded ? (
            <FleetMaintenanceClient
              fleetId={fleet._id.toString()}
              needsEngine={isReplaceNeeded ? needsReplaceEngine : needsEngine}
              needsTires={isReplaceNeeded ? needsReplaceTires : needsTires}
              needsTransmission={
                isReplaceNeeded ? needsReplaceTransmission : needsTransmission
              }
              needsBrakes={isReplaceNeeded ? needsReplaceBrakes : needsBrakes}
              totalComponentCost={totalComponentCost}
              adminFee={adminFee}
              serviceDuration={serviceDuration}
              thresholds={thresholds}
              odometer={odometer}
              orderType={orderType}
            />
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-6 py-3 rounded-xl flex items-center gap-3">
              <Activity size={20} />
              <p className="text-sm font-black uppercase tracking-wider">
                Kondisi Prima
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COL: Stats & Parts */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <Activity size={18} className="text-primary" /> Ringkasan
              Kendaraan
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-border/30">
                <span className="text-muted-foreground text-sm font-bold uppercase">
                  Odometer
                </span>
                <span className="font-black text-lg">
                  {odometer.toLocaleString("id-ID")} km
                </span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-border/30">
                <span className="text-muted-foreground text-sm font-bold uppercase">
                  Total Job Selesai
                </span>
                <span className="font-black text-lg">{allJobsCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm font-bold uppercase flex items-center gap-1">
                  <Coins size={14} /> Total Revenue
                </span>
                <span className="font-black text-lg text-emerald-500">
                  {totalNCRevenue.toLocaleString("id-ID")} NC
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <Wrench size={18} className="text-primary" /> Status Komponen
            </h2>
            <div className="space-y-4">
              {[
                {
                  name: "Mesin",
                  need: needsEngine,
                  limit: thresholds.engine,
                  cost: maintenanceCost.engine,
                },
                {
                  name: "Ban",
                  need: needsTires,
                  limit: thresholds.tires,
                  cost: maintenanceCost.tires,
                },
                {
                  name: "Transmisi",
                  need: needsTransmission,
                  limit: thresholds.transmission,
                  cost: maintenanceCost.transmission,
                },
                {
                  name: "Rem",
                  need: needsBrakes,
                  limit: thresholds.brakes,
                  cost: maintenanceCost.brakes,
                },
              ].map((part) => (
                <div
                  key={part.name}
                  className="bg-background/50 border border-border/50 p-4 rounded-xl"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold uppercase tracking-wider text-sm">
                      {part.name}
                    </span>
                    {part.need ? (
                      <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-1 rounded-full font-black uppercase">
                        Perlu Servis
                      </span>
                    ) : (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-1 rounded-full font-black uppercase">
                        OK
                      </span>
                    )}
                  </div>

                  <div className="w-full bg-secondary rounded-full h-2 mt-2 mb-1">
                    <div
                      className={`h-2 rounded-full ${part.need ? "bg-red-500" : "bg-primary"}`}
                      style={{
                        width: `${Math.min((odometer / part.limit) * 100, 100)}%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                    <span>
                      {odometer.toLocaleString("id-ID")} /{" "}
                      {part.limit.toLocaleString("id-ID")} KM
                    </span>
                    {part.need && (
                      <span className="text-red-400">
                        Biaya: {part.cost} NC
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <AlertCircle size={18} className="text-red-500" /> Tingkat
              Kerusakan (Wear)
            </h2>
            <div className="space-y-4">
              {[
                {
                  name: "Mesin",
                  wear: wear.unfix_engine,
                  cost: replaceCost.engine,
                },
                {
                  name: "Ban",
                  wear: wear.unfix_tires,
                  cost: replaceCost.tires,
                },
                {
                  name: "Transmisi",
                  wear: wear.unfix_transmission,
                  cost: replaceCost.transmission,
                },
                {
                  name: "Rem",
                  wear: wear.unfix_brakes,
                  cost: replaceCost.brakes,
                },
              ].map((part) => (
                <div
                  key={part.name}
                  className="bg-background/50 border border-border/50 p-4 rounded-xl"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold uppercase tracking-wider text-sm">
                      {part.name}
                    </span>
                    {part.wear >= 100 ? (
                      <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-1 rounded-full font-black uppercase animate-pulse">
                        Ganti Baru!
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-1 rounded-full font-black uppercase">
                        Aman
                      </span>
                    )}
                  </div>

                  <div className="w-full bg-secondary rounded-full h-2 mt-2 mb-1 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-1000 ${part.wear >= 100 ? "bg-red-500" : part.wear > 75 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(part.wear, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                    <span>{part.wear.toFixed(1)} / 100%</span>
                    {part.wear >= 100 && (
                      <span className="text-red-400">
                        Harga: {part.cost} NC
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COL: Job History & Image */}
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-[21/9] relative bg-card border border-border/50 rounded-2xl flex items-center justify-center p-6 shadow-lg overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent z-10" />
            {fleet.modelInfo?.photo_url ? (
              <img
                src={fleet.modelInfo.photo_url}
                alt={fleet.modelInfo.name}
                className="w-full h-full object-contain drop-shadow-2xl z-20 group-hover:scale-105 transition-transform duration-700"
              />
            ) : (
              <Truck size={64} className="text-muted-foreground/30 z-20" />
            )}
            {fleet.brandInfo?.logo_url && (
              <div className="absolute top-6 left-6 p-2 bg-background/80 backdrop-blur-sm rounded-lg border border-border/50 z-20">
                <img
                  src={fleet.brandInfo.logo_url}
                  alt={fleet.brandInfo.name}
                  className="h-6 w-auto object-contain"
                />
              </div>
            )}
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                <History size={18} className="text-primary" /> Riwayat Pekerjaan
                Terakhir
              </h2>
            </div>

            {jobHistories.length > 0 ? (
              <div className="space-y-3">
                {jobHistories.map((job) => (
                  <div
                    key={job._id.toString()}
                    className="bg-background/50 border border-border/50 p-4 rounded-xl flex justify-between items-center hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <h3 className="font-bold text-sm">
                        {job.sourceCity} &rarr; {job.destinationCity}
                      </h3>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        {job.cargoName} • {job.distanceKm} km
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-emerald-500 text-sm">
                        +{job.nc?.total?.toLocaleString("id-ID") || 0} NC
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                        {new Date(job.completedAt).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest">
                  Belum ada riwayat pekerjaan
                </p>
              </div>
            )}
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                <Wrench size={18} className="text-primary" /> Riwayat Servis &
                Penggantian
              </h2>
            </div>

            {maintenanceHistories.length > 0 ? (
              <div className="space-y-3">
                {maintenanceHistories.map((order) => {
                  const isReplace = order.type === "replace";
                  const parts = [];
                  if (order.components?.engine) parts.push("Mesin");
                  if (order.components?.tires) parts.push("Ban");
                  if (order.components?.transmission) parts.push("Transmisi");
                  if (order.components?.brakes) parts.push("Rem");

                  return (
                    <div
                      key={order._id.toString()}
                      className="bg-background/50 border border-border/50 p-4 rounded-xl flex justify-between items-center hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <h3 className="font-bold text-sm flex items-center gap-2">
                          {isReplace ? "🔄 Ganti Baru" : "🔧 Servis Rutin"}
                        </h3>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                          {parts.join(", ")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-red-500 text-sm">
                          -{order.totalPrice?.toLocaleString("id-ID") || 0} NC
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                          {order.maintenanceEndAt
                            ? new Date(
                                order.maintenanceEndAt,
                              ).toLocaleDateString("id-ID")
                            : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest">
                  Belum ada riwayat servis
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
