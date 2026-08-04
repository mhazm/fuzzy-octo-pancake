"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Crown, ShieldAlert, Award, ChevronDown } from "lucide-react";

interface DriverData {
  truckyId: number;
  name: string;
  image: string;
  role: string;
  roleColor: string;
  rank: string;
  rankColor: string;
  isNismaraPlus: boolean;
}

interface DriversClientProps {
  drivers: DriverData[];
}

export default function DriversClient({ drivers }: DriversClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [rankFilter, setRankFilter] = useState("ALL");

  // Dapatkan daftar Role unik yang ada
  const uniqueRoles = useMemo(() => {
    const roles = new Set<string>();
    drivers.forEach((d) => {
      if (d.role) roles.add(d.role);
    });
    return Array.from(roles);
  }, [drivers]);

  // Dapatkan daftar Rank unik yang ada
  const uniqueRanks = useMemo(() => {
    const ranks = new Set<string>();
    drivers.forEach((d) => {
      if (d.rank) ranks.add(d.rank);
    });
    return Array.from(ranks);
  }, [drivers]);

  // Filter Data
  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      const matchesSearch = driver.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "ALL" || driver.role === roleFilter;
      const matchesRank = rankFilter === "ALL" || driver.rank === rankFilter;
      
      return matchesSearch && matchesRole && matchesRank;
    });
  }, [drivers, searchQuery, roleFilter, rankFilter]);

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/50 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-xl">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cari driver..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          {/* Role Filter */}
          <div className="relative w-full sm:w-48">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full appearance-none px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              <option value="ALL">Semua Jabatan</option>
              {uniqueRoles.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          </div>

          {/* Rank Filter */}
          <div className="relative w-full sm:w-48">
            <select
              value={rankFilter}
              onChange={(e) => setRankFilter(e.target.value)}
              className="w-full appearance-none px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              <option value="ALL">Semua Pangkat</option>
              {uniqueRanks.map((rank) => (
                <option key={rank} value={rank}>{rank}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredDrivers.map((driver) => (
          <Link href={`/profile/${driver.truckyId}`} key={driver.truckyId}>
            <div className="group relative bg-card/40 backdrop-blur-md border border-white/10 rounded-3xl p-6 transition-all duration-300 hover:scale-[1.02] hover:bg-card/60 hover:shadow-2xl hover:shadow-primary/20 flex flex-col items-center text-center overflow-hidden h-full">
              
              {/* Nismara+ Glow Effect */}
              {driver.isNismaraPlus && (
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
              )}
              
              {/* Avatar */}
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-primary/50 transition-colors z-10 relative bg-slate-800">
                  <Image
                    src={driver.image}
                    alt={driver.name}
                    width={96}
                    height={96}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                </div>
                {/* Nismara+ Crown Badge */}
                {driver.isNismaraPlus && (
                  <div className="absolute -top-3 -right-3 z-20 bg-gradient-to-br from-yellow-400 to-amber-600 p-1.5 rounded-full shadow-lg shadow-yellow-500/30 border-2 border-slate-900 animate-pulse">
                    <Crown className="w-4 h-4 text-slate-900" />
                  </div>
                )}
              </div>

              {/* Name */}
              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-primary transition-colors flex items-center justify-center gap-2">
                {driver.name}
              </h3>

              {/* Badges Container */}
              <div className="flex flex-col gap-2 w-full mt-auto">
                {/* Role Badge */}
                {driver.role && (
                  <div 
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ 
                      backgroundColor: `${driver.roleColor}15`, 
                      color: driver.roleColor,
                      border: `1px solid ${driver.roleColor}30`
                    }}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    {driver.role}
                  </div>
                )}
                
                {/* Rank Badge */}
                {driver.rank && (
                  <div 
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ 
                      backgroundColor: `${driver.rankColor}15`, 
                      color: driver.rankColor,
                      border: `1px solid ${driver.rankColor}30`
                    }}
                  >
                    <Award className="w-3.5 h-3.5" />
                    {driver.rank}
                  </div>
                )}
              </div>

            </div>
          </Link>
        ))}

        {filteredDrivers.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400">
            <Search className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg">Tidak ada driver yang ditemukan.</p>
          </div>
        )}
      </div>
    </div>
  );
}
