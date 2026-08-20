"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Coins, Navigation, Target, CheckCircle2, Clock, XCircle, Users, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import UserBadges from "@/components/icons/UserBadges";
import { showAlert, showConfirm } from "@/lib/dialog";
import { donateToGoal, optInKmGoal } from "../actions";
import { useRouter } from "next/navigation";

export default function GoalDetailClient({ goal, userBalance, currentUserId }: { goal: any, userBalance: number, currentUserId?: string }) {
  const router = useRouter();
  const [donateAmount, setDonateAmount] = useState<number | "">("");
  const [loading, setLoading] = useState(false);

  const progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
  const isExpired = new Date(goal.deadline) < new Date();
  
  let statusConfig = { icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", label: "Aktif" };
  if (goal.status === "completed") {
    statusConfig = { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20", label: "Berhasil" };
  } else if (goal.status === "failed") {
    statusConfig = { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", label: "Gagal (Refunded)" };
  } else if (goal.status === "pending") {
    statusConfig = { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20", label: "Menunggu Persetujuan" };
  }

  const StatusIcon = statusConfig.icon;
  const isParticipant = goal.participants?.some((p: any) => p.discordId === currentUserId);
  const myContribution = goal.participants?.find((p: any) => p.discordId === currentUserId)?.contributed || 0;

  async function handleDonate() {
    if (!currentUserId) return showAlert("Harap login untuk berdonasi.", "Akses Ditolak");
    if (!donateAmount || donateAmount <= 0) return showAlert("Masukkan nominal yang valid.", "Error");
    if (donateAmount > userBalance) return showAlert("Saldo NC Anda tidak mencukupi.", "Error");
    if (goal.currentAmount + donateAmount > goal.targetAmount) {
      // Allow exact match or let backend clamp it? Actually backend allows over-donation but it's fine. We'll just alert them they can donate exactly what's left.
      const left = goal.targetAmount - goal.currentAmount;
      if (donateAmount > left && !(await showConfirm(`Goal hanya membutuhkan ${left.toLocaleString("id-ID")} NC lagi. Anda yakin ingin menyumbang ${donateAmount.toLocaleString("id-ID")} NC?`))) {
        return;
      }
    } else {
      if (!(await showConfirm(`Donasikan ${donateAmount.toLocaleString("id-ID")} NC? Saldo Anda akan terpotong.`))) return;
    }

    setLoading(true);
    const res = await donateToGoal(goal._id, Number(donateAmount));
    setLoading(false);

    if (res.success) {
      await showAlert(`Anda telah menyumbangkan ${Number(donateAmount).toLocaleString("id-ID")} NC. Terima kasih atas partisipasinya!`, "Berhasil!");
      setDonateAmount("");
      router.refresh();
    } else {
      await showAlert(res.error || "Terjadi kesalahan", "Gagal");
    }
  }

  async function handleOptIn() {
    if (!currentUserId) return showAlert("Harap login untuk berpartisipasi.", "Akses Ditolak");
    if (!(await showConfirm("Mulai kumpulkan jarak tempuh (KM) dari Job Anda berikutnya untuk Goal ini?"))) return;

    setLoading(true);
    const res = await optInKmGoal(goal._id);
    setLoading(false);

    if (res.success) {
      await showAlert("Anda telah terdaftar. Job Anda yang diselesaikan mulai sekarang akan dihitung ke dalam Goal ini.", "Berhasil!");
      router.refresh();
    } else {
      await showAlert(res.error || "Terjadi kesalahan", "Gagal");
    }
  }

  return (
    <main className="min-h-screen pt-32 pb-20 px-6 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link href="/community-goals" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-medium mb-8">
        <ArrowLeft size={20} />
        Kembali ke Daftar Goal
      </Link>

      <Card className="bg-card/50 backdrop-blur-md border border-border/50 rounded-3xl overflow-hidden shadow-2xl mb-12 flex flex-col md:flex-row relative">
        <div className="md:w-2/5 bg-muted relative flex-shrink-0 min-h-[280px] md:min-h-0 md:self-stretch">
          {goal.imageUrl ? (
            <img src={goal.imageUrl} alt={goal.title} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-primary/5 flex items-center justify-center">
              <Target className="w-24 h-24 text-primary/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card hidden md:block" />
          <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent md:hidden" />
        </div>

        <div className="p-8 md:p-10 flex-1 relative z-10 flex flex-col justify-center">
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge className={`${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} border`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
            <Badge variant="outline">{goal.type.toUpperCase()}</Badge>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-foreground mb-4">{goal.title}</h1>
          <div className="flex items-center gap-3 mb-6">
            <Link href={`/profile/${goal.creator?.truckyId || goal.creator?.discordId || ""}`} className="w-8 h-8 rounded-full overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all">
              {goal.creator?.avatarUrl ? (
                <img src={goal.creator.avatarUrl} alt={goal.creator.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-primary bg-primary/10">{goal.creator?.name?.[0] || "?"}</div>
              )}
            </Link>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Diinisiasi oleh</p>
              <div className="flex items-center gap-1.5">
                <Link href={`/profile/${goal.creator?.truckyId || goal.creator?.discordId || ""}`} className="font-bold text-foreground text-sm hover:text-primary transition-colors">
                  {goal.creator?.name || "Unknown"}
                </Link>
                {goal.creator && (
                  <UserBadges 
                    role={goal.creator.role} 
                    isNismaraPlus={goal.creator.nismaraplus?.status === true} 
                    nismaraPlusStartedAt={goal.creator.nismaraplus?.startedAt} 
                    truckyRank={goal.creator.truckyRank} 
                    isBooster={goal.creator.isBooster} 
                  />
                )}
              </div>
            </div>
          </div>
          <p className="text-muted-foreground mb-8 leading-relaxed">{goal.description}</p>

          <div className="bg-background/50 rounded-xl p-6 border border-border/50 space-y-6">
            <div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider mb-1">Terkumpul</p>
                  <p className="text-3xl font-black text-foreground">
                    {goal.currentAmount.toLocaleString("id-ID")} <span className="text-xl text-muted-foreground font-medium">/ {goal.targetAmount.toLocaleString("id-ID")} {goal.type.toUpperCase()}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-primary">{progress}%</p>
                </div>
              </div>
              <Progress value={progress} className="h-3" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="bg-card/40 p-4 rounded-xl border border-border/30">
                <p className="text-muted-foreground font-bold mb-1">Tenggat Waktu</p>
                <p className="font-bold text-foreground text-base">
                  {new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(goal.deadline))} WIB
                </p>
              </div>
              <div className="bg-card/40 p-4 rounded-xl border border-border/30">
                <p className="text-muted-foreground font-bold mb-1">Hadiah Komunitas</p>
                <p className="font-bold text-primary text-base">
                  {goal.rewardType === "currency-boost" 
                    ? `Boost Pendapatan ${goal.rewardDetails?.multiplier}x` 
                    : goal.rewardType === "coupon"
                    ? `Kupon ${goal.rewardDetails?.amount} ${goal.rewardDetails?.type}`
                    : `Special Contract: ${goal.rewardDetails?.companyName}`}
                  {" "} ({goal.rewardDetails?.duration || 3} Hari)
                </p>
              </div>
            </div>

            {/* Achievement Rewards */}
            {(goal.achievementRewards?.participant?.enabled || goal.achievementRewards?.topContributor?.enabled) && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 mt-6">
                <h3 className="font-bold text-amber-500 flex items-center gap-2 mb-4 text-base">
                  <Trophy className="w-5 h-5" /> Hadiah Achievement Khusus
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {goal.achievementRewards.participant?.enabled && (
                    <div className="flex items-center gap-3 bg-background/50 p-3 rounded-lg border border-border/50">
                      <img src={goal.achievementRewards.participant.imageUrl} alt="Participant" className="w-12 h-12 rounded object-cover" />
                      <div>
                        <Badge variant="outline" className="mb-1 text-[10px] uppercase text-amber-500 border-amber-500/30">Semua Partisipan</Badge>
                        <p className="font-bold text-sm text-foreground line-clamp-1">{goal.achievementRewards.participant.name}</p>
                      </div>
                    </div>
                  )}
                  {goal.achievementRewards.topContributor?.enabled && (
                    <div className="flex items-center gap-3 bg-background/50 p-3 rounded-lg border border-border/50">
                      <img src={goal.achievementRewards.topContributor.imageUrl} alt="Top Contributor" className="w-12 h-12 rounded object-cover" />
                      <div>
                        <Badge variant="outline" className="mb-1 text-[10px] uppercase text-amber-500 border-amber-500/30">Top Kontributor #1</Badge>
                        <p className="font-bold text-sm text-foreground line-clamp-1">{goal.achievementRewards.topContributor.name}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Aksi Partisipasi (Order 1 on Mobile, Order 2 on Desktop) */}
        <div className="space-y-6 order-1 lg:order-2 lg:col-span-1">
          <Card className="bg-card/40 backdrop-blur-md border border-border/50 sticky top-24">
            <CardContent className="p-6 md:p-8">
              <h3 className="text-xl font-bold text-foreground mb-6">Aksi Partisipasi</h3>
              
              {goal.status !== "active" ? (
                <div className="text-center p-4 bg-muted/50 rounded-xl border border-border text-muted-foreground">
                  Goal ini sedang tidak aktif.
                </div>
              ) : isExpired ? (
                <div className="text-center p-4 bg-red-500/10 rounded-xl border border-red-500/30 text-red-500 font-bold">
                  Waktu partisipasi telah berakhir.
                </div>
              ) : goal.type === "nc" ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-background/50 p-4 rounded-xl border border-border text-sm">
                    <span className="text-muted-foreground">Saldo NC Anda:</span>
                    <span className="font-bold text-foreground flex items-center gap-1">
                      <Coins className="w-4 h-4 text-yellow-500" />
                      {userBalance.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="relative">
                      <Input 
                        type="number" 
                        placeholder="Nominal Donasi..." 
                        value={donateAmount} 
                        onChange={(e) => setDonateAmount(e.target.value === "" ? "" : Number(e.target.value))}
                        disabled={loading}
                        className="bg-background/50 pr-12 text-lg h-14 rounded-xl"
                      />
                      <span className="absolute right-4 top-4 font-bold text-muted-foreground">NC</span>
                    </div>
                    <div className="flex gap-2">
                      {[1000, 5000, 10000].map(amt => (
                        <Button key={amt} variant="outline" size="sm" className="flex-1 rounded-lg" onClick={() => setDonateAmount(amt)} disabled={loading}>
                          +{amt/1000}k
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleDonate} 
                    disabled={loading || !donateAmount} 
                    className="w-full h-14 text-md font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
                  >
                    Donasikan Sekarang
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-background/50 p-4 rounded-xl border border-border text-sm text-muted-foreground">
                    Sistem akan otomatis merekam Jarak Tempuh (KM) dari Job Trucky Anda yang baru setelah Anda mendaftar berpartisipasi.
                  </div>
                  
                  {isParticipant ? (
                    <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/30 text-green-500 text-center">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                      <p className="font-bold">Anda telah berpartisipasi!</p>
                      <p className="text-sm mt-1">Total kontribusi: {myContribution.toLocaleString("id-ID")} KM</p>
                    </div>
                  ) : (
                    <Button 
                      onClick={handleOptIn} 
                      disabled={loading} 
                      className="w-full h-14 text-md font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center gap-2"
                    >
                      <Navigation className="w-5 h-5" />
                      Ikut Berpartisipasi
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Partisipan (Order 2 on Mobile, Order 1 on Desktop) */}
        <div className="lg:col-span-2 space-y-8 order-2 lg:order-1">
          <div className="bg-card/40 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-border">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Users className="text-primary w-6 h-6" />
              Top Partisipan
            </h2>
            
            {goal.participants.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 bg-background/30 rounded-xl border border-dashed border-border/50">Belum ada yang berpartisipasi. Jadilah yang pertama!</p>
            ) : (
              <div className="space-y-4">
                {goal.participants.slice(0, 20).map((p: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-border/50 hover:border-primary/30 transition-colors shadow-sm">
                    <div className="flex items-center gap-4">
                      <Link href={`/profile/${p.truckyId || p.discordId || ""}`} className="w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0 hover:ring-2 hover:ring-primary transition-all">
                        {p.avatarUrl ? (
                          <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-primary bg-primary/10">{p.name[0]}</div>
                        )}
                      </Link>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/profile/${p.truckyId || p.discordId || ""}`} className="font-bold text-foreground truncate hover:text-primary transition-colors">
                            {p.name}
                          </Link>
                          <UserBadges
                            role={p.discordRole}
                            isNismaraPlus={p.nismaraplus?.status === true}
                            nismaraPlusStartedAt={p.nismaraplus?.startedAt}
                            truckyRank={p.truckyRank}
                            isBooster={p.isBooster}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Bergabung: {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(p.joinedAt))}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <Badge variant="outline" className="font-black md:text-lg bg-card px-3 py-1 shadow-sm">
                        {p.contributed.toLocaleString("id-ID")} {goal.type.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
                
                {goal.participants.length > 20 && (
                  <div className="text-center pt-4">
                    <p className="text-sm text-muted-foreground font-medium">Menampilkan 20 partisipan teratas dari total {goal.participants.length} partisipan.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
