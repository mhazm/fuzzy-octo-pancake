"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateGoalStatus } from "./actions";
import { showAlert, showConfirm } from "@/lib/dialog";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import EditGoalModal from "./EditGoalModal";

export default function ManageGoalsClient({ goals }: { goals: any[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const pendingGoals = goals.filter((g) => g.status === "pending");
  const otherGoals = goals.filter((g) => g.status !== "pending");

  async function handleAction(goalId: string, action: "active" | "rejected") {
    const isApprove = action === "active";
    if (
      !(await showConfirm(
        `Anda yakin ingin ${isApprove ? "menyetujui" : "menolak"} Goal ini?`,
      ))
    )
      return;

    setLoadingId(goalId);
    const res = await updateGoalStatus(goalId, action);
    setLoadingId(null);

    if (res.success) {
      await showAlert(
        `Goal telah ${isApprove ? "disetujui" : "ditolak"}.`,
        "Berhasil!",
      );
    } else {
      await showAlert(res.error || "Terjadi kesalahan.", "Gagal");
    }
  }

  const renderGoalCard = (goal: any) => (
    <Card
      key={goal._id}
      className="bg-card/40 backdrop-blur-md border border-border/50"
    >
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant={
                  goal.status === "pending"
                    ? "outline"
                    : goal.status === "active"
                      ? "default"
                      : "secondary"
                }
              >
                {goal.status.toUpperCase()}
              </Badge>
              <Badge variant="outline">{goal.type.toUpperCase()}</Badge>
            </div>
            <h3 className="text-xl font-bold text-foreground mb-1">
              {goal.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {goal.description}
            </p>

            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Target: </span>
                <span className="font-bold text-foreground">
                  {goal.targetAmount.toLocaleString("id-ID")}{" "}
                  {goal.type.toUpperCase()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Pengusul: </span>
                <span className="font-bold text-foreground">
                  {goal.creator.name}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Hadiah: </span>
                <span className="font-bold text-foreground text-primary">
                  {goal.rewardType === "currency-boost"
                    ? `Boost ${goal.rewardDetails?.multiplier}x`
                    : goal.rewardType === "coupon"
                    ? `Kupon ${goal.rewardDetails?.amount} ${goal.rewardDetails?.type}`
                    : `Special Contract: ${goal.rewardDetails?.companyName}`}
                  {" "} ({goal.rewardDetails?.duration || 3} Hari)
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Tenggat Waktu: </span>
                <span className="font-bold text-foreground">
                  {new Intl.DateTimeFormat("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Jakarta"
                  }).format(new Date(goal.deadline))} WIB
                </span>
              </div>
            </div>
          </div>

          {goal.status === "pending" && (
            <div className="flex md:flex-col gap-3 justify-center items-end min-w-[120px]">
              <EditGoalModal goal={goal} />
              <Button
                onClick={() => handleAction(goal._id, "active")}
                disabled={loadingId === goal._id}
                className="w-full bg-green-500/20 text-green-500 hover:bg-green-500/30 hover:text-green-600 border border-green-500/30"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Terima
              </Button>
              <Button
                onClick={() => handleAction(goal._id, "rejected")}
                disabled={loadingId === goal._id}
                variant="destructive"
                className="w-full bg-red-500/20 text-red-500 hover:bg-red-500/30 hover:text-red-600 border border-red-500/30"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Tolak
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-12 px-6 md:px-8 pb-20">
      <div>
        <h1 className="text-3xl font-black text-foreground mb-2 flex items-center gap-3">
          <Clock className="text-primary w-8 h-8" />
          Menunggu Persetujuan
        </h1>
        <p className="text-muted-foreground">
          Tinjau usulan Community Goal dari driver.
        </p>
      </div>

      {pendingGoals.length === 0 ? (
        <div className="p-12 text-center bg-card/20 rounded-2xl border border-dashed border-border">
          <p className="text-muted-foreground">
            Tidak ada usulan baru saat ini.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">{pendingGoals.map(renderGoalCard)}</div>
      )}

      <div className="pt-8 border-t border-border/50">
        <h2 className="text-2xl font-bold text-foreground mb-6">
          Riwayat Goal
        </h2>
        <div className="grid gap-4">{otherGoals.map(renderGoalCard)}</div>
      </div>
    </div>
  );
}
