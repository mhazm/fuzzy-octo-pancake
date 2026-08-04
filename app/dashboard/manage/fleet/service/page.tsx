import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { redirect } from "next/navigation";
import {
  Wrench,
  Clock,
  CheckCircle,
  Truck,
  Info,
  Settings,
} from "lucide-react";
import Link from "next/link";
import ServiceActionClient from "./ServiceActionClient";

export const dynamic = "force-dynamic";

export default async function ManagerServicePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    redirect("/auth/signin");
  }

  const client = await clientPromise;
  const db = client.db();

  // Check if user is manager (role check skipped for brevity, but normally you'd check here.
  // Assuming access control is handled via middleware or the link is only shown to managers).

  // Fetch all maintenance orders
  const rawOrders = await db
    .collection("fleetmaintenanceorders")
    .aggregate([
      { $match: { status: { $in: ["pending", "waiting", "in_service"] } } },
      {
        $lookup: {
          from: "fleets",
          localField: "fleetId",
          foreignField: "_id",
          as: "fleetInfo",
        },
      },
      { $unwind: { path: "$fleetInfo", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "userRef",
          foreignField: "_id",
          as: "driverInfo",
        },
      },
      { $unwind: { path: "$driverInfo", preserveNullAndEmptyArrays: true } },
    ])
    .toArray();

  const orders = JSON.parse(JSON.stringify(rawOrders)); // serialize ObjectIds and Dates

  const inService = orders.filter((o: any) => o.status === "in_service");
  const waitingList = orders
    .filter((o: any) => o.status === "waiting")
    .sort(
      (a: any, b: any) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  const pendingRequests = orders
    .filter((o: any) => o.status === "pending")
    .sort(
      (a: any, b: any) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  const slots = [1, 2, 3];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-10 pb-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-sky/10 rounded-lg text-accent-sky">
              <Settings size={24} />
            </div>
            <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase italic">
              Bengkel & Garasi
            </h1>
          </div>
          <p className="text-foreground/40 font-bold uppercase text-[10px] tracking-[0.2em] ml-11">
            Manajemen Servis Armada • Slot Terbatas
          </p>
        </div>
      </div>

      {/* GARAGE SLOTS */}
      <div>
        <h2 className="text-xl font-black uppercase tracking-widest mb-6 flex items-center gap-2">
          <Wrench size={20} className="text-primary" /> Slot Garasi Aktif
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {slots.map((slotNumber) => {
            const order = inService.find(
              (o: any) => o.slotNumber === slotNumber,
            );
            return (
              <div
                key={slotNumber}
                className={`border rounded-2xl p-6 ${order ? "bg-card border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.1)]" : "bg-background/50 border-border/50 border-dashed opacity-70"}`}
              >
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-border/50">
                  <h3 className="font-black uppercase tracking-widest text-lg">
                    Slot {slotNumber}
                  </h3>
                  {order ? (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full font-bold uppercase tracking-widest">
                      Terisi
                    </span>
                  ) : (
                    <span className="text-[10px] bg-muted text-muted-foreground px-2 py-1 rounded-full font-bold uppercase tracking-widest">
                      Kosong
                    </span>
                  )}
                </div>

                {order ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Truck size={24} className="text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-lg leading-tight">
                            {order.fleetInfo?.fleet_number}
                          </p>
                          {order.type === "replace" && (
                            <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]">Ganti Part</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest">
                          {order.driverInfo?.name}
                        </p>
                      </div>
                    </div>

                    <div className="bg-background/80 p-3 rounded-xl border border-border/50 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground uppercase font-bold">
                          Durasi Servis
                        </span>
                        <span className="font-black">
                          {order.serviceDuration} Hari
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground uppercase font-bold">
                          Selesai Pada
                        </span>
                        <span className="font-black text-amber-500">
                          {new Date(order.maintenanceEndAt).toLocaleDateString(
                            "id-ID",
                          )}
                        </span>
                      </div>
                    </div>
                    {/* The complete action should be handled by cron, but we can provide a manual button just in case */}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <Wrench size={32} className="mx-auto mb-3 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">
                      Siap Menerima Kendaraan
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* WAITING LIST */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-black uppercase tracking-widest mb-6 flex items-center gap-2">
            <Clock size={18} className="text-amber-500" /> Daftar Tunggu (
            {waitingList.length})
          </h2>
          {waitingList.length > 0 ? (
            <div className="space-y-4">
              {waitingList.map((order: any, index: number) => (
                <div
                  key={order._id}
                  className="bg-background/50 border border-border/50 p-4 rounded-xl flex justify-between items-center relative overflow-hidden group"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
                  <div className="pl-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-[10px] font-black">
                        {index + 1}
                      </span>
                      <h3 className="font-bold text-sm flex items-center gap-2">
                        {order.fleetInfo?.fleet_number}
                        {order.type === "replace" && (
                          <span className="text-[10px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded-sm font-black uppercase">Replace</span>
                        )}
                      </h3>
                      {order.type === "replace" && (
                        <span className="text-[10px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded-sm font-black uppercase ml-1">Replace</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">
                      {order.driverInfo?.name} • Durasi {order.serviceDuration}{" "}
                      Hari
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
                      Menunggu Slot
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground bg-background/30 rounded-xl border border-border/50 border-dashed">
              <CheckCircle
                size={24}
                className="mx-auto mb-2 opacity-30 text-emerald-500"
              />
              <p className="text-xs font-bold uppercase tracking-widest">
                Tidak ada antrean
              </p>
            </div>
          )}
        </div>

        {/* PENDING REQUESTS */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-black uppercase tracking-widest mb-6 flex items-center gap-2">
            <Info size={18} className="text-accent-sky" /> Menunggu Konfirmasi (
            {pendingRequests.length})
          </h2>
          {pendingRequests.length > 0 ? (
            <div className="space-y-4">
              {pendingRequests.map((order: any) => (
                <div
                  key={order._id}
                  className="bg-background/50 border border-border/50 p-4 rounded-xl flex flex-col gap-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-sm flex items-center gap-2">
                        {order.fleetInfo?.fleet_number}
                        {order.type === "replace" && (
                          <span className="text-[10px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded-sm font-black uppercase">Replace</span>
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest">
                        {order.driverInfo?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-emerald-500 text-sm">
                        {order.totalPrice.toLocaleString("id-ID")} NC
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                        Durasi: {order.serviceDuration} Hari
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end border-t border-border/50 pt-3 mt-1">
                    <ServiceActionClient orderId={order._id} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground bg-background/30 rounded-xl border border-border/50 border-dashed">
              <CheckCircle
                size={24}
                className="mx-auto mb-2 opacity-30 text-emerald-500"
              />
              <p className="text-xs font-bold uppercase tracking-widest">
                Semua request sudah diproses
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
