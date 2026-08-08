"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Edit2,
  Save,
  X,
  CheckCircle2,
  XCircle,
  Truck,
  Plus,
  Zap,
  User,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";

export default function FleetAssignManager() {
  const [fleets, setFleets] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [gameFilter, setGameFilter] = useState("all");
  const [driverFilter, setDriverFilter] = useState("all"); // "all", "assigned", "unassigned", or "userId"

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    _id: "",
    id: "",
    fleet_name: "",
    game_id: "1",
    fleet_number: "",
    owner: "",
    model: "",
    odometer: 0,
    wheels: "4x2",
    status: "active",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Owner Search State
  const [searchOwnerTerm, setSearchOwnerTerm] = useState("");
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);

  // Filter Users
  const filteredUsers = users.filter((u) => {
    const term = searchOwnerTerm.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.discordId && String(u.discordId).includes(term)) ||
      (u.truckyId && String(u.truckyId).includes(term))
    );
  });

  // Toast State
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resFleets, resStores, resUsers] = await Promise.all([
        fetch("/api/fleet/assign"),
        fetch("/api/fleet/store"),
        fetch("/api/users"),
      ]);
      const dataFleets = await resFleets.json();
      const dataStores = await resStores.json();
      const dataUsers = await resUsers.json();

      setFleets(Array.isArray(dataFleets) ? dataFleets : []);
      setStores(Array.isArray(dataStores) ? dataStores : []);
      setUsers(Array.isArray(dataUsers) ? dataUsers : []);
    } catch (error) {
      showToast("Gagal memuat data", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredFleets = fleets.filter((fleet) => {
    const matchesSearch =
      fleet.fleet_name?.toLowerCase().includes(search.toLowerCase()) ||
      fleet.id?.toLowerCase().includes(search.toLowerCase()) ||
      fleet.fleet_number?.toLowerCase().includes(search.toLowerCase());

    const matchesGame =
      gameFilter === "all" || fleet.game_id?.toString() === gameFilter;

    let matchesDriver = true;
    if (driverFilter === "assigned") matchesDriver = !!fleet.owner;
    else if (driverFilter === "unassigned") matchesDriver = !fleet.owner;
    else if (driverFilter !== "all")
      matchesDriver = fleet.owner?._id === driverFilter;

    return matchesSearch && matchesGame && matchesDriver;
  });

  const handleEditClick = (fleet: any) => {
    setFormData({
      _id: fleet._id,
      id: fleet.id,
      fleet_name: fleet.fleet_name,
      game_id: fleet.game_id.toString(),
      fleet_number: fleet.fleet_number,
      owner: fleet.owner?._id || "",
      model: fleet.model?._id || fleet.model || "",
      odometer: fleet.odometer || 0,
      wheels: fleet.wheels || "4x2",
      status: fleet.status || "active",
    });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const url = isEditMode
        ? `/api/fleet/assign/${formData._id}`
        : `/api/fleet/assign`;
      const method = isEditMode ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Gagal menyimpan data");

      showToast("Fleet berhasil diupdate!", "success");
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      showToast("Gagal menyimpan fleet.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "success" }),
      3000,
    );
  };

  return (
    <main className="p-6 space-y-10 animate-in fade-in duration-700">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 border border-amber-500/20">
              <Zap size={20} />
            </div>
            <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase">
              Fleet Assignment
            </h1>
          </div>
          <p className="text-foreground/40 font-bold uppercase text-[10px] tracking-[0.2em] ml-11">
            Nismara Transport • Assign Fleets to Drivers
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* SEARCH & FILTER BAR */}
        <div className="flex flex-col xl:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/20 group-focus-within:text-amber-500 transition-colors"
              size={18}
            />
            <input
              type="text"
              placeholder="Search plate, id, or number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-border rounded-2xl py-4 pl-12 pr-4 text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-amber-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/manage/fleet/assign/buy"
              className="inline-flex items-center gap-2 px-6 py-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded-2xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap"
            >
              <Plus size={16} /> Buy / Add Fleet
            </Link>
            <div className="relative flex items-center">
              <Filter
                className="absolute left-4 text-foreground/20"
                size={16}
              />
              <select
                value={gameFilter}
                onChange={(e) => setGameFilter(e.target.value)}
                className="bg-white/5 border border-border rounded-2xl py-4 pl-10 pr-8 text-foreground focus:outline-none focus:border-amber-500 appearance-none font-bold text-xs uppercase tracking-widest cursor-pointer"
              >
                <option value="all" className="bg-card">
                  All Games
                </option>
                <option value="1" className="bg-card">
                  ETS2
                </option>
                <option value="2" className="bg-card">
                  ATS
                </option>
              </select>
            </div>
            <div className="relative flex items-center flex-1 sm:flex-none min-w-[200px]">
              <User className="absolute left-4 text-foreground/20" size={16} />
              <select
                value={driverFilter}
                onChange={(e) => setDriverFilter(e.target.value)}
                className="w-full bg-white/5 border border-border rounded-2xl py-4 pl-10 pr-8 text-foreground focus:outline-none focus:border-amber-500 appearance-none font-bold text-xs uppercase tracking-widest cursor-pointer"
              >
                <option value="all" className="bg-card">
                  All Drivers
                </option>
                <option value="assigned" className="bg-card">
                  Has Driver
                </option>
                <option value="unassigned" className="bg-card">
                  No Driver (Available)
                </option>
                <optgroup
                  label="Specific User"
                  className="bg-card text-foreground/40"
                >
                  {users.map((u) => (
                    <option
                      key={u._id}
                      value={u._id}
                      className="bg-card text-foreground"
                    >
                      {u.name || "Unknown"}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="glass-panel rounded-[2rem] border border-border overflow-hidden">
          <div className="overflow-x-auto max-h-[65vh]">
            <table className="w-full text-left border-collapse relative">
              <thead>
                <tr className="text-foreground/20 text-[10px] font-black uppercase tracking-widest border-b border-border bg-card/80 sticky top-0 z-10 backdrop-blur-md">
                  <th className="px-8 py-5">Fleet Info</th>
                  <th className="px-8 py-5">Model</th>
                  <th className="px-8 py-5">Owner</th>
                  <th className="px-8 py-5">Game & Status</th>
                  <th className="px-8 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-8 py-20 text-center text-foreground/20 font-black uppercase tracking-[0.2em] italic"
                    >
                      <div className="flex justify-center items-center gap-3">
                        <Truck className="animate-pulse" size={24} />
                        Loading fleets data...
                      </div>
                    </td>
                  </tr>
                ) : filteredFleets.length > 0 ? (
                  filteredFleets.map((fleet) => (
                    <tr
                      key={fleet._id}
                      className="hover:bg-white/[0.02] group transition-all"
                    >
                      {/* Fleet Info */}
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <span className="inline-block px-2 py-1 mb-1 text-[10px] font-bold bg-white/10 text-foreground border border-border rounded w-fit uppercase font-mono tracking-widest">
                              {fleet.fleet_name || "-"}
                            </span>
                            <p className="text-[10px] font-mono text-foreground/50">
                              ID: {fleet.id} | #{fleet.fleet_number}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Model */}
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          {fleet.model?.photo_url && (
                            <img
                              src={fleet.model.photo_url}
                              alt="Model"
                              className="w-12 h-8 object-cover rounded border border-border"
                            />
                          )}
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                              {fleet.model?.name || "-"}
                            </span>
                            <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                              {fleet.model?.brand?.name || "Unknown"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="px-8 py-4">
                        {fleet.owner ? (
                          <div className="flex items-center gap-2">
                            {fleet.owner.image ? (
                              <img
                                src={fleet.owner.image}
                                alt={fleet.owner.name}
                                className="w-6 h-6 rounded-full border border-amber-500/50"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-[10px] font-black uppercase">
                                {fleet.owner.name?.charAt(0) || "U"}
                              </div>
                            )}
                            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                              {fleet.owner.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-foreground/20 uppercase tracking-wider italic">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Game & Status */}
                      <td className="px-8 py-4">
                        <div className="flex gap-2">
                          {fleet.game_id === "1" ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              ETS2
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-orange-500/10 text-orange-400 border border-orange-500/20">
                              ATS
                            </div>
                          )}
                          <div
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                              fleet.status === "active"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : fleet.status === "onservice"
                                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                                  : "bg-foreground/10 text-foreground/60 border-foreground/20"
                            }`}
                          >
                            {fleet.status}
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-8 py-4 text-right">
                        <button
                          onClick={() => handleEditClick(fleet)}
                          className="inline-flex items-center justify-center p-3 bg-white/5 rounded-xl text-foreground/40 hover:text-amber-500 hover:bg-amber-500/10 transition-all group/btn border border-transparent hover:border-amber-500/20"
                          title="Assign Driver / Edit"
                        >
                          <Edit2
                            size={18}
                            className="group-hover/btn:scale-110 transition-transform"
                          />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-8 py-20 text-center text-foreground/20 font-black uppercase tracking-[0.2em] italic"
                    >
                      No fleets found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ADD/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 animate-in fade-in duration-200">
          <div className="glass-panel p-8 rounded-[2rem] border border-border/50 max-w-3xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-foreground/40 hover:text-foreground transition-colors"
            >
              <X size={20} />
            </button>

            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 border border-amber-500/20">
                  <Edit2 size={16} />
                </div>
                <h2 className="text-xl font-black text-foreground uppercase tracking-tight">
                  Manage Assignment
                </h2>
              </div>
              <p className="text-foreground/40 text-xs font-bold uppercase tracking-widest mt-2">
                Assign driver & update status
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="col-span-1">
                <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                  ID Kendaraan (Unik)
                </label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) =>
                    setFormData({ ...formData, id: e.target.value })
                  }
                  className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-amber-500 transition-all"
                  placeholder="e.g. F-001"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                  Plat Nomor / Nama Fleet
                </label>
                <input
                  type="text"
                  value={formData.fleet_name}
                  disabled
                  onChange={(e) =>
                    setFormData({ ...formData, fleet_name: e.target.value })
                  }
                  className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-amber-500 transition-all uppercase disabled:opacity-50 cursor-not-allowed"
                  placeholder="e.g. B 1234 CD"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                  Nomor Lambung
                </label>
                <input
                  type="text"
                  value={formData.fleet_number}
                  onChange={(e) =>
                    setFormData({ ...formData, fleet_number: e.target.value })
                  }
                  className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-amber-500 transition-all"
                  placeholder="e.g. 01"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                  Game
                </label>
                <select
                  value={formData.game_id}
                  disabled
                  onChange={(e) =>
                    setFormData({ ...formData, game_id: e.target.value })
                  }
                  className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-amber-500 transition-all appearance-none cursor-not-allowed disabled:opacity-50"
                >
                  <option value="1" className="bg-card">
                    ETS2
                  </option>
                  <option value="2" className="bg-card">
                    ATS
                  </option>
                </select>
              </div>

              {/* Model & Driver Section */}
              <div className="col-span-2 border-t border-border/50 pt-4 mt-2">
                <h3 className="text-xs font-black text-foreground/60 uppercase tracking-widest mb-4">
                  Assignment Data
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                      Model / Unit
                    </label>
                    <select
                      value={formData.model}
                      disabled
                      onChange={(e) =>
                        setFormData({ ...formData, model: e.target.value })
                      }
                      className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-amber-500 transition-all appearance-none cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="" disabled className="bg-card">
                        Pilih Model dari Store
                      </option>
                      {stores.map((s) => (
                        <option key={s._id} value={s._id} className="bg-card">
                          {s.name} ({s.game_id === 1 ? "ETS2" : "ATS"})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="relative">
                    <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                      Assign To Owner
                    </label>
                    <div 
                      className="relative cursor-pointer"
                      onClick={() => setShowOwnerDropdown(!showOwnerDropdown)}
                    >
                      <div className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-amber-500 font-bold flex items-center justify-between transition-all hover:border-amber-500">
                        <span>
                          {formData.owner 
                            ? users.find(u => u._id === formData.owner)?.name || "Unknown Owner"
                            : "-- Kosongkan (Unassigned) --"}
                        </span>
                        <ChevronDown size={18} className="text-foreground/40" />
                      </div>
                    </div>

                    {showOwnerDropdown && (
                      <div className="absolute top-full left-0 w-full mt-2 bg-[#1a1a1a] border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                        <div className="p-3 border-b border-border bg-white/5 sticky top-0 flex items-center gap-2">
                          <Search size={16} className="text-foreground/40" />
                          <input 
                            type="text"
                            placeholder="Cari nama, Discord ID, Trucky ID..."
                            className="w-full bg-transparent text-sm focus:outline-none text-foreground placeholder:text-foreground/20 font-medium"
                            value={searchOwnerTerm}
                            onChange={(e) => setSearchOwnerTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                          <button
                            onClick={() => {
                              setFormData({ ...formData, owner: "" });
                              setShowOwnerDropdown(false);
                              setSearchOwnerTerm("");
                            }}
                            className="w-full text-left px-3 py-2.5 rounded-lg text-foreground hover:bg-amber-500/10 hover:text-amber-500 transition-colors text-sm font-medium"
                          >
                            -- Kosongkan (Unassigned) --
                          </button>
                          {filteredUsers.length > 0 ? (
                            filteredUsers.map((u) => (
                              <button
                                key={u._id}
                                onClick={() => {
                                  setFormData({ ...formData, owner: u._id });
                                  setShowOwnerDropdown(false);
                                  setSearchOwnerTerm("");
                                }}
                                className="w-full text-left px-3 py-2.5 rounded-lg text-foreground hover:bg-amber-500/10 hover:text-amber-500 transition-colors flex flex-col"
                              >
                                <span className="text-sm font-bold">{u.name}</span>
                                <span className="text-[10px] font-mono text-foreground/40 uppercase tracking-widest mt-0.5">
                                  Trucky: {u.truckyId} • Discord: {u.discordId || "N/A"}
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="text-center text-foreground/40 text-xs py-4 italic">
                              Member tidak ditemukan
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="col-span-2 border-t border-border/50 pt-4 mt-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                      Odometer (KM)
                    </label>
                    <input
                      type="number"
                      value={formData.odometer}
                      disabled={isEditMode} // Usually odometer updates from jobs
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          odometer: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground font-mono focus:outline-none focus:border-amber-500 transition-all disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                      Wheels
                    </label>
                    <select
                      value={formData.wheels}
                      onChange={(e) =>
                        setFormData({ ...formData, wheels: e.target.value })
                      }
                      className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-amber-500 transition-all appearance-none cursor-pointer"
                    >
                      <option value="4x2" className="bg-card">
                        4x2
                      </option>
                      <option value="4x6" className="bg-card">
                        4x6
                      </option>
                      <option value="4x8" className="bg-card">
                        4x8
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-amber-500 transition-all appearance-none cursor-pointer"
                    >
                      <option value="active" className="bg-card">
                        Active
                      </option>
                      <option value="inactive" className="bg-card">
                        Inactive
                      </option>
                      <option value="onservice" className="bg-card">
                        On Service
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-foreground/60 hover:text-foreground hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !formData.id}
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 disabled:opacity-50 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
              >
                {isSaving ? (
                  "Saving..."
                ) : (
                  <>
                    <Save size={14} /> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      <div
        className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl font-bold text-sm shadow-xl transition-all duration-300 flex items-center gap-3 backdrop-blur-md border z-50 ${
          toast.show
            ? "translate-y-0 opacity-100"
            : "translate-y-4 opacity-0 pointer-events-none"
        } ${
          toast.type === "error"
            ? "bg-red-500/10 text-red-400 border-red-500/20"
            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        }`}
      >
        {toast.type === "error" ? (
          <XCircle size={18} />
        ) : (
          <CheckCircle2 size={18} />
        )}
        {toast.message}
      </div>
    </main>
  );
}
