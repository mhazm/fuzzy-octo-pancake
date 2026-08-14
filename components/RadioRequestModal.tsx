"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Loader2, Music2, CheckCircle2, AlertCircle } from "lucide-react";

interface Song {
  request_id: string;
  song: {
    id: string;
    text: string;
    artist: string;
    title: string;
    album: string;
    art: string;
  };
}

interface RadioRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RadioRequestModal({ isOpen, onClose }: RadioRequestModalProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [requestStatus, setRequestStatus] = useState<{
    id: string | null;
    status: "loading" | "success" | "error";
    message: string;
  }>({ id: null, status: "loading", message: "" });

  // Fetch requestable songs when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchSongs = async () => {
        setIsLoading(true);
        try {
          const res = await fetch("/api/radio/requests");
          if (res.ok) {
            const data = await res.json();
            setSongs(data);
            setFilteredSongs(data);
          }
        } catch (error) {
          console.error("Failed to fetch requests", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchSongs();
      
      // Reset state
      setSearchQuery("");
      setRequestStatus({ id: null, status: "loading", message: "" });
    }
  }, [isOpen]);

  // Handle client-side filtering
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSongs(songs);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = songs.filter(
      (item) =>
        item.song.title.toLowerCase().includes(query) ||
        item.song.artist.toLowerCase().includes(query)
    );
    setFilteredSongs(filtered);
  }, [searchQuery, songs]);

  // Handle submit request
  const handleRequest = async (song: Song) => {
    if (requestStatus.status === "loading" && requestStatus.id !== null) return;
    
    setRequestStatus({ id: song.request_id, status: "loading", message: "" });
    
    try {
      const res = await fetch("/api/radio/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: song.request_id }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setRequestStatus({
          id: song.request_id,
          status: "success",
          message: "Lagu berhasil masuk antrean!",
        });
      } else {
        setRequestStatus({
          id: song.request_id,
          status: "error",
          message: data.error || "Gagal request lagu. Mungkin kamu harus menunggu.",
        });
      }
    } catch (error) {
      setRequestStatus({
        id: song.request_id,
        status: "error",
        message: "Terjadi kesalahan koneksi.",
      });
    }

    // Clear success message after 3 seconds
    setTimeout(() => {
      setRequestStatus({ id: null, status: "loading", message: "" });
    }, 4000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md glass-panel bg-card/60 rounded-2xl overflow-hidden flex flex-col shadow-2xl max-h-[85vh] border border-border"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/40 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Music2 className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Request Lagu</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-border bg-card/20">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Cari judul lagu atau artis..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-muted/50 border border-border text-foreground text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Content / List */}
            <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-2 min-h-[300px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">Memuat daftar lagu...</p>
                </div>
              ) : filteredSongs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center gap-2">
                  <Music2 className="w-10 h-10 opacity-20" />
                  <p className="text-sm font-medium">Lagu tidak ditemukan.</p>
                  <p className="text-xs opacity-70">Coba kata kunci lain.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {filteredSongs.map((item) => (
                    <div
                      key={item.request_id}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border group"
                    >
                      <div className="flex flex-col overflow-hidden pr-4">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {item.song.title}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {item.song.artist}
                        </span>
                        
                        {/* Status Message */}
                        {requestStatus.id === item.request_id && requestStatus.message && (
                          <div className={`flex items-center gap-1.5 mt-1.5 text-xs font-medium animate-in fade-in slide-in-from-top-1 ${requestStatus.status === "success" ? "text-green-500" : "text-red-500"}`}>
                            {requestStatus.status === "success" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                            <span className="truncate">{requestStatus.message}</span>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => handleRequest(item)}
                        disabled={requestStatus.status === "loading" && requestStatus.id === item.request_id}
                        className="shrink-0 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground text-xs font-bold px-4 py-2 rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:hover:bg-primary/10 disabled:hover:text-primary"
                      >
                        {requestStatus.status === "loading" && requestStatus.id === item.request_id ? (
                          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                        ) : (
                          "Request"
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-5 py-3 border-t border-border bg-card/40 backdrop-blur-md text-center">
              <p className="text-[10px] text-muted-foreground">
                Didukung oleh Nismara Radio AutoDJ
              </p>
            </div>
            
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
