import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import DriverAccessBlocker from "@/components/DriverAccessBlocker";
import dbConnect from "@/lib/mongoose";
import UserVoucher from "@/lib/models/UserVoucher";
import User from "@/lib/models/User";
import VouchersClient from "@/app/dashboard/vouchers/VouchersClient";
import { Ticket, Sparkles, CheckCircle2, History } from "lucide-react";

export const metadata = {
  title: "Dompet Kupon & Voucher",
};

export default async function VouchersPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (!session.user?.isDriver || !session.user.driverData) {
    return <DriverAccessBlocker session={session} />;
  }

  await dbConnect();

  // Auto-expire
  await UserVoucher.updateMany(
    {
      discordId: session.user.discordId,
      status: "ACTIVE",
      expiresAt: { $ne: null, $lt: new Date() },
    },
    { $set: { status: "EXPIRED" } },
  );

  const vouchersDoc = await UserVoucher.find({
    discordId: session.user.discordId,
  })
    .sort({ createdAt: -1 })
    .lean();

  const vouchers = JSON.parse(JSON.stringify(vouchersDoc));

  const activeCount = vouchers.filter((v: any) => v.status === "ACTIVE").length;
  const usedCount = vouchers.filter((v: any) => v.status === "USED").length;

  const user = await User.findOne({
    discordId: String(session.user.discordId),
  }).lean();
  const activeNcBoost = user?.ncBoost
    ? JSON.parse(JSON.stringify(user.ncBoost))
    : null;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-950/40 via-card/80 to-emerald-950/30 border border-teal-500/20 p-6 md:p-8 backdrop-blur-xl shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-bold uppercase tracking-widest">
              <Sparkles size={14} /> Driver Voucher Inventory
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
              <Ticket className="text-teal-400 w-8 h-8 md:w-9 md:h-9" />
              Kupon & Voucher Saya
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl">
              Koleksi voucher diskon servis armada, potongan dealer armada, booster NC, dan benefit eksklusif yang Anda dapatkan dari Seasonal Pass dan Event.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-5 py-3 rounded-xl bg-card/60 border border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Voucher Aktif
                </p>
                <p className="text-2xl font-black text-foreground tabular-nums">
                  {activeCount}
                </p>
              </div>
            </div>

            <div className="px-5 py-3 rounded-xl bg-card/60 border border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-black">
                <History size={20} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Terpakai
                </p>
                <p className="text-2xl font-black text-foreground tabular-nums">
                  {usedCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Voucher List Component */}
      <VouchersClient
        initialVouchers={vouchers}
        initialNcBoost={activeNcBoost}
      />
    </div>
  );
}
