import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import mongoose from "mongoose";
import Transaction from "@/lib/models/Transaction";
import TransactionListUI from "./TransactionListUI";
import dbConnect from "@/lib/mongoose";
import { Coins, Receipt, ShoppingBag, Wrench, Shield, ShoppingCart, User } from "lucide-react";
import UserBadges from "@/components/icons/UserBadges";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  await dbConnect();
  const discordId = session.user.discordId;

  const transactionsData = await Transaction.find({ discordId })
    .sort({ createdAt: -1 })
    .lean();

  const serializedTransactions = transactionsData.map((t: any) => ({
    _id: t._id.toString(),
    trxId: t.trxId,
    title: t.title,
    category: t.category,
    amount: t.amount,
    currency: t.currency,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
    metadata: t.metadata ? JSON.parse(JSON.stringify(t.metadata)) : {}
  }));

  // Statistics
  const totalNCSpent = serializedTransactions
    .filter(t => t.currency === "NC" && t.status === "success")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalIDRSpent = serializedTransactions
    .filter(t => t.currency === "IDR" && t.status === "success")
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="p-4 md:p-8 w-full max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Profile & Title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/50">
        <div className="flex items-center gap-5">
          <div className="relative group">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden ring-2 ring-primary/20 group-hover:ring-primary transition-all duration-300">
              {session.user?.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-secondary flex items-center justify-center">
                  <User className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-background rounded-full p-1 shadow-xl">
              <UserBadges 
                role={session.user.role} 
                isManager={session.user.role === "manager" || session.user.role === "admin"} 
                isBooster={session.user.isBooster} 
                isNismaraPlus={session.user.nismaraplus?.status} 
                nismaraPlusStartedAt={session.user.nismaraplus?.startedAt}
                truckyRank={(session.user as any).truckyRank} 
              />
            </div>
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight flex items-center gap-3">
              Riwayat Transaksi
            </h1>
            <p className="text-sm md:text-base text-muted-foreground font-medium mt-1">
              Catatan lengkap pembelanjaan dan pesanan Anda
            </p>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card Total NC */}
        <div className="bg-gradient-to-br from-card to-secondary/30 rounded-[2rem] border shadow-sm p-6 relative overflow-hidden group hover:border-primary/30 transition-colors">
          <div className="absolute -right-6 -top-6 opacity-[0.03] group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500">
            <Coins className="w-32 h-32" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-yellow-500/10 rounded-2xl text-yellow-500">
              <Coins className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-muted-foreground tracking-tight">Total Belanja NC</h3>
          </div>
          <div className="text-3xl font-black text-foreground">
            {totalNCSpent.toLocaleString("id-ID")} <span className="text-lg font-medium text-muted-foreground">NC</span>
          </div>
        </div>

        {/* Card Total IDR */}
        <div className="bg-gradient-to-br from-card to-secondary/30 rounded-[2rem] border shadow-sm p-6 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
          <div className="absolute -right-6 -top-6 opacity-[0.03] group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500">
            <Receipt className="w-32 h-32" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-muted-foreground tracking-tight">Total Belanja Rupiah</h3>
          </div>
          <div className="text-3xl font-black text-foreground">
            <span className="text-lg font-medium text-muted-foreground">Rp</span> {totalIDRSpent.toLocaleString("id-ID")}
          </div>
        </div>

        {/* Card Total Transaksi */}
        <div className="bg-gradient-to-br from-card to-secondary/30 rounded-[2rem] border shadow-sm p-6 relative overflow-hidden group hover:border-green-500/30 transition-colors">
          <div className="absolute -right-6 -top-6 opacity-[0.03] group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500">
            <ShoppingBag className="w-32 h-32" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-500/10 rounded-2xl text-green-500">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-muted-foreground tracking-tight">Total Pesanan</h3>
          </div>
          <div className="text-3xl font-black text-foreground">
            {serializedTransactions.length} <span className="text-lg font-medium text-muted-foreground">Item</span>
          </div>
        </div>
      </div>

      <TransactionListUI transactions={serializedTransactions} />
    </div>
  );
}
