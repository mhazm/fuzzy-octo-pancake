import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { Truck, Plus, History, Activity, AlertCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Fleet",
};



export const dynamic = "force-dynamic";

export default async function FleetDashboardPage() {
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
  // Mencari semua truk yang belum punya owner, lalu set owner = driver
  const fleetsWithoutOwner = await db.collection("fleets").find({ owner: { $exists: false }, driver: { $ne: null } }).toArray();
  if (fleetsWithoutOwner.length > 0) {
    for (const f of fleetsWithoutOwner) {
      await db.collection("fleets").updateOne({ _id: f._id }, { $set: { owner: f.driver } });
    }
    console.log(`[Migration] Berhasil mengupdate ${fleetsWithoutOwner.length} truk lama dengan atribut owner.`);
  }
  // ---------------------------------------

  // Get user's fleet
  const userFleet = await db
    .collection("fleets")
    .aggregate([
      { $match: { $or: [{ driver: user._id }, { owner: user._id }] } },
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

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-10 pb-10 animate-in fade-in duration-700">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-sky/10 rounded-lg text-accent-sky">
              <Truck size={24} />
            </div>
            <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase italic">
              Fleet Management
            </h1>
          </div>
          <p className="text-foreground/40 font-bold uppercase text-[10px] tracking-[0.2em] ml-11">
            Nismara Transport Hub • Real-time Asset Tracking
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/dashboard/transactions"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-card border border-border hover:bg-muted text-sm font-bold uppercase tracking-wider transition-all"
          >
            <History size={16} /> Riwayat Pesanan
          </Link>
          <Link
            href="/dashboard/garage/fleet/buy"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5"
          >
            <Plus size={18} /> Beli Kendaraan Baru
          </Link>
        </div>
      </div>

      {/* MAIN CONTENT */}
      {userFleet.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {userFleet.map((fleet) => (
            <Link
              href={`/dashboard/garage/fleet/${fleet.id}`}
              key={fleet._id.toString()}
              className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-lg group hover:border-primary/50 transition-colors block"
            >
              <div className="aspect-video relative bg-background/50 flex items-center justify-center p-6 border-b border-border/50">
                {fleet.modelInfo?.photo_url ? (
                  <img
                    src={fleet.modelInfo.photo_url}
                    alt={fleet.modelInfo.name}
                    className="w-full h-full object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <Truck size={64} className="text-muted-foreground/30" />
                )}

                <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      fleet.status === "active"
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : fleet.status === "onservice"
                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          : "bg-red-500/10 text-red-500 border border-red-500/20"
                    }`}
                  >
                    {fleet.status === "need_maintenance"
                      ? "Need Maintenance"
                      : fleet.status === "onservice"
                        ? "On Service"
                        : fleet.status}
                  </span>
                  
                  {String(fleet.driver) === String(user._id) ? (
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-lg shadow-blue-500/10">
                      Aktif Digunakan
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-background/50 text-foreground/50 border border-border/50 backdrop-blur-md">
                      Terparkir
                    </span>
                  )}
                </div>

                {fleet.brandInfo?.logo_url && (
                  <div className="absolute bottom-4 left-4 p-2 bg-background/80 backdrop-blur-sm rounded-lg border border-border/50">
                    <img
                      src={fleet.brandInfo.logo_url}
                      alt={fleet.brandInfo.name}
                      className="h-6 w-auto object-contain"
                    />
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="flex justify-between items-center mb-1">
                  <h2 className="text-xl font-black uppercase tracking-wider">
                    {fleet.brandInfo?.name} {fleet.modelInfo?.name || "Unknown Model"}
                  </h2>
                  <span className="text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    DETAIL &rarr;
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                  <span>
                    Plat:{" "}
                    <strong className="text-foreground">
                      {fleet.fleet_number}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Odometer:{" "}
                    <strong className="text-foreground">
                      {fleet.odometer?.toLocaleString("id-ID")} km
                    </strong>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-card/50 border border-border border-dashed rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20">
            <Truck size={40} className="text-primary" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-widest mb-2">
            Belum Ada Kendaraan
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">
            Anda belum memiliki kendaraan yang ditugaskan. Beli kendaraan baru
            untuk memulai perjalanan logistik Anda bersama Nismara.
          </p>
          <Link
            href="/dashboard/garage/fleet/buy"
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest transition-all shadow-lg hover:shadow-primary/25 hover:-translate-y-1"
          >
            <Plus size={18} /> Beli Sekarang
          </Link>
        </div>
      )}
    </div>
  );
}
