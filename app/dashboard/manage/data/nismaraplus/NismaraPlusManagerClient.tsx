"use client";

import React, { useState, useEffect } from "react";
import { Search, UserPlus, Crown, MoreVertical, X, Calendar, ShieldOff, Loader2 } from "lucide-react";
import { searchUsers, grantOrExtendNismaraPlus, revokeNismaraPlus } from "./actions";
import { showAlert, showConfirm } from "@/lib/dialog";


interface User {
  _id: string;
  discordId: string;
  name: string;
  image?: string;
  nismaraplus?: {
    status: boolean;
    startedAt: string | Date;
    expiredAt: string | Date;
  };
}

export default function NismaraPlusManagerClient({ initialUsers }: { initialUsers: User[] }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal context for actions
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionUser, setActionUser] = useState<User | null>(null);

  // Helper
  const DURATIONS = [
    { label: "1 Bulan", value: 1 },
    { label: "3 Bulan", value: 3 },
    { label: "6 Bulan", value: 6 },
    { label: "1 Tahun", value: 12 },
  ];

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 2) {
        setIsSearching(true);
        const res = await searchUsers(searchQuery);
        if (res.success && res.data) {
          setSearchResults(res.data as User[]);
        }
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleGrant = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);
    const res = await grantOrExtendNismaraPlus(selectedUser.discordId, selectedDuration);
    if (res.success) {
      await showAlert(res.message);
      setIsAddModalOpen(false);
      setSelectedUser(null);
      setSearchQuery("");
    } else {
      await showAlert(res.message);
    }
    setIsProcessing(false);
  };

  const handleExtend = async () => {
    if (!actionUser) return;
    setIsProcessing(true);
    const res = await grantOrExtendNismaraPlus(actionUser.discordId, selectedDuration);
    if (res.success) {
      await showAlert(res.message);
      setActionModalOpen(false);
      setActionUser(null);
    } else {
      await showAlert(res.message);
    }
    setIsProcessing(false);
  };

  const handleRevoke = async () => {
    if (!actionUser) return;
    if (!await showConfirm(`Yakin ingin mencabut akses Nismara+ untuk ${actionUser.name}?`)) return;
    
    setIsProcessing(true);
    const res = await revokeNismaraPlus(actionUser.discordId);
    if (res.success) {
      await showAlert(res.message);
      setActionModalOpen(false);
      setActionUser(null);
    } else {
      await showAlert(res.message);
    }
    setIsProcessing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border border-border p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Crown className="text-amber-400" /> Database Member Nismara+
          </h2>
          <p className="text-sm text-muted-foreground">Kelola anggota yang memiliki akses premium aktif.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl font-bold text-sm transition flex items-center gap-2"
        >
          <UserPlus size={18} /> Tambah Member
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Nama User</th>
                <th className="px-6 py-4">Discord ID</th>
                <th className="px-6 py-4">Terdaftar</th>
                <th className="px-6 py-4">Kedaluwarsa</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initialUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    Belum ada member aktif.
                  </td>
                </tr>
              ) : (
                initialUsers.map((user) => (
                  <tr key={user.discordId} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-foreground">{user.name}</td>
                    <td className="px-6 py-4 font-mono text-muted-foreground">{user.discordId}</td>
                    <td className="px-6 py-4">
                      {user.nismaraplus?.startedAt 
                        ? new Date(user.nismaraplus.startedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) 
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-primary font-bold">
                      {user.nismaraplus?.expiredAt 
                        ? new Date(user.nismaraplus.expiredAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) 
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => {
                          setActionUser(user);
                          setSelectedDuration(1);
                          setActionModalOpen(true);
                        }}
                        className="p-2 hover:bg-muted rounded-lg transition-colors text-foreground"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TAMBAH MEMBER */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2"><UserPlus size={20} /> Tambah Member Nismara+</h3>
              <button onClick={() => { setIsAddModalOpen(false); setSelectedUser(null); setSearchQuery(""); }} className="p-1 text-muted-foreground hover:bg-muted rounded-lg transition">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {!selectedUser ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Cari nama atau Discord ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  
                  <div className="bg-background border border-border rounded-xl h-60 overflow-y-auto p-2">
                    {isSearching ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm gap-2">
                        <Loader2 className="animate-spin" size={16} /> Mencari...
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="space-y-1">
                        {searchResults.map(u => (
                          <div 
                            key={u.discordId} 
                            onClick={() => setSelectedUser(u)}
                            className="p-3 hover:bg-muted rounded-lg cursor-pointer transition-colors flex justify-between items-center"
                          >
                            <div>
                              <p className="font-bold text-sm text-foreground">{u.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{u.discordId}</p>
                            </div>
                            {u.nismaraplus?.status && (
                              <span className="text-[10px] bg-amber-400/20 text-amber-500 px-2 py-1 rounded font-bold">Premium Aktif</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        Ketik untuk mencari user...
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="bg-background p-4 rounded-xl border border-border flex justify-between items-center">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">User Terpilih</p>
                      <p className="font-bold">{selectedUser.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{selectedUser.discordId}</p>
                    </div>
                    <button onClick={() => setSelectedUser(null)} className="text-xs text-primary hover:underline font-bold">Ubah</button>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold text-foreground">Durasi Langganan</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {DURATIONS.map(d => (
                        <button
                          key={d.value}
                          onClick={() => setSelectedDuration(d.value)}
                          className={`p-3 rounded-xl border text-sm font-bold transition-all ${selectedDuration === d.value ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-background hover:bg-muted border-border text-muted-foreground'}`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleGrant}
                    disabled={isProcessing}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Crown size={18} />} 
                    {selectedUser.nismaraplus?.status ? "Extend Nismara+" : "Berikan Akses Nismara+"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL ACTION (EXTEND / REVOKE) */}
      {actionModalOpen && actionUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/20">
              <h3 className="font-bold text-lg flex items-center gap-2">Aksi Member</h3>
              <button onClick={() => setActionModalOpen(false)} className="p-1 text-muted-foreground hover:bg-muted rounded-lg transition">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="text-center space-y-1">
                <p className="font-black text-xl text-foreground">{actionUser.name}</p>
                <p className="text-sm text-muted-foreground font-mono">{actionUser.discordId}</p>
              </div>

              <div className="space-y-3 pt-2 border-t border-border">
                <label className="text-sm font-bold text-foreground">Perpanjang Durasi (Extend)</label>
                <div className="grid grid-cols-2 gap-2">
                  {DURATIONS.map(d => (
                    <button
                      key={d.value}
                      onClick={() => setSelectedDuration(d.value)}
                      className={`p-2 rounded-xl border text-sm font-bold transition-all ${selectedDuration === d.value ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-background hover:bg-muted border-border text-muted-foreground'}`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleExtend}
                  disabled={isProcessing}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl transition-colors mt-2 flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Calendar size={18} />} Perpanjang Akses
                </button>
              </div>

              <div className="pt-6 border-t border-border">
                <button
                  onClick={handleRevoke}
                  disabled={isProcessing}
                  className="w-full bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <ShieldOff size={18} /> Cabut Akses Nismara+
                </button>
                <p className="text-xs text-center text-muted-foreground mt-2">Tindakan ini akan langsung menghentikan semua benefit premium user.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
