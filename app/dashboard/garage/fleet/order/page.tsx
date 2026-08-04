import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import mongoose from "mongoose";
import FleetOrder from "@/lib/models/FleetOrder";
import { redirect } from "next/navigation";
import { History, ExternalLink, ArrowLeft, Clock, CheckCircle, Package } from "lucide-react";
import Link from "next/link";
import "@/lib/models/FleetStore"; // Register models
import "@/lib/models/FleetBrand"; 

export const dynamic = "force-dynamic";

export default async function UserFleetOrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    redirect("/auth/signin");
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI!);
  }

  const client = await clientPromise;
  const db = client.db();
  const user = await db.collection("users").findOne({ discordId: session.user.discordId });
  if (!user) redirect("/auth/signin");

  const orders = await FleetOrder.find({ userId: String(user._id) })
    .populate({
      path: "fleetStoreId",
      populate: {
        path: "brand",
        model: "FleetBrand"
      }
    })
    .sort({ createdAt: -1 })
    .lean();

  const GUILD_ID = process.env.DISCORD_GUILD_ID;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-10 pb-10">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 mb-4 border-b border-border/50 pb-6">
        <div>
          <Link href="/dashboard/fleet" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm font-bold uppercase tracking-widest mb-4 transition-colors">
            <ArrowLeft size={16} /> Kembali ke Fleet
          </Link>
          <h1 className="text-3xl font-black uppercase tracking-widest flex items-center gap-3">
            <History className="text-primary" size={32} />
            Riwayat Pesanan Kendaraan
          </h1>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-card/50 border border-border border-dashed rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
            <Package size={32} className="text-muted-foreground" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-widest mb-2">Belum Ada Pesanan</h2>
          <p className="text-muted-foreground mb-8">Anda belum pernah melakukan pemesanan armada baru.</p>
          <Link
            href="/dashboard/fleet/buy"
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold uppercase tracking-wider transition-all"
          >
            Beli Kendaraan
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {orders.map((order: any) => (
            <div key={order._id.toString()} className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6 w-full md:w-auto">
                <div className="w-24 h-24 bg-background border border-border rounded-xl flex items-center justify-center shrink-0 p-2">
                  {order.fleetStoreId?.photo_url ? (
                    <img src={order.fleetStoreId.photo_url} alt={order.fleetStoreId.name} className="w-full h-full object-contain" />
                  ) : (
                    <Package size={32} className="text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-xl uppercase italic tracking-wide mb-1">
                    {order.fleetStoreId?.brand?.name} {order.fleetStoreId?.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Dipesan pada {new Date(order.createdAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border ${
                      order.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                      order.status === 'claimed' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                      order.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                      'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}>
                      {order.status === 'completed' ? <CheckCircle size={12} /> : <Clock size={12} />}
                      {order.status}
                    </span>
                    <span className="font-bold tabular-nums text-sm">{order.totalPrice.toLocaleString("id-ID")} NC</span>
                  </div>
                </div>
              </div>

              {(order.status === "pending" || order.status === "claimed") && (
                <div className="w-full md:w-auto mt-4 md:mt-0 flex shrink-0">
                  <a 
                    href={`https://discord.com/channels/${GUILD_ID}/${order.discordChannelId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full md:w-auto px-6 py-3 bg-[#5865F2]/10 hover:bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/30 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    Ke Tiket Discord <ExternalLink size={16} />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
