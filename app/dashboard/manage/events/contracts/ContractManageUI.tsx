"use client";

import { useState, useEffect } from "react";
import { createContractAction } from "@/app/actions/contractActions";
import Link from "next/link";
import {
  Plus,
  Calendar,
  History,
  Timer,
  MapPin,
  Truck,
  ChevronRight,
  Gamepad2,
  Briefcase,
} from "lucide-react";

export default function ContractManageUI({ ongoing, history, manager }: any) {
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    contractName: "",
    companyName: "",
    imageUrl: "",
    gameId: "1", // Default ETS2
    endAt: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatDate = (dateString: string) => {
    if (!mounted || !dateString) return "";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getGameInfo = (id: string) => {
    return id === "2"
      ? { name: "ATS", color: "text-accent-sky", bg: "bg-accent-sky/10" }
      : { name: "ETS2", color: "text-accent-lilac", bg: "bg-accent-lilac/10" };
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createContractAction({
        ...formData,
        setBy: manager.discordId,
        guildId: process.env.DISCORD_GUILD_ID || "863959415702028318",
      });
      setIsModalOpen(false);
      alert("Kontrak berhasil dideploy!");
    } catch (err) {
      alert("Gagal membuat kontrak.");
    } finally {
      setLoading(false);
    }
  };

  // Helper untuk membuat slug URL (Contoh: "Lebaran 2026" -> "lebaran-2026")
  const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-(-primary-foreground) tracking-tighter uppercase italic">
            Contract Management
          </h1>
          <p className="text-(-primary-foreground)/50 font-bold uppercase text-[10px] tracking-[0.2em]">
            System Authorization • Logistics Control
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground px-8 py-4 rounded-[2rem] font-black uppercase tracking-tighter transition-all flex items-center gap-3 shadow-xl hover:scale-105 active:scale-95"
        >
          <Plus size={20} /> Create New Contract
        </button>
      </div>

      {/* ONGOING CONTRACTS */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-(-primary-foreground) uppercase italic flex items-center gap-2">
          <Timer className="text-accent-lilac" size={20} /> Ongoing Contracts
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {ongoing.map((c: any) => {
            const game = getGameInfo(c.gameId);
            return (
              <div
                key={c._id}
                className="bg-card border border-border rounded-[2.5rem] overflow-hidden flex flex-col group shadow-2xl"
              >
                <div className="relative h-52">
                  <img
                    src={c.imageUrl}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    alt=""
                  />
                  <div className="absolute inset-0" />
                  <div className="absolute top-4 right-6">
                    <span
                      className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 backdrop-blur-md ${game.bg} ${game.color}`}
                    >
                      {game.name}
                    </span>
                  </div>
                </div>
                <div className="p-8 space-y-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-black text-(-primary-foreground) uppercase leading-none mb-1 italic">
                        {c.contractName}
                      </h3>
                      <p className="text-accent-lilac font-bold text-xs uppercase tracking-widest">
                        {c.companyName}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-border/50">
                    <div>
                      <p className="text-[10px] font-black text-(-primary-foreground)/30 uppercase">
                        Deployment
                      </p>
                      <p className="text-xs font-bold text-(-primary-foreground)">
                        {formatDate(c.setAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-(-primary-foreground)/30 uppercase">
                        Deadline
                      </p>
                      <p className="text-xs font-bold text-red-500">
                        {formatDate(c.endAt)}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/special-contracts/${slugify(c.contractName)}`}
                    className="w-full py-4 bg-foreground/5 hover:bg-primary hover:text-primary-foreground text-(-primary-foreground) rounded-2xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 group/btn"
                  >
                    View Participants{" "}
                    <ChevronRight
                      size={14}
                      className="group-hover/btn:translate-x-1 transition-transform"
                    />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PAST CONTRACTS HISTORY */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-(-primary-foreground) uppercase italic flex items-center gap-2">
          <History className="text-(-primary-foreground)/20" size={20} /> Past
          Operations
        </h2>
        <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-foreground/5 text-(-primary-foreground)/30 text-[10px] font-black uppercase tracking-widest border-b border-border">
              <tr>
                <th className="px-8 py-5">Game</th>
                <th className="px-8 py-5">Contract Name</th>
                <th className="px-8 py-5">Performance</th>
                <th className="px-8 py-5 text-right">Closed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.map((h: any) => {
                const game = getGameInfo(h.gameId);
                return (
                  <tr
                    key={h._id}
                    className="hover:bg-foreground/[0.02] transition-all"
                  >
                    <td className="px-8 py-5">
                      <span
                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border border-border ${game.color} ${game.bg}`}
                      >
                        {game.name}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <p className="font-black text-(-primary-foreground) uppercase">
                        {h.contractName}
                      </p>
                      <p className="text-[10px] font-bold text-accent-lilac uppercase tracking-tighter">
                        {h.companyName}
                      </p>
                    </td>
                    <td className="px-8 py-5 tabular-nums">
                      <div className="flex flex-col">
                        <span className="font-black text-emerald-500">
                          N¢ {h.totalNCEarned?.toLocaleString("id-ID")}
                        </span>
                        <span className="text-[10px] font-bold text-(-primary-foreground)/30">
                          {h.totalDistance?.toLocaleString("id-ID")} KM
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right text-(-primary-foreground)/40 font-mono text-[10px] font-black">
                      {formatDate(h.closedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CREATE CONTRACT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <form
            onSubmit={handleCreate}
            className="bg-card border border-border p-10 rounded-[3rem] w-full max-w-lg shadow-2xl space-y-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12">
              <Briefcase size={150} />
            </div>

            <div className="text-center relative z-10">
              <h3 className="text-3xl font-black text-(-primary-foreground) italic uppercase tracking-tighter">
                New Contract
              </h3>
              <p className="text-(-primary-foreground)/30 text-[10px] font-black uppercase tracking-[0.3em]">
                Operational Deployment System
              </p>
            </div>

            <div className="space-y-4 relative z-10">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-accent-lilac uppercase ml-2">
                    Target Game
                  </label>
                  <select
                    className="w-full bg-foreground/5 border border-border rounded-2xl p-4 text-(-primary-foreground) font-bold text-sm outline-none focus:border-accent-lilac"
                    onChange={(e) =>
                      setFormData({ ...formData, gameId: e.target.value })
                    }
                  >
                    <option value="1">Euro Truck Simulator 2</option>
                    <option value="2">American Truck Simulator</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-accent-lilac uppercase ml-2">
                    Deadline
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full bg-foreground/5 border border-border rounded-2xl p-4 text-(-primary-foreground) text-sm outline-none focus:border-accent-lilac"
                    onChange={(e) =>
                      setFormData({ ...formData, endAt: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-accent-lilac uppercase ml-2">
                  Contract & Company Info
                </label>
                <div className="space-y-2">
                  <input
                    placeholder="Contoh: Mudik Lebaran 2026"
                    required
                    className="w-full bg-foreground/5 border border-border rounded-2xl p-4 text-(-primary-foreground) text-sm"
                    onChange={(e) =>
                      setFormData({ ...formData, contractName: e.target.value })
                    }
                  />
                  <input
                    placeholder="Nama Perusahaan (Client)"
                    required
                    className="w-full bg-foreground/5 border border-border rounded-2xl p-4 text-(-primary-foreground) text-sm"
                    onChange={(e) =>
                      setFormData({ ...formData, companyName: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-accent-lilac uppercase ml-2">
                  Cover Image URL
                </label>
                <input
                  placeholder="Link gambar Imgur/Discord"
                  className="w-full bg-foreground/5 border border-border rounded-2xl p-4 text-(-primary-foreground) text-sm"
                  onChange={(e) =>
                    setFormData({ ...formData, imageUrl: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 relative z-10 pt-4">
              <button
                disabled={loading}
                type="submit"
                className="w-full bg-primary text-primary-foreground py-5 rounded-[2rem] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-primary/20"
              >
                {loading ? "Deploying..." : "Authorize Deployment"}
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-full py-2 text-(-primary-foreground)/20 font-black uppercase text-[10px] tracking-widest"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
