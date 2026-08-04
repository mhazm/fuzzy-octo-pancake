import { getCurrencyData } from "./actions";
import CurrencyClient from "./CurrencyClient";
import { Coins, Wallet, ShieldAlert, ArrowRight } from "lucide-react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import DriverAccessBlocker from "@/components/DriverAccessBlocker";

export const metadata = {
  title: "Dompet Nismara | Nismara Logistics",
};

export default async function CurrencyPage() {
  const session = await getServerSession(authOptions);

  // 1. Proteksi Login
  if (!session) {
    redirect("/login");
  }

  if (!session.user?.isDriver || !session.user.driverData) {
    return <DriverAccessBlocker session={session} />;
  }

  const data = await getCurrencyData();

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Wallet className="text-accent-lilac" /> Nismara Coin Histories
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
        <div className="glass-panel p-6 rounded-2xl border border-border/50 bg-card/30">
          <p className="text-sm font-medium text-gray-400">Total Saldo</p>
          <div className="flex items-center gap-2 mt-2">
            <Coins className="text-yellow-400 w-8 h-8" />
            <h3 className="text-4xl font-bold text-foreground">
              {data.balance.toLocaleString("id-ID")}{" "}
              <span className="text-lg font-normal text-gray-500">NC</span>
            </h3>
          </div>
        </div>
      </div>

      <CurrencyClient initialHistory={data.history} />
    </div>
  );
}
