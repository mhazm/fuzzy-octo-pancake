"use client";

import { useState } from "react";
import Link from "next/link";
import { joinTeamAction } from "@/app/actions/teamHqActions";
import ReactMarkdown from "react-markdown";
import { showAlert } from "@/lib/dialog";


interface TeamProfileUIProps {
  team: any;
  members: any[];
  recentJobs: any[];
  isOwner: boolean;
  currentUserId?: string;
}

export default function TeamProfileUI({
  team,
  members,
  recentJobs,
  isOwner,
  currentUserId,
}: TeamProfileUIProps) {
  const [activeTab, setActiveTab] = useState<"members" | "recent-jobs">(
    "members",
  );
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!currentUserId) return await showAlert("Silakan login terlebih dahulu.");
    setLoading(true);
    try {
      await joinTeamAction(team._id, currentUserId);
      await showAlert("Permintaan bergabung berhasil dikirim!");
    } catch (err) {
      await showAlert("Gagal mengirim permintaan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* HEADER / COVER PROFILE */}
      <div className="relative w-full h-48 sm:h-64 bg-card overflow-hidden border-b border-border">
        {team.bannerUrl ? (
          <img
            src={team.bannerUrl}
            alt="Banner"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-primary/20 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-24 relative z-10">
        <div className="flex justify-between items-end mb-6">
          {/* LOGO TIM */}
          <div className="h-32 w-32 sm:h-40 sm:w-40 rounded-full border-4 border-background bg-card overflow-hidden shadow-2xl flex items-center justify-center">
            {team.logoUrl ? (
              <img
                src={team.logoUrl}
                alt={team.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-4xl font-bold text-gradient">NS</span>
            )}
          </div>

          <div className="flex gap-2 mb-4 sm:mb-8">
            {isOwner ? (
              <Link
                href={`/teams/hq/${team.uri}`}
                className="px-6 py-2.5 bg-accent-lilac text-white font-bold rounded-full shadow-lg hover:scale-105 transition-all"
              >
                Manage Team
              </Link>
            ) : (
              // Periksa apakah user sudah bergabung atau belum
              !members.some((m) => m._id === currentUserId) && (
                <button
                  onClick={handleJoin}
                  disabled={loading}
                  className={`px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-full shadow-lg transition-all ${
                    loading
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:scale-105 active:scale-95"
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </div>
                  ) : (
                    "Join Team"
                  )}
                </button>
              )
            )}
          </div>
        </div>

        {/* --- LAYOUT INFO & STATS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* KOLOM KIRI: INFO TIM (2/3) */}
          <div className="md:col-span-2">
            <h1 className="text-3xl sm:text-4xl font-black text-foreground flex items-center gap-3">
              {team.name}
              <span className="text-sm font-bold px-2 py-1 bg-foreground/10 rounded-md opacity-60">
                {team.tag}
              </span>
            </h1>
            <p className="text-accent-sky text-sm font-bold mb-3">
              @{team.uri}
            </p>
            <div className="prose prose-invert prose-sm max-w-none text-foreground/80">
              <ReactMarkdown>
                {team.description || "Welcome to our official team page."}
              </ReactMarkdown>
            </div>

            <div className="flex gap-4 mt-4 text-xs font-bold text-foreground/40 uppercase tracking-widest">
              <span className="flex items-center gap-1.5">
                📍 {team.location || "Indonesia"}
              </span>
              <span className="flex items-center gap-1.5">
                📅 Est.{" "}
                {new Date(team.createdAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }) || "2026"}
              </span>
            </div>
          </div>

          {/* KOLOM KANAN: STATS CARD (1/3) */}
          <div className="glass-panel p-5 rounded-2xl border border-border/50 shadow-inner flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-foreground/40 uppercase tracking-tighter">
                  Team Level
                </p>
                <h2 className="text-3xl font-black text-gradient leading-tight">
                  LVL {team.level}
                </h2>
              </div>
              <div className="p-2 bg-primary/10 rounded-lg">
                <span className="text-xl">🏆</span>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-[10px] font-bold mb-1">
                <span className="text-foreground/60 uppercase">
                  {team.totalXp?.toLocaleString("id-ID")} XP
                </span>
                <span className="text-accent-sky">
                  {Math.round(team.progress)}%
                </span>
              </div>
              <div className="h-2 w-full bg-foreground/5 rounded-full overflow-hidden border border-border/30">
                <div
                  className="h-full bg-linear-to-r from-primary via-accent-lilac to-accent-sky transition-all duration-1000"
                  style={{ width: `${team.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="max-w-4xl mx-auto border-b border-border">
        <nav className="flex" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("members")}
            className={`w-1/2 py-4 text-center text-sm font-bold transition-all relative ${
              activeTab === "members"
                ? "text-primary"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            Members ({members.length})
            {activeTab === "members" && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-primary rounded-t-md" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("recent-jobs")}
            className={`w-1/2 py-4 text-center text-sm font-bold transition-all relative ${
              activeTab === "recent-jobs"
                ? "text-accent-sky"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            Recent Jobs
            {activeTab === "recent-jobs" && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-accent-sky rounded-t-md" />
            )}
          </button>
        </nav>
      </div>

      {/* TABS CONTENT */}
      <div className="max-w-4xl mx-auto mt-6 px-4">
        {activeTab === "members" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {members.map((member) => (
              <Link href={`/profile/${member.truckyId}`} key={member._id}>
                <div
                  key={member._id}
                  className="flex items-center gap-4 p-4 rounded-xl glass-panel border border-border hover:border-primary/50 transition-all"
                >
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-14 h-14 rounded-full border border-primary/30 object-cover"
                  />
                  <div>
                    <h3 className="text-foreground font-semibold">
                      {member.name}
                    </h3>
                    <p className="text-sm text-foreground/60">
                      Driver ID: #{member.truckyId || "N/A"}
                    </p>
                    <p className="text-sm text-foreground/60">
                      Member XP {member.xp || "N/A"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {activeTab === "recent-jobs" && (
          <div className="space-y-0 rounded-xl overflow-hidden glass-panel border border-border">
            {recentJobs.length > 0 ? (
              recentJobs.map((job, index) => (
                <div
                  key={job._id}
                  className={`p-4 sm:p-6 hover:bg-foreground/5 transition-colors ${index !== recentJobs.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div className="flex gap-4">
                    <img
                      src={job.driverImage}
                      alt={job.driverName}
                      className="w-12 h-12 rounded-full border border-accent-sky/30 object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold text-foreground">
                          {job.driverName}
                        </p>
                        <p className="text-xs text-foreground/50">
                          {new Date(job.completedAt).toLocaleDateString(
                            "id-ID",
                          )}
                        </p>
                      </div>
                      <p className="text-foreground/80 text-sm mb-3">
                        Menyelesaikan pengiriman{" "}
                        <span className="font-semibold text-primary">
                          {job.cargoName}
                        </span>{" "}
                        dari{" "}
                        <span className="font-semibold text-accent-sky">
                          {job.sourceCity}
                        </span>{" "}
                        ke{" "}
                        <span className="font-semibold text-accent-sky">
                          {job.destinationCity}
                        </span>
                        .
                      </p>
                      <div className="rounded-lg border border-border bg-card/50 p-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                        <div className="flex flex-col">
                          <span className="text-xs text-foreground/50 uppercase">
                            Platform
                          </span>
                          <span className="font-medium">{job.game}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-foreground/50 uppercase">
                            Jarak
                          </span>
                          <span className="font-medium">
                            {job.distanceKm} km
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-foreground/50 uppercase">
                            Pendapatan
                          </span>
                          <span className="font-medium text-green-500">
                            NC {job.nc?.total?.toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-foreground/50">
                Belum ada aktivitas pengiriman.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
