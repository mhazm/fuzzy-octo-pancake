"use client";

import { useState } from "react";
import Link from "next/link";
import { showAlert } from "@/lib/dialog";
import {
  Search,
  Filter,
  ExternalLink,
  CheckCircle2,
  XCircle,
  UserCheck,
  UserMinus,
  Trash2,
  AlertTriangle,
} from "lucide-react";

export default function ManageUsersTable({
  initialData,
}: {
  initialData: any[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // State untuk Modal Purge
  const [purgeUserId, setPurgeUserId] = useState<string | null>(null);
  const [purgePassword, setPurgePassword] = useState("");
  const [isPurging, setIsPurging] = useState(false);

  const handlePurge = async () => {
    if (!purgeUserId || !purgePassword) return await showAlert("Discord ID atau Password tidak boleh kosong!");
    setIsPurging(true);
    try {
      const res = await fetch(`/api/manage/users/${purgeUserId}/purge`, {
        method: "DELETE",
        headers: {
          "x-purge-password": purgePassword,
        },
      });

      const data = await res.json();
      if (res.ok) {
        await showAlert("Berhasil menghapus data user!");
        window.location.reload();
      } else {
        await showAlert(`Gagal: ${data.error || data.message || "Password salah"}`);
      }
    } catch (error) {
      console.error(error);
      await showAlert("Terjadi kesalahan jaringan.");
    } finally {
      setIsPurging(false);
      setPurgeUserId(null);
      setPurgePassword("");
    }
  };

  // Logika Filter & Search
  const filteredUsers = initialData.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.truckyId.toString().includes(searchTerm) ||
      user.discordId?.includes(searchTerm); // Tambahkan pencarian Discord ID

    const matchesFilter =
      filterStatus === "all"
        ? true
        : filterStatus === "active"
          ? !user.isOnLeave
          : filterStatus === "leave"
            ? user.isOnLeave
            : filterStatus === "web"
              ? user.isWebActive
              : true;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* SEARCH & FILTER BAR */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/20 group-focus-within:text-accent-lilac transition-colors"
            size={18}
          />
          <input
            type="text"
            placeholder="Cari Nama, Trucky ID, atau Discord ID..."
            className="w-full bg-white/5 border border-border rounded-2xl py-4 pl-12 pr-4 text-(-primary-foreground) placeholder:text-foreground/20 focus:outline-none focus:border-accent-lilac transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <div className="relative flex items-center">
            <Filter className="absolute left-4 text-foreground/20" size={16} />
            <select
              className="bg-white/5 border border-border rounded-2xl py-4 pl-10 pr-8 text-(-primary-foreground) focus:outline-none focus:border-accent-lilac appearance-none font-bold text-xs uppercase tracking-widest cursor-pointer"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all" className="bg-card">
                All Drivers
              </option>
              <option value="active" className="bg-card">
                Active Only
              </option>
              <option value="leave" className="bg-card">
                On Leave
              </option>
              <option value="web" className="bg-card">
                Registered Web
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="glass-panel rounded-[2rem] border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-foreground/20 text-[10px] font-black uppercase tracking-widest border-b border-border bg-white/5">
                <th className="px-8 py-5">Driver Info</th>
                <th className="px-8 py-5">Driver Status</th>
                <th className="px-8 py-5">Web Access</th>
                <th className="px-8 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-white/[0.02] group transition-all"
                  >
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={
                            user.image ||
                            `https://ui-avatars.com/api/?name=${user.name}&background=6D28D9&color=fff`
                          }
                          className="w-10 h-10 rounded-full border border-border"
                          alt=""
                        />
                        <div>
                          <p className="font-black text-(-primary-foreground) leading-none uppercase tracking-tight">
                            {user.name}
                          </p>
                          <p className="text-[10px] font-bold text-foreground/30 uppercase mt-1">
                            #{user.truckyId} • {user.role}
                          </p>
                          {/* Menampilkan Discord ID tipis untuk membantu audit */}
                          <p className="text-[8px] font-mono text-foreground/10 uppercase mt-0.5 italic">
                            {user.discordId}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-8 py-4">
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${user.isOnLeave ? "bg-orange-500/10 text-orange-500 border border-orange-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}
                      >
                        {user.isOnLeave ? (
                          <UserMinus size={12} />
                        ) : (
                          <UserCheck size={12} />
                        )}
                        {user.isOnLeave ? "On Leave" : "Active"}
                      </div>
                    </td>

                    <td className="px-8 py-4">
                      <div
                        className={`flex items-center gap-2 text-[10px] font-black uppercase ${user.isWebActive ? "text-accent-lilac" : "text-foreground/20"}`}
                      >
                        {user.isWebActive ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <XCircle size={12} />
                        )}
                        {user.isWebActive ? "Web Registered" : "Not Logged In"}
                      </div>
                    </td>

                    <td className="px-8 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/manage/data/users/${user.truckyId}`}
                          className="inline-flex items-center justify-center p-3 bg-white/5 rounded-xl text-foreground/40 hover:text-(-primary-foreground) hover:bg-accent-lilac transition-all group/btn"
                        >
                          <ExternalLink
                            size={18}
                            className="group-hover/btn:scale-110 transition-transform"
                          />
                        </Link>
                        {user.discordId && (
                          <button
                            onClick={() => setPurgeUserId(user.discordId)}
                            className="inline-flex items-center justify-center p-3 bg-red-500/10 rounded-xl text-red-500 hover:text-white hover:bg-red-600 transition-all group/btn"
                          >
                            <Trash2
                              size={18}
                              className="group-hover/btn:scale-110 transition-transform"
                            />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-8 py-20 text-center text-foreground/20 font-black uppercase tracking-[0.2em] italic"
                  >
                    No drivers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PURGE */}
      {purgeUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-red-500/30 rounded-[2rem] max-w-md w-full p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -z-10" />
            
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-red-500/10 text-red-500 rounded-full">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-foreground uppercase tracking-tight">
                  Warning: Data Purge
                </h3>
                <p className="text-muted-foreground text-xs mt-2 leading-relaxed">
                  Anda akan menghapus SELURUH data secara permanen untuk user dengan Discord ID <span className="font-mono text-red-400">{purgeUserId}</span>. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>

              <div className="w-full text-left space-y-2 mt-4">
                <label className="text-[10px] font-black uppercase text-foreground/40 tracking-widest pl-2">
                  Password Verifikasi
                </label>
                <input
                  type="password"
                  value={purgePassword}
                  onChange={(e) => setPurgePassword(e.target.value)}
                  className="w-full bg-black/50 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 focus:outline-none focus:border-red-500 font-mono tracking-widest"
                  placeholder="Masukkan Password Purge..."
                />
              </div>

              <div className="flex w-full gap-3 mt-6">
                <button
                  onClick={() => {
                    setPurgeUserId(null);
                    setPurgePassword("");
                  }}
                  disabled={isPurging}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase bg-white/5 hover:bg-white/10 text-foreground transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handlePurge}
                  disabled={isPurging || !purgePassword}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isPurging ? (
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Eksekusi Purge"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
