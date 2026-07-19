"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  ExternalLink,
  CheckCircle2,
  XCircle,
  UserCheck,
  UserMinus,
} from "lucide-react";

export default function ManageUsersTable({
  initialData,
}: {
  initialData: any[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

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
                      <Link
                        href={`/dashboard/manage/users/${user.truckyId}`}
                        className="inline-flex items-center justify-center p-3 bg-white/5 rounded-xl text-foreground/40 hover:text-(-primary-foreground) hover:bg-accent-lilac transition-all group/btn"
                      >
                        <ExternalLink
                          size={18}
                          className="group-hover/btn:scale-110 transition-transform"
                        />
                      </Link>
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
    </div>
  );
}
