"use client";

import { useState } from "react";
import { Medal, X } from "lucide-react";

interface AchievementDetail {
  _id: string;
  name: string;
  description: string;
  imageUrl?: string;
}

interface UserAchievement {
  _id: string;
  count: number;
  lastEarned: string | Date;
  achievementDetails: AchievementDetail;
}

export default function AchievementSection({
  userAchievements,
}: {
  userAchievements: any[];
}) {
  const [showModal, setShowModal] = useState(false);
  const maxDisplay = 8;
  const displayedAchievements = userAchievements.slice(0, maxDisplay);
  const hasMore = userAchievements.length > maxDisplay;

  const totalBadges = userAchievements.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <>
      <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-foreground/90 uppercase tracking-widest text-sm mb-6 border-b border-border/50 pb-4 flex items-center justify-between">
          <span>Lencana</span>
          <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs">
            {totalBadges}
          </span>
        </h2>

        {userAchievements.length > 0 ? (
          <>
            <div className="grid grid-cols-4 gap-3">
              {displayedAchievements.map((ua) => (
                <div
                  key={ua._id.toString()}
                  className="group relative flex flex-col items-center"
                >
                  <div className="aspect-square w-full bg-background/50 rounded-lg border border-border/50 flex items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 relative">
                    {ua.achievementDetails?.imageUrl ? (
                      <img
                        src={ua.achievementDetails.imageUrl}
                        alt={ua.achievementDetails.name}
                        className="w-10 h-10 object-contain drop-shadow-md group-hover:scale-110 transition-transform"
                      />
                    ) : (
                      <Medal className="w-8 h-8 text-primary/70 group-hover:text-primary group-hover:scale-110 transition-all drop-shadow-md" />
                    )}

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] bg-card border border-border/50 shadow-xl rounded-lg p-2.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                      <p className="text-sm font-bold text-foreground text-center mb-1">
                        {ua.achievementDetails?.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground text-center">
                        {ua.lastEarned
                          ? new Date(ua.lastEarned).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })
                          : "Tidak diketahui"}
                      </p>
                    </div>
                  </div>

                  {/* Counter Badge Below (only if count > 1) */}
                  {ua.count > 1 && (
                    <div className="mt-1.5 bg-background/80 border border-border/50 rounded-md px-2 py-0.5 text-[11px] font-bold text-foreground shadow-sm">
                      {ua.count}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {hasMore && (
              <button
                onClick={() => setShowModal(true)}
                className="w-full mt-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs uppercase tracking-widest rounded-lg transition-colors border border-primary/20"
              >
                Lihat Semua ({userAchievements.length})
              </button>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-background/50 border border-border/50 flex items-center justify-center mx-auto mb-3">
              <Medal className="w-5 h-5 text-muted-foreground/30" />
            </div>
            <p className="text-xs text-muted-foreground italic">
              Belum ada lencana yang didapatkan.
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col border border-border/50 overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/50 bg-background/50">
              <div>
                <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                  <Medal className="text-primary w-6 h-6" /> Koleksi Lencana
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Seluruh lencana yang telah dikumpulkan ({totalBadges} total)
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 bg-background hover:bg-muted border border-border/50 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-background/20">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {userAchievements.map((ua) => (
                  <div
                    key={ua._id.toString()}
                    className="bg-card border border-border/50 rounded-xl p-4 flex flex-col items-center hover:border-primary/40 transition-colors shadow-sm"
                  >
                    <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center border border-border/50 shadow-inner mb-4 relative">
                      {ua.achievementDetails?.imageUrl ? (
                        <img
                          src={ua.achievementDetails.imageUrl}
                          alt={ua.achievementDetails.name}
                          className="w-12 h-12 object-contain drop-shadow-md"
                        />
                      ) : (
                        <Medal className="w-8 h-8 text-primary/70 drop-shadow-md" />
                      )}
                      
                      {ua.count > 1 && (
                        <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground border-2 border-card rounded-full w-6 h-6 flex items-center justify-center text-[10px] font-black">
                          x{ua.count}
                        </div>
                      )}
                    </div>
                    
                    <h3 className="font-bold text-center text-sm mb-1 leading-tight">
                      {ua.achievementDetails?.name}
                    </h3>
                    
                    {ua.achievementDetails?.description && (
                      <p className="text-[10px] text-muted-foreground text-center mb-3 line-clamp-2">
                        {ua.achievementDetails.description}
                      </p>
                    )}
                    
                    <div className="mt-auto pt-3 border-t border-border/50 w-full text-center">
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
                        Terakhir Didapat
                      </p>
                      <p className="text-[11px] font-medium text-foreground mt-0.5">
                        {ua.lastEarned
                          ? new Date(ua.lastEarned).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
