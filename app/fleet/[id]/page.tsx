import React from "react";
import clientPromise from "@/lib/mongodb";
import { Truck, Activity, AlertCircle, History, Wrench, Coins, XCircle, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 120;

export default async function PublicFleetProfilePage({ 
  params,
  searchParams 
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

  // Get fleet by truckyId (id)
  const fleetData = await db.collection("fleets").aggregate([
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
  ]).toArray();

  if (!fleetData || fleetData.length === 0) {
    return notFound();
  }

  const fleet = fleetData[0];

  // Fetch paginated Job History
  const jobHistories = await db.collection("jobhistories")
    .find({ vehicleId: fleet.id, status: "completed" })
    .sort({ completedAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  const allJobsCount = await db.collection("jobhistories").countDocuments({ vehicleId: fleet.id, status: "completed" });
  const cancelledJobsCount = await db.collection("jobhistories").countDocuments({ vehicleId: fleet.id, status: "cancelled" });
  const totalPages = Math.ceil(allJobsCount / limit);

  // Fetch Maintenance History for this vehicle
  const maintenanceHistories = await db.collection("fleetmaintenanceorders")
    .find({ fleetId: fleet._id, status: "completed" })
    .sort({ maintenanceEndAt: -1 })
    .limit(10)
    .toArray();
  
  // Calculate Revenue
  const revenueAggregation = await db.collection("jobhistories").aggregate([
    { $match: { vehicleId: fleet.id, status: "completed" } },
    { $group: { _id: null, totalRevenue: { $sum: "$nc.total" } } }
  ]).toArray();
  const totalNCRevenue = revenueAggregation[0]?.totalRevenue || 0;

  // Components Data
  const odometer = fleet.odometer || 0;
  
  const baseIntervals = fleet.modelInfo?.component_cost_unfix_wear || {
    engine: 45000, tires: 20000, transmission: 80000, brakes: 25000
  };
  
  const thresholds = fleet.maintenance || baseIntervals;
  const needsEngine = odometer >= thresholds.engine;
  const needsTires = odometer >= thresholds.tires;
  const needsTransmission = odometer >= thresholds.transmission;
  const needsBrakes = odometer >= thresholds.brakes;

  const wear = fleet.wear || {
    unfix_engine: 0, unfix_tires: 0, unfix_transmission: 0, unfix_brakes: 0
  };

  const activeOrder = await db.collection("fleetmaintenanceorders").findOne({
    fleetId: fleet._id,
    status: { $in: ["pending", "waiting", "in_service"] }
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header Banner */}
      <div className="w-full bg-card border-b border-border/50 py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-background to-transparent z-0" />
        <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            {fleet.brandInfo?.logo_url ? (
              <div className="w-20 h-20 bg-background/80 backdrop-blur-md rounded-2xl border border-border/50 flex items-center justify-center p-3 shadow-xl">
                <img src={fleet.brandInfo.logo_url} alt={fleet.brandInfo.name} className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-background/80 backdrop-blur-md rounded-2xl border border-border/50 flex items-center justify-center shadow-xl">
                <Truck size={32} className="text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter uppercase italic drop-shadow-lg">
                {fleet.modelInfo?.name}
              </h1>
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
          
          <div className="flex items-center gap-4">
            {activeOrder ? (
               <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-6 py-3 rounded-xl flex items-center gap-3 shadow-lg shadow-amber-500/5">
                 <Wrench size={20} className="animate-pulse" />
                 <div>
                   <p className="text-xs font-bold uppercase tracking-widest">Status Kendaraan</p>
                   <p className="text-sm font-black uppercase">
                     {activeOrder.status === 'in_service' ? 'Sedang Diservis' : 'Menunggu Servis'}
                   </p>
                 </div>
               </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-6 py-3 rounded-xl flex items-center gap-3 shadow-lg shadow-emerald-500/5">
                <Activity size={20} />
                <p className="text-sm font-black uppercase tracking-wider">Aktif & Beroperasi</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-10 py-10 animate-in fade-in duration-700">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COL: Stats & Parts */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity size={18} className="text-primary"/> Ringkasan Kendaraan
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-border/30">
                  <span className="text-muted-foreground text-sm font-bold uppercase">Odometer</span>
                  <span className="font-black text-lg">{odometer.toLocaleString("id-ID")} km</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-border/30">
                  <span className="text-muted-foreground text-sm font-bold uppercase">Job Selesai</span>
                  <span className="font-black text-lg text-emerald-500">{allJobsCount}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-border/30">
                  <span className="text-muted-foreground text-sm font-bold uppercase flex items-center gap-1"><XCircle size={14}/> Job Batal</span>
                  <span className="font-black text-lg text-red-500">{cancelledJobsCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm font-bold uppercase flex items-center gap-1"><Coins size={14}/> Total Revenue</span>
                  <span className="font-black text-lg text-emerald-500">{totalNCRevenue.toLocaleString("id-ID")} NC</span>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <Wrench size={18} className="text-primary"/> Status Komponen
              </h2>
              <div className="space-y-4">
                {[
                  { name: "Mesin", need: needsEngine, limit: thresholds.engine },
                  { name: "Ban", need: needsTires, limit: thresholds.tires },
                  { name: "Transmisi", need: needsTransmission, limit: thresholds.transmission },
                  { name: "Rem", need: needsBrakes, limit: thresholds.brakes },
                ].map(part => (
                  <div key={part.name} className="bg-background/50 border border-border/50 p-4 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold uppercase tracking-wider text-sm">{part.name}</span>
                      {part.need ? (
                        <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-1 rounded-full font-black uppercase">Perlu Servis</span>
                      ) : (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-1 rounded-full font-black uppercase">OK</span>
                      )}
                    </div>
                    
                    <div className="w-full bg-secondary rounded-full h-2 mt-2 mb-1 overflow-hidden">
                      <div 
                        className={`h-2 rounded-full ${part.need ? 'bg-red-500' : 'bg-primary'}`} 
                        style={{ width: `${Math.min((odometer / part.limit) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                      <span>{odometer.toLocaleString("id-ID")} / {part.limit.toLocaleString("id-ID")} KM</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <AlertCircle size={18} className="text-red-500"/> Tingkat Kerusakan (Wear)
              </h2>
              <div className="space-y-4">
                {[
                  { name: "Mesin", wear: wear.unfix_engine },
                  { name: "Ban", wear: wear.unfix_tires },
                  { name: "Transmisi", wear: wear.unfix_transmission },
                  { name: "Rem", wear: wear.unfix_brakes },
                ].map(part => (
                  <div key={part.name} className="bg-background/50 border border-border/50 p-4 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold uppercase tracking-wider text-sm">{part.name}</span>
                      {part.wear >= 100 ? (
                        <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-1 rounded-full font-black uppercase animate-pulse">Ganti Baru!</span>
                      ) : (
                        <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-1 rounded-full font-black uppercase">Aman</span>
                      )}
                    </div>
                    
                    <div className="w-full bg-secondary rounded-full h-2 mt-2 mb-1 overflow-hidden">
                      <div 
                        className={`h-2 rounded-full transition-all duration-1000 ${part.wear >= 100 ? 'bg-red-500' : part.wear > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${Math.min(part.wear, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                      <span>{part.wear.toFixed(1)} / 100%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COL: Job History & Image */}
          <div className="lg:col-span-2 space-y-6">
            <div className="aspect-[21/9] relative bg-card border border-border/50 rounded-2xl flex items-center justify-center p-6 shadow-xl overflow-hidden group">
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
            </div>

            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                  <History size={18} className="text-primary"/> Riwayat Pekerjaan
                </h2>
                
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Link 
                      href={`?page=${Math.max(1, page - 1)}`}
                      className={`p-1.5 rounded-md border ${page <= 1 ? 'border-border/30 text-muted-foreground pointer-events-none' : 'border-border hover:bg-muted text-foreground'}`}
                    >
                      <ArrowLeft size={16} />
                    </Link>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2">
                      Hal {page} dari {totalPages}
                    </span>
                    <Link 
                      href={`?page=${Math.min(totalPages, page + 1)}`}
                      className={`p-1.5 rounded-md border ${page >= totalPages ? 'border-border/30 text-muted-foreground pointer-events-none' : 'border-border hover:bg-muted text-foreground'}`}
                    >
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                )}
              </div>
              
              {jobHistories.length > 0 ? (
                <div className="space-y-3">
                  {jobHistories.map((job) => (
                    <div key={job._id.toString()} className="bg-background/50 border border-border/50 p-4 rounded-xl flex justify-between items-center hover:bg-muted/50 transition-colors">
                      <div>
                        <h3 className="font-bold text-sm">{job.sourceCity} &rarr; {job.destinationCity}</h3>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">{job.cargoName} • {job.distanceKm} km</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-emerald-500 text-sm">+{job.nc?.total?.toLocaleString("id-ID") || 0} NC</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                          {new Date(job.completedAt).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <History size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-bold uppercase tracking-widest">Belum ada riwayat pekerjaan</p>
                </div>
              )}
            </div>

            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                  <Wrench size={18} className="text-primary"/> Riwayat Servis & Penggantian
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
                      <div key={order._id.toString()} className="bg-background/50 border border-border/50 p-4 rounded-xl flex justify-between items-center hover:bg-muted/50 transition-colors">
                        <div>
                          <h3 className="font-bold text-sm flex items-center gap-2">
                            {isReplace ? "🔄 Ganti Baru" : "🔧 Servis Rutin"}
                          </h3>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                            {parts.join(", ")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-red-500 text-sm">-{order.totalPrice?.toLocaleString("id-ID") || 0} NC</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                            {order.maintenanceEndAt ? new Date(order.maintenanceEndAt).toLocaleDateString("id-ID") : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Wrench size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-bold uppercase tracking-widest">Belum ada riwayat servis</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
