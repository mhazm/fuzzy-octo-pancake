"use client";

import { useEffect, useRef, useState } from "react";
import { useRadioStore } from "@/lib/store/useRadioStore";
import {
  Play,
  Pause,
  Radio,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Loader2,
  ListMusic,
  Clock,
  Music2,
  ExternalLink,
  CalendarDays
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import RadioRequestModal from "./RadioRequestModal";

export default function RadioWidget() {
  const {
    isOpen,
    isPlaying,
    volume,
    nowPlaying,
    setOpen,
    setPlaying,
    setVolume,
    setNowPlaying,
  } = useRadioStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRequestModalOpen, setRequestModalOpen] = useState(false);

  // Fetch Now Playing data
  useEffect(() => {
    const fetchNowPlaying = async () => {
      try {
        const res = await fetch("/api/radio/nowplaying");
        if (res.ok) {
          const data = await res.json();
          setNowPlaying(data);
        }
      } catch (error) {
        console.error("Failed to fetch radio data", error);
      }
    };

    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 15000); // 15 seconds
    return () => clearInterval(interval);
  }, [setNowPlaying]);

  // Handle Audio Play/Pause
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        if (audioRef.current.paused) {
          setIsLoading(true);
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => setIsLoading(false))
              .catch((e) => {
                console.error("Playback failed:", e);
                setPlaying(false);
                setIsLoading(false);
              });
          }
        }
      } else {
        audioRef.current.pause();
        setIsLoading(false);
      }
    }
  }, [isPlaying, setPlaying]);

  // Handle Volume change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPlaying(!isPlaying);
  };

  const streamUrl =
    "https://radio.nismara.web.id:8443/listen/nismara_radio/radio.mp3";

  return (
    <>
      <audio ref={audioRef} src={streamUrl} preload="none" />

      <div className="fixed bottom-6 left-6 z-50 flex items-end">
        <AnimatePresence mode="wait">
          {isOpen ? (
            // ==================== EXPANDED WIDGET ====================
            <motion.div
              key="expanded"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-80 glass-panel rounded-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              {/* Header */}
              <div className="flex justify-between items-center px-4 py-3 border-b border-border bg-card/40 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-primary animate-pulse" />
                  <span className="text-sm font-semibold text-foreground">
                    Nismara Radio
                  </span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>

              {/* Main Content (Scrollable) */}
              <div className="p-4 flex flex-col gap-6 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                
                {/* Now Playing Section */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-36 h-36 rounded-2xl overflow-hidden shadow-xl bg-muted border border-border">
                    {nowPlaying?.art ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={nowPlaying.art}
                        alt="Album Art"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Radio className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    {isPlaying && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                        <div className="flex gap-1.5 items-end h-5">
                          {[1, 2, 3, 4].map((i) => (
                            <motion.div
                              key={i}
                              className="w-1.5 bg-primary rounded-t-sm"
                              animate={{ height: ["20%", "100%", "20%"] }}
                              transition={{
                                repeat: Infinity,
                                duration: 0.8,
                                delay: i * 0.15,
                                ease: "easeInOut",
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-center w-full px-2">
                    <h3
                      className="font-bold text-foreground text-lg truncate w-full"
                      title={nowPlaying?.title || "Loading..."}
                    >
                      {nowPlaying?.title || "Loading..."}
                    </h3>
                    <p
                      className="text-sm text-muted-foreground truncate w-full mt-0.5"
                      title={nowPlaying?.artist || "Nismara"}
                    >
                      {nowPlaying?.artist || "Nismara"}
                    </p>
                  </div>

                  {/* Primary Controls */}
                  <div className="flex items-center justify-center w-full gap-4 mt-1">
                    <button
                      onClick={togglePlay}
                      disabled={isLoading}
                      className="w-14 h-14 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : isPlaying ? (
                        <Pause className="w-6 h-6" />
                      ) : (
                        <Play className="w-6 h-6 ml-1" />
                      )}
                    </button>
                  </div>

                  {/* Volume Control */}
                  <div className="flex items-center gap-3 w-full px-4 mt-2">
                    <button
                      onClick={() => setVolume(volume === 0 ? 0.5 : 0)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {volume === 0 ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>

                {/* Extra Data Sections (Next, History, Request) */}
                <div className="w-full flex flex-col gap-4 mt-2 pt-4 border-t border-border">
                  
                  {/* Schedule */}
                  {nowPlaying?.schedule && nowPlaying.schedule.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5" /> Jadwal Acara
                      </h4>
                      <div className="flex flex-col gap-1.5">
                        {nowPlaying.schedule.map((item, i) => {
                          const startTime = new Date(item.start).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Asia/Jakarta"
                          });
                          const endTime = new Date(item.end).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Asia/Jakarta"
                          });

                          return (
                            <div 
                              key={i} 
                              className={`flex items-center justify-between p-2 rounded-lg border ${
                                item.is_now 
                                  ? "bg-primary/10 border-primary/30" 
                                  : "bg-muted/30 border-border/50"
                              }`}
                            >
                              <div className="flex flex-col truncate pr-2">
                                <span className={`text-xs font-bold truncate ${item.is_now ? "text-primary" : "text-foreground"}`}>
                                  {item.name}
                                </span>
                                {item.is_now && (
                                  <span className="text-[10px] text-primary font-medium flex items-center gap-1">
                                    <span className="relative flex h-1.5 w-1.5">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                                    </span>
                                    Sedang Berlangsung
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-mono text-muted-foreground shrink-0 bg-background/50 px-1.5 py-0.5 rounded">
                                {startTime} - {endTime}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Next Playing */}
                  {nowPlaying?.playingNext?.title && (
                    <div className="flex flex-col gap-2">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Selanjutnya
                      </h4>
                      <div className="bg-muted/50 p-2.5 rounded-lg border border-border/50">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {nowPlaying.playingNext.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {nowPlaying.playingNext.artist}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Recent History */}
                  {nowPlaying?.songHistory && nowPlaying.songHistory.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                        <ListMusic className="w-3.5 h-3.5" /> Riwayat Lagu
                      </h4>
                      <div className="flex flex-col gap-1.5">
                        {nowPlaying.songHistory.map((song, i) => (
                          <div key={i} className="flex flex-col border-l-2 border-primary/30 pl-2 py-0.5">
                            <p className="text-xs font-medium text-foreground truncate">
                              {song.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {song.artist}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Request Song */}
                  {nowPlaying?.requestsEnabled && (
                    <button 
                      onClick={() => setRequestModalOpen(true)}
                      className="mt-2 w-full flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground py-2.5 rounded-lg text-xs font-semibold transition-colors border border-border"
                    >
                      <Music2 className="w-4 h-4" />
                      Request Lagu
                    </button>
                  )}

                </div>
              </div>
            </motion.div>
          ) : (
            // ==================== ALWAYS-ON MINIMIZED WIDGET ====================
            <motion.div
              key="playing-minimized"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3 glass-panel p-2 pr-4 rounded-full transition-colors hover:bg-card/60 shadow-lg"
            >
              {/* Mini Art & Explicit Play/Pause Button */}
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className="relative w-10 h-10 rounded-full overflow-hidden bg-muted border border-border/50"
                >
                  {nowPlaying?.art ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={nowPlaying.art}
                      alt="Art"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Radio className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <button
                  onClick={togglePlay}
                  className="w-8 h-8 flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground rounded-full transition-transform active:scale-95"
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5 ml-0.5" />
                  )}
                </button>
              </div>

              {/* Info (Click to expand) */}
              <div
                className="flex flex-col max-w-[120px] cursor-pointer"
                onClick={() => setOpen(true)}
              >
                <span className="text-xs font-semibold text-foreground truncate">
                  {nowPlaying?.title || "Live"}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {nowPlaying?.artist || "Radio"}
                </span>
              </div>

              {/* Vertical Divider */}
              <div className="w-px h-6 bg-border mx-1"></div>

              {/* Mini Volume with Expand logic */}
              <div className="flex items-center gap-1 group/vol">
                <button
                  onClick={() => setVolume(volume === 0 ? 0.5 : 0)}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  {volume === 0 ? (
                    <VolumeX className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>
                {/* Volume slider (hidden by default, shows on group hover) */}
                <div className="w-0 overflow-hidden group-hover/vol:w-16 transition-all duration-300 ease-out flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-14 h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary ml-1"
                  />
                </div>
              </div>

              <button
                onClick={() => setOpen(true)}
                className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <RadioRequestModal 
        isOpen={isRequestModalOpen} 
        onClose={() => setRequestModalOpen(false)} 
      />
    </>
  );
}
