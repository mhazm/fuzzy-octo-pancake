import React from "react";
import clientPromise from "@/lib/mongodb";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import LottoPeriod from "@/lib/models/LottoPeriod";
import LottoTicket from "@/lib/models/LottoTicket";
import User from "@/lib/models/User";
import LottoClient from "./LottoClient";
import Image from "next/image";
import { Ticket, Coins, Trophy, Calendar, Users, History } from "lucide-react";
import NismaraPlusBadge from "@/components/icons/NismaraPlusBadge";
import ServerBoosterBadge from "@/components/icons/ServerBoosterBadge";
import { getCurrencyData } from "@/app/dashboard/currency/actions";

export const dynamic = "force-dynamic";

export default async function LottoPage() {
  const session = await getServerSession(authOptions);
  await clientPromise;

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI!);
  }

  // 1. Fetch Active Period
  let activePeriod = await LottoPeriod.findOne({ status: "OPEN" }).lean();

  // If no active period exists, let's create the first one automatically
  if (!activePeriod) {
    activePeriod = await LottoPeriod.create({
      periodNumber: 1,
      baseJackpot: 10000,
      accumulatedPrize: 0,
      status: "OPEN",
    });
  }

  // 2. Fetch Current User's Tickets
  let myTickets: any[] = [];
  let userNC = 0;

  if (session?.user?.discordId) {
    myTickets = await LottoTicket.find({
      periodId: activePeriod._id,
      discordId: session.user.discordId,
    }).lean();

    if (session.user.isDriver) {
      try {
        const currencyData = await getCurrencyData();
        userNC = currencyData.balance;
      } catch (err) {
        console.error("Failed to fetch currency:", err);
      }
    }
  }

  // 3. Fetch Participants (Recent Buyers)
  const allTickets = await LottoTicket.find({
    periodId: activePeriod._id,
  }).lean();
  const participantIds = [...new Set(allTickets.map((t) => t.discordId))];

  const participantsData = await User.find({
    discordId: { $in: participantIds },
  })
    .select("name image discordId isBooster nismaraplus.status")
    .lean();

  const totalPrizePool =
    activePeriod.baseJackpot + activePeriod.accumulatedPrize;

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-12 px-4 md:px-8 min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/30 via-background to-card p-8 md:p-12 border border-primary/20 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-primary/40 rounded-full blur-[120px] opacity-30 pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-[--color-accent-sky] rounded-full blur-[120px] opacity-10 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left space-y-4 flex-1">
            <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-primary/30">
              <Trophy size={14} className="text-primary" /> Nismara Lotto
              Period #{activePeriod.periodNumber}
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-[--color-accent-sky] filter drop-shadow-lg">
              MEGA JACKPOT
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl font-medium max-w-xl">
              Tebak 4 angka (1-69) dan menangkan puluhan ribu Nismara Coin!
              Pengundian dilakukan setiap akhir pekan.
            </p>
          </div>

          <div className="bg-black/40 backdrop-blur-md p-6 rounded-2xl border border-white/10 text-center min-w-[300px]">
            <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider mb-2">
              Total Prize Pool
            </p>
            <div className="flex items-center justify-center gap-3 text-4xl md:text-5xl font-black text-primary drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]">
              <Coins
                className="text-primary"
                size={40}
              />
              {totalPrizePool.toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1.5">
              <Calendar size={12} /> Diundi minggu ini
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Purchase Client */}
        <div className="lg:col-span-2 space-y-6">
          <LottoClient
            periodId={activePeriod._id.toString()}
            userNC={userNC}
            ticketsBought={myTickets.length}
            isDriver={!!(session?.user?.discordId && session?.user?.isDriver)}
          />

          {/* My Tickets */}
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Ticket className="text-primary" size={20} />
              <h2 className="text-lg font-black uppercase tracking-wider">
                Tiket Saya ({myTickets.length}/10)
              </h2>
            </div>

            {myTickets.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                <Ticket size={32} className="mx-auto mb-3 opacity-20" />
                <p>Anda belum membeli tiket untuk periode ini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {myTickets.map((ticket, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex gap-2">
                      {ticket.numbers.map((num: number, i: number) => (
                        <div
                          key={i}
                          className="w-10 h-10 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-black text-lg"
                        >
                          {num.toString().padStart(2, "0")}
                        </div>
                      ))}
                    </div>
                    <div className="text-xs font-bold text-muted-foreground uppercase bg-background px-2 py-1 rounded">
                      #{idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Participants & Info */}
        <div className="space-y-6">
          <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Users className="text-primary" size={20} />
                <h2 className="text-lg font-black uppercase tracking-wider">
                  Peserta
                </h2>
              </div>
              <span className="bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-bold">
                {participantIds.length} Supir
              </span>
            </div>

            {participantsData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Belum ada yang membeli tiket.
              </p>
            ) : (
              <div className="space-y-3">
                {participantsData.map((p) => (
                  <div
                    key={p.discordId}
                    className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl border border-border/30"
                  >
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted">
                      {p.image ? (
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary font-bold">
                          {p.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center font-bold text-sm">
                        {p.name}
                        {p.isBooster && (
                          <ServerBoosterBadge className="w-3 h-3" />
                        )}
                        {p.nismaraplus?.status && (
                          <NismaraPlusBadge className="w-3 h-3" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <History className="text-green-400" size={20} />
              <h2 className="text-lg font-black uppercase tracking-wider">
                Aturan Main
              </h2>
            </div>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>
                Harga 1 tiket adalah <strong className="text-foreground">500 NC</strong>.
              </li>
              <li>
                Pilih 4 angka unik dari <strong className="text-foreground">1 hingga 69</strong>.
              </li>
              <li>
                Maksimal pembelian <strong className="text-foreground">10 tiket</strong> per minggu.
              </li>
              <li><strong className="text-foreground">80%</strong> dari harga tiket masuk ke Prize Pool.</li>
              <li>Hadiah dibagi menjadi 3 Tier:</li>
            </ul>
            <div className="mt-4 space-y-2">
              <div className="bg-primary/10 border border-primary/20 p-2 rounded-lg text-xs">
                <strong className="text-primary block mb-1">
                  Tier 1 (Jackpot)
                </strong>
                Cocok 4 Angka (60% dari Prize Pool)
              </div>
              <div className="bg-[--color-accent-sky]/10 border border-[--color-accent-sky]/20 p-2 rounded-lg text-xs">
                <strong className="text-[--color-accent-sky] block mb-1">
                  Tier 2
                </strong>
                Cocok 3 Angka (25% dari Prize Pool dibagi rata)
              </div>
              <div className="bg-accent/30 border border-accent p-2 rounded-lg text-xs">
                <strong className="text-foreground block mb-1">
                  Tier 3
                </strong>
                Cocok 2 Angka (15% dari Prize Pool dibagi rata)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
