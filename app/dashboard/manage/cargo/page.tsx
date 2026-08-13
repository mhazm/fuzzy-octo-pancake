"use client";

import { useState, useEffect } from "react";
import { 
  Package, 
  Search, 
  Filter, 
  Edit2, 
  Save, 
  X, 
  CheckCircle2, 
  XCircle,
  Truck,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";

export default function CargoManager() {
  const [cargoes, setCargoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [gameFilter, setGameFilter] = useState("all");
  const [adrFilter, setAdrFilter] = useState("all");
  const [fragilityFilter, setFragilityFilter] = useState("all");
  const [overweightFilter, setOverweightFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | "none">("none");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState({ 
    id: "", 
    name: "", 
    in_game_id: "",
    adr_class: "0",
    fragility: "0",
    overweight: false,
    market_demand: "0",
    price: "" 
  });
  const [isSaving, setIsSaving] = useState(false);

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addData, setAddData] = useState({ id: "", name: "", in_game_id: "", game_id: "1", price: "" });
  const [isAdding, setIsAdding] = useState(false);

  // Toast State
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // Fetch Data
  useEffect(() => {
    fetchCargoes();
  }, []);

  const fetchCargoes = async () => {
    try {
      const res = await fetch("/api/cargo");
      const data = await res.json();
      setCargoes(data);
    } catch (error) {
      showToast("Gagal memuat data cargo", "error");
    } finally {
      setLoading(false);
    }
  };

  // Filter Logic
  const filteredCargoes = cargoes.filter((cargo) => {
    const matchesSearch =
      cargo.name.toLowerCase().includes(search.toLowerCase()) ||
      cargo.in_game_id.toLowerCase().includes(search.toLowerCase());
    const matchesGame =
      gameFilter === "all" || cargo.game_id.toString() === gameFilter;
    const matchesAdr =
      adrFilter === "all" || (cargo.adr_class?.toString() || "0") === adrFilter;
    const matchesFragility = 
      fragilityFilter === "all" || 
      (fragilityFilter === "fragile" ? (cargo.fragility > 0 || cargo.is_fragile) : (cargo.fragility === 0 && !cargo.is_fragile));
    const matchesOverweight = 
      overweightFilter === "all" || 
      (overweightFilter === "overweight" ? cargo.overweight === true : cargo.overweight !== true);

    return matchesSearch && matchesGame && matchesAdr && matchesFragility && matchesOverweight;
  }).sort((a, b) => {
    if (sortOrder === "asc") return (a.price_per_km || 0) - (b.price_per_km || 0);
    if (sortOrder === "desc") return (b.price_per_km || 0) - (a.price_per_km || 0);
    return 0;
  });

  const toggleSort = () => {
    if (sortOrder === "none") setSortOrder("asc");
    else if (sortOrder === "asc") setSortOrder("desc");
    else setSortOrder("none");
  };

  const handleEditClick = (cargo: any) => {
    setEditData({ 
      id: cargo.id, 
      name: cargo.name, 
      in_game_id: cargo.in_game_id,
      adr_class: cargo.adr_class?.toString() || "0",
      fragility: cargo.fragility?.toString() || "0",
      overweight: cargo.overweight || false,
      market_demand: cargo.market_demand?.toString() || "0",
      price: cargo.price_per_km 
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        name: editData.name,
        in_game_id: editData.in_game_id,
        adr_class: parseInt(editData.adr_class) || 0,
        fragility: parseFloat(editData.fragility) || 0,
        overweight: editData.overweight,
        market_demand: parseFloat(editData.market_demand) || 0,
        price_per_km: parseFloat(editData.price),
      };

      const res = await fetch(`/api/cargo/${editData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Gagal update data");

      // Update UI langsung tanpa harus refresh ulang seluruh data
      setCargoes(
        cargoes.map((c) =>
          c.id === editData.id
            ? { ...c, ...payload }
            : c,
        ),
      );

      showToast("Data cargo berhasil diupdate!", "success");
      setIsModalOpen(false);
    } catch (error) {
      showToast("Gagal menyimpan data.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddClick = () => {
    setAddData({ id: "", name: "", in_game_id: "", game_id: "1", price: "" });
    setIsAddModalOpen(true);
  };

  const handleAddSave = async () => {
    setIsAdding(true);
    try {
      const res = await fetch(`/api/cargo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: addData.id,
          name: addData.name,
          in_game_id: addData.in_game_id,
          game_id: parseInt(addData.game_id),
          price_per_km: parseFloat(addData.price || "0")
        }),
      });

      if (!res.ok) throw new Error("Gagal menambah cargo");
      
      showToast("Cargo berhasil ditambahkan!", "success");
      setIsAddModalOpen(false);
      fetchCargoes();
    } catch (error) {
      showToast("Gagal menyimpan cargo baru.", "error");
    } finally {
      setIsAdding(false);
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
            <div className="p-2 bg-accent-lilac/10 rounded-lg text-accent-lilac border border-accent-lilac/20">
              <Package size={20} />
            </div>
            <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase">
              Cargo Management
            </h1>
          </div>
          <p className="text-foreground/40 font-bold uppercase text-[10px] tracking-[0.2em] ml-11">
            Nismara Transport • Manage Cargo Prices
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* SEARCH & FILTER BAR */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/20 group-focus-within:text-accent-lilac transition-colors"
                size={18}
              />
              <input
                type="text"
                placeholder="Search cargo name or in-game ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-border rounded-2xl py-4 pl-12 pr-4 text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-accent-lilac transition-all"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleAddClick}
                className="inline-flex items-center gap-2 px-6 py-4 bg-accent-lilac/10 hover:bg-accent-lilac/20 text-accent-lilac border border-accent-lilac/20 rounded-2xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap"
              >
                <Plus size={16} /> Add Cargo
              </button>
            </div>
          </div>
          
          {/* Advanced Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex items-center bg-white/5 border border-border rounded-xl px-3 h-10">
              <Filter className="text-foreground/40 mr-2" size={14} />
              <span className="text-[10px] font-bold text-foreground/60 uppercase mr-2">Game:</span>
              <select
                value={gameFilter}
                onChange={(e) => setGameFilter(e.target.value)}
                className="bg-transparent text-foreground focus:outline-none appearance-none font-bold text-xs uppercase cursor-pointer"
              >
                <option value="all" className="bg-card">All Games</option>
                <option value="1" className="bg-card">ETS2</option>
                <option value="2" className="bg-card">ATS</option>
              </select>
            </div>

            <div className="relative flex items-center bg-white/5 border border-border rounded-xl px-3 h-10">
              <span className="text-[10px] font-bold text-foreground/60 uppercase mr-2">ADR:</span>
              <select
                value={adrFilter}
                onChange={(e) => setAdrFilter(e.target.value)}
                className="bg-transparent text-foreground focus:outline-none appearance-none font-bold text-xs uppercase cursor-pointer"
              >
                <option value="all" className="bg-card">All ADR</option>
                <option value="0" className="bg-card">None (0)</option>
                <option value="1" className="bg-card">Class 1</option>
                <option value="2" className="bg-card">Class 2</option>
                <option value="3" className="bg-card">Class 3</option>
                <option value="4" className="bg-card">Class 4</option>
                <option value="6" className="bg-card">Class 6</option>
                <option value="8" className="bg-card">Class 8</option>
              </select>
            </div>

            <div className="relative flex items-center bg-white/5 border border-border rounded-xl px-3 h-10">
              <span className="text-[10px] font-bold text-foreground/60 uppercase mr-2">Fragility:</span>
              <select
                value={fragilityFilter}
                onChange={(e) => setFragilityFilter(e.target.value)}
                className="bg-transparent text-foreground focus:outline-none appearance-none font-bold text-xs uppercase cursor-pointer"
              >
                <option value="all" className="bg-card">All</option>
                <option value="fragile" className="bg-card">Fragile</option>
                <option value="not_fragile" className="bg-card">Not Fragile</option>
              </select>
            </div>

            <div className="relative flex items-center bg-white/5 border border-border rounded-xl px-3 h-10">
              <span className="text-[10px] font-bold text-foreground/60 uppercase mr-2">Weight:</span>
              <select
                value={overweightFilter}
                onChange={(e) => setOverweightFilter(e.target.value)}
                className="bg-transparent text-foreground focus:outline-none appearance-none font-bold text-xs uppercase cursor-pointer"
              >
                <option value="all" className="bg-card">All</option>
                <option value="overweight" className="bg-card">Overweight</option>
                <option value="normal" className="bg-card">Normal</option>
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
                  <th className="px-8 py-5">Cargo Info</th>
                  <th className="px-8 py-5">Characteristics</th>
                  <th className="px-8 py-5">Game</th>
                  <th 
                    className="px-8 py-5 cursor-pointer hover:text-accent-lilac transition-colors group select-none"
                    onClick={toggleSort}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Base Price / KM
                      <div className="flex items-center text-foreground/40 group-hover:text-accent-lilac transition-colors">
                        {sortOrder === "none" && <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                        {sortOrder === "asc" && <ArrowUp size={14} className="text-accent-lilac" />}
                        {sortOrder === "desc" && <ArrowDown size={14} className="text-accent-lilac" />}
                      </div>
                    </div>
                  </th>
                  <th className="px-8 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-foreground/20 font-black uppercase tracking-[0.2em] italic">
                      <div className="flex justify-center items-center gap-3">
                        <Truck className="animate-pulse" size={24} />
                        Loading cargo data...
                      </div>
                    </td>
                  </tr>
                ) : filteredCargoes.length > 0 ? (
                  filteredCargoes.map((cargo) => (
                    <tr
                      key={cargo.id}
                      className="hover:bg-white/[0.02] group transition-all"
                    >
                      {/* Cargo Info */}
                      <td className="px-8 py-4">
                        <div>
                          <p className="font-black text-foreground leading-none uppercase tracking-tight">
                            {cargo.name}
                          </p>
                          <p className="text-[10px] font-mono text-foreground/30 mt-1">
                            {cargo.in_game_id}
                          </p>
                          <p className="text-[8px] font-mono text-foreground/10 uppercase mt-0.5 italic">
                            ID: {cargo.id}
                          </p>
                        </div>
                      </td>

                      {/* Characteristics */}
                      <td className="px-8 py-4">
                        <div className="flex flex-wrap gap-2">
                          {cargo.adr_class && cargo.adr_class > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                              ADR {cargo.adr_class}
                            </span>
                          ) : null}
                          {(cargo.fragility > 0 || cargo.is_fragile) ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                              Fragile
                            </span>
                          ) : null}
                          {cargo.overweight ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              Overweight
                            </span>
                          ) : null}
                          {(!cargo.adr_class && !cargo.fragility && !cargo.is_fragile && !cargo.overweight) && (
                            <span className="text-[10px] text-foreground/20 italic">Normal</span>
                          )}
                        </div>
                      </td>

                      {/* Game */}
                      <td className="px-8 py-4">
                        {cargo.game_id === 1 ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            ETS2
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-orange-500/10 text-orange-400 border border-orange-500/20">
                            ATS
                          </div>
                        )}
                      </td>

                      {/* Base Price / KM */}
                      <td className="px-8 py-4 text-right">
                        <span className="font-mono font-bold text-emerald-400">
                          ${cargo.price_per_km?.toFixed(2)}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-8 py-4 text-right">
                        <button
                          onClick={() => handleEditClick(cargo)}
                          className="inline-flex items-center justify-center p-3 bg-white/5 rounded-xl text-foreground/40 hover:text-accent-lilac hover:bg-accent-lilac/10 transition-all group/btn border border-transparent hover:border-accent-lilac/20"
                          title="Edit Cargo"
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
                      colSpan={4}
                      className="px-8 py-20 text-center text-foreground/20 font-black uppercase tracking-[0.2em] italic"
                    >
                      No cargo found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 animate-in fade-in duration-200">
          <div className="glass-panel p-8 rounded-[2rem] border border-border/50 max-w-md w-full shadow-2xl relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-foreground/40 hover:text-foreground transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-accent-lilac/10 rounded-lg text-accent-lilac border border-accent-lilac/20">
                  <Edit2 size={16} />
                </div>
                <h2 className="text-xl font-black text-foreground uppercase tracking-tight">
                  Edit Cargo Data
                </h2>
              </div>
              <p className="text-foreground/40 text-xs font-bold uppercase tracking-widest mt-2">
                {editData.name}
              </p>
            </div>

            <div className="space-y-4 mb-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) =>
                      setEditData({ ...editData, name: e.target.value })
                    }
                    className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent-lilac transition-all"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                    In-Game ID
                  </label>
                  <input
                    type="text"
                    value={editData.in_game_id}
                    onChange={(e) =>
                      setEditData({ ...editData, in_game_id: e.target.value })
                    }
                    className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground font-mono focus:outline-none focus:border-accent-lilac transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                    ADR Class
                  </label>
                  <select
                    value={editData.adr_class}
                    onChange={(e) => setEditData({ ...editData, adr_class: e.target.value })}
                    className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent-lilac transition-all appearance-none cursor-pointer"
                  >
                    <option value="0" className="bg-card">None (0)</option>
                    <option value="1" className="bg-card">Class 1</option>
                    <option value="2" className="bg-card">Class 2</option>
                    <option value="3" className="bg-card">Class 3</option>
                    <option value="4" className="bg-card">Class 4</option>
                    <option value="6" className="bg-card">Class 6</option>
                    <option value="8" className="bg-card">Class 8</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                    Fragility (0-1)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={editData.fragility}
                    onChange={(e) =>
                      setEditData({ ...editData, fragility: e.target.value })
                    }
                    className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground font-mono focus:outline-none focus:border-accent-lilac transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                    Market Demand
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editData.market_demand}
                    onChange={(e) =>
                      setEditData({ ...editData, market_demand: e.target.value })
                    }
                    className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground font-mono focus:outline-none focus:border-accent-lilac transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                    Base Price per KM ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editData.price}
                    onChange={(e) =>
                      setEditData({ ...editData, price: e.target.value })
                    }
                    className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground font-mono focus:outline-none focus:border-accent-lilac transition-all"
                  />
                </div>

                <div className="col-span-2 flex items-center gap-3 mt-2">
                  <input
                    type="checkbox"
                    id="overweight-checkbox"
                    checked={editData.overweight}
                    onChange={(e) => setEditData({ ...editData, overweight: e.target.checked })}
                    className="w-4 h-4 rounded border-border bg-white/5 text-accent-lilac focus:ring-accent-lilac focus:ring-offset-0"
                  />
                  <label htmlFor="overweight-checkbox" className="text-sm font-bold text-foreground cursor-pointer">
                    Is Overweight Cargo?
                  </label>
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
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 disabled:opacity-50 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
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

      {/* ADD MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 animate-in fade-in duration-200">
          <div className="glass-panel p-8 rounded-[2rem] border border-border/50 max-w-md w-full shadow-2xl relative">
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-6 right-6 text-foreground/40 hover:text-foreground transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-accent-lilac/10 rounded-lg text-accent-lilac border border-accent-lilac/20">
                  <Plus size={16} />
                </div>
                <h2 className="text-xl font-black text-foreground uppercase tracking-tight">
                  Add New Cargo
                </h2>
              </div>
              <p className="text-foreground/40 text-xs font-bold uppercase tracking-widest mt-2">
                Masukkan data cargo baru
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                  Cargo ID (Unik)
                </label>
                <input
                  type="text"
                  value={addData.id}
                  onChange={(e) => setAddData({ ...addData, id: e.target.value })}
                  className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent-lilac transition-all"
                  placeholder="e.g. apple"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                  Nama Cargo
                </label>
                <input
                  type="text"
                  value={addData.name}
                  onChange={(e) => setAddData({ ...addData, name: e.target.value })}
                  className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent-lilac transition-all"
                  placeholder="e.g. Apples"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                  In-Game ID
                </label>
                <input
                  type="text"
                  value={addData.in_game_id}
                  onChange={(e) => setAddData({ ...addData, in_game_id: e.target.value })}
                  className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent-lilac transition-all"
                  placeholder="e.g. apples"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                    Game
                  </label>
                  <select
                    value={addData.game_id}
                    onChange={(e) => setAddData({ ...addData, game_id: e.target.value })}
                    className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent-lilac transition-all appearance-none cursor-pointer"
                  >
                    <option value="1" className="bg-card">ETS2</option>
                    <option value="2" className="bg-card">ATS</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                    Price / KM ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={addData.price}
                    onChange={(e) => setAddData({ ...addData, price: e.target.value })}
                    className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground font-mono focus:outline-none focus:border-accent-lilac transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-foreground/60 hover:text-foreground hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSave}
                disabled={isAdding || !addData.id || !addData.name || !addData.in_game_id}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 disabled:opacity-50 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
              >
                {isAdding ? "Saving..." : <><Save size={14} /> Add Cargo</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      <div
        className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl font-bold text-sm shadow-xl transition-all duration-300 flex items-center gap-3 backdrop-blur-md border z-50 ${
          toast.show ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
        } ${
          toast.type === "error" 
            ? "bg-red-500/10 text-red-400 border-red-500/20" 
            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        }`}
      >
        {toast.type === "error" ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
        {toast.message}
      </div>
    </main>
  );
}
