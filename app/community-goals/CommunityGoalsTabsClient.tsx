"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Target, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function CommunityGoalsTabsClient({ goals }: { goals: any[] }) {
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "failed">(
    "active",
  );

  const filteredGoals = goals.filter((g) => g.status === activeTab);

  const tabs = [
    { id: "active", label: "Sedang Berjalan", icon: Clock },
    { id: "completed", label: "Tercapai", icon: CheckCircle2 },
    { id: "failed", label: "Gagal", icon: XCircle },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap gap-2 justify-center mb-8 p-1.5 bg-card/40 border border-border/50 rounded-2xl backdrop-blur-md max-w-fit mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count = goals.filter((g) => g.status === tab.id).length;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl font-bold transition-all text-sm sm:text-base ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span
                className={`ml-1.5 px-2 py-0.5 rounded-full text-xs ${
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filteredGoals.length === 0 ? (
        <div className="p-16 text-center bg-card/20 rounded-3xl border border-dashed border-border backdrop-blur-sm">
          <Target className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">
            Belum ada goal{" "}
            {activeTab === "active"
              ? "yang sedang berjalan"
              : activeTab === "completed"
                ? "yang telah tercapai"
                : "yang gagal"}
          </h3>
          {activeTab === "active" && (
            <p className="text-muted-foreground">
              Jadilah yang pertama untuk mengusulkan Community Goal!
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGoals.map((goal) => {
            const progress = Math.min(
              100,
              Math.round((goal.currentAmount / goal.targetAmount) * 100),
            );

            let statusConfig = {
              icon: Clock,
              color: "text-blue-500",
              bg: "bg-blue-500/10",
              border: "border-blue-500/20",
              label: "Aktif",
            };
            if (goal.status === "completed") {
              statusConfig = {
                icon: CheckCircle2,
                color: "text-green-500",
                bg: "bg-green-500/10",
                border: "border-green-500/20",
                label: "Berhasil",
              };
            } else if (goal.status === "failed") {
              statusConfig = {
                icon: XCircle,
                color: "text-red-500",
                bg: "bg-red-500/10",
                border: "border-red-500/20",
                label: "Gagal (Refunded)",
              };
            }

            const StatusIcon = statusConfig.icon;

            return (
              <Link
                key={goal._id.toString()}
                href={`/community-goals/${goal.slug || goal._id.toString()}`}
                className="group relative"
              >
                <div className="absolute inset-0 bg-linear-to-b from-transparent to-background/80 z-10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-8">
                  <span className="px-6 py-2 bg-primary text-white font-bold rounded-full shadow-xl shadow-primary/25 translate-y-4 group-hover:translate-y-0 transition-transform">
                    Lihat Detail
                  </span>
                </div>

                <div className="h-full flex flex-col bg-card/40 backdrop-blur-md border border-border/50 rounded-3xl overflow-hidden shadow-xl group-hover:border-primary/50 transition-colors relative z-0">
                  <div className="h-48 relative overflow-hidden bg-muted">
                    {goal.imageUrl ? (
                      <img
                        src={goal.imageUrl}
                        alt={goal.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        Tanpa Gambar
                      </div>
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-card to-transparent" />

                    <div className="absolute top-4 right-4 flex gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-background/80 backdrop-blur-md shadow-sm border-border/50 font-black"
                      >
                        {goal.type.toUpperCase()}
                      </Badge>
                      <Badge
                        className={`${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} backdrop-blur-md border`}
                      >
                        {statusConfig.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col flex-1 relative z-20">
                    <h2 className="text-xl font-bold text-foreground mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                      {goal.title}
                    </h2>

                    <div className="mt-auto pt-6">
                      <div className="flex justify-between text-sm font-bold mb-2">
                        <span className="text-foreground">
                          {goal.currentAmount.toLocaleString("id-ID")}
                        </span>
                        <span className="text-muted-foreground">
                          dari {goal.targetAmount.toLocaleString("id-ID")}{" "}
                          {goal.type.toUpperCase()}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2.5 bg-muted" />
                      <div className="mt-4 flex justify-between items-center text-xs text-muted-foreground font-bold">
                        <span>{goal.participants?.length || 0} Partisipan</span>
                        <span>{progress}% Tercapai</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
