"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, AlertTriangle, User, Clock, ArrowRight } from "lucide-react";

type SecurityAlert = {
  _id: string;
  discordId: string;
  action: string;
  amount: number;
  details: string;
  isResolved: boolean;
  createdAt: string;
};

export default function SecurityDashboard() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch("/api/manage/security");
        if (res.ok) {
          const data = await res.json();
          setAlerts(data.alerts);
        } else {
          setError("Gagal memuat data log keamanan. Pastikan Anda memiliki akses Admin atau Manager.");
        }
      } catch (err) {
        setError("Terjadi kesalahan jaringan.");
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  return (
    <main className="p-6 space-y-6 animate-in fade-in duration-700">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-red-500/20 rounded-xl">
          <ShieldAlert className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tight">Security & Alerts</h1>
          <p className="text-muted-foreground font-medium">Pemantauan aktivitas ekstrem dan deteksi dini sistem.</p>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-xl font-bold uppercase tracking-widest text-red-500 flex items-center gap-2 mb-6">
          <AlertTriangle className="w-5 h-5" /> 
          Log Transaksi Ekstrem (&gt;10.000 N¢)
        </h2>

        {loading ? (
          <p className="text-muted-foreground animate-pulse">Memuat log...</p>
        ) : error ? (
          <p className="text-destructive font-bold bg-destructive/10 p-4 rounded-xl border border-destructive/20">{error}</p>
        ) : alerts.length === 0 ? (
          <div className="text-center py-12 bg-background/50 rounded-xl border border-dashed border-border">
            <ShieldAlert className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Belum ada aktivitas ekstrem yang terdeteksi.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div 
                key={alert._id} 
                className={`p-4 rounded-xl border flex flex-col md:flex-row gap-4 justify-between items-start md:items-center transition-all ${
                  alert.isResolved 
                    ? "bg-background/40 border-border/50 opacity-60" 
                    : "bg-red-500/10 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                }`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                      alert.isResolved ? "bg-slate-500/20 text-slate-400" : "bg-red-500 text-white"
                    }`}>
                      {alert.action}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 font-bold">
                      <Clock className="w-3 h-3" />
                      {new Date(alert.createdAt).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{alert.details}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 font-bold uppercase tracking-widest">
                    <User className="w-3 h-3" /> Discord ID: {alert.discordId}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Nilai Transaksi</p>
                    <p className={`text-xl font-black ${alert.isResolved ? "text-foreground" : "text-red-500"}`}>
                      {alert.amount.toLocaleString("id-ID")} N¢
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
