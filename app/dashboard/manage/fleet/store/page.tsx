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
  FileText,
  Upload
} from "lucide-react";
import { compressImageToWebP } from "@/lib/imageUtils";

export default function FleetStoreManager() {
  const [stores, setStores] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [gameFilter, setGameFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const initialCostMaintenance = { engine: 2000, tires: 500, transmission: 1500, brakes: 800 };
  const initialCostUnfix = { engine: 40000, transmission: 60000, brakes: 40000, tires: 30000 };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({ 
    id: "", name: "", game_id: "1", in_game_id: "", type: "truck", price: "", brand: "", photo_url: "",
    component_cost_maintenance: { ...initialCostMaintenance },
    component_cost_unfix_wear: { ...initialCostUnfix }
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
      const [resStores, resBrands] = await Promise.all([
        fetch("/api/fleet/store"),
        fetch("/api/fleet/brand")
      ]);
      const dataStores = await resStores.json();
      const dataBrands = await resBrands.json();
      
      setStores(Array.isArray(dataStores) ? dataStores : []);
      setBrands(Array.isArray(dataBrands) ? dataBrands : []);
    } catch (error) {
      showToast("Gagal memuat data", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredStores = stores.filter((store) => {
    const matchesSearch =
      store.name?.toLowerCase().includes(search.toLowerCase()) ||
      store.id?.toLowerCase().includes(search.toLowerCase());
    const matchesGame =
      gameFilter === "all" || store.game_id?.toString() === gameFilter;
    const matchesType =
      typeFilter === "all" || store.type === typeFilter;
    return matchesSearch && matchesGame && matchesType;
  });

  const handleAddClick = () => {
    setIsEditMode(false);
    setFormData({ 
      id: "", name: "", game_id: "1", in_game_id: "", type: "truck", price: "", brand: "", photo_url: "",
      component_cost_maintenance: { ...initialCostMaintenance },
      component_cost_unfix_wear: { ...initialCostUnfix }
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (store: any) => {
    setIsEditMode(true);
    setFormData({
      id: store.id,
      name: store.name,
      game_id: store.game_id.toString(),
      in_game_id: store.in_game_id ? store.in_game_id.toString() : "",
      type: store.type,
      price: store.price.toString(),
      brand: store.brand?._id || store.brand || "",
      photo_url: store.photo_url || "",
      component_cost_maintenance: store.component_cost_maintenance || { ...initialCostMaintenance },
      component_cost_unfix_wear: store.component_cost_unfix_wear || { ...initialCostUnfix }
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const url = isEditMode ? `/api/fleet/store/${formData.id}` : `/api/fleet/store`;
      const method = isEditMode ? "PATCH" : "POST";
      
      const payload = {
        ...formData,
        game_id: parseInt(formData.game_id),
        in_game_id: formData.in_game_id,
        price: parseFloat(formData.price),
        component_cost_maintenance: {
          engine: Number(formData.component_cost_maintenance.engine),
          tires: Number(formData.component_cost_maintenance.tires),
          transmission: Number(formData.component_cost_maintenance.transmission),
          brakes: Number(formData.component_cost_maintenance.brakes),
        },
        component_cost_unfix_wear: {
          engine: Number(formData.component_cost_unfix_wear.engine),
          tires: Number(formData.component_cost_unfix_wear.tires),
          transmission: Number(formData.component_cost_unfix_wear.transmission),
          brakes: Number(formData.component_cost_unfix_wear.brakes),
        }
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Gagal menyimpan data");
      
      showToast(isEditMode ? "Kendaraan berhasil diupdate!" : "Kendaraan berhasil ditambahkan!", "success");
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      showToast("Gagal menyimpan kendaraan.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // 1. Kompresi gambar menjadi WebP (max 2MB, 1920px untuk kualitas foto)
      const optimizedFile = await compressImageToWebP(file, 2, 1920);

      // 2. Minta Presigned URL dari backend
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: optimizedFile.name,
          fileType: optimizedFile.type,
          fileSize: optimizedFile.size,
          folder: "fleet/store",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mendapatkan URL upload");

      // 3. Upload file yang sudah dikompresi ke R2
      const uploadRes = await fetch(data.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": optimizedFile.type },
        body: optimizedFile,
      });
      if (!uploadRes.ok) throw new Error("Gagal mengupload file ke server");

      setFormData({ ...formData, photo_url: data.publicUrl });
      showToast("Foto berhasil diupload!", "success");
    } catch (error: any) {
      showToast(error.message || "Gagal mengupload foto", "error");
    } finally {
      setIsUploading(false);
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
            <div className="p-2 bg-accent-sky/10 rounded-lg text-accent-sky border border-accent-sky/20">
              <FileText size={20} />
            </div>
            <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase">
              Fleet Store Management
            </h1>
          </div>
          <p className="text-foreground/40 font-bold uppercase text-[10px] tracking-[0.2em] ml-11">
            Nismara Transport • Manage Fleet Vehicles
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* SEARCH & FILTER BAR */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/20 group-focus-within:text-accent-sky transition-colors"
              size={18}
            />
            <input
              type="text"
              placeholder="Search vehicle name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-border rounded-2xl py-4 pl-12 pr-4 text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-accent-sky transition-all"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddClick}
              className="inline-flex items-center gap-2 px-6 py-4 bg-accent-sky/10 hover:bg-accent-sky/20 text-accent-sky border border-accent-sky/20 rounded-2xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap"
            >
              <Plus size={16} /> Add Vehicle
            </button>
            <div className="relative flex items-center">
              <Filter className="absolute left-4 text-foreground/20" size={16} />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-white/5 border border-border rounded-2xl py-4 pl-10 pr-8 text-foreground focus:outline-none focus:border-accent-sky appearance-none font-bold text-xs uppercase tracking-widest cursor-pointer"
              >
                <option value="all" className="bg-card">All Types</option>
                <option value="truck" className="bg-card">Truck</option>
                <option value="bus" className="bg-card">Bus</option>
              </select>
            </div>
            <div className="relative flex items-center">
              <Filter className="absolute left-4 text-foreground/20" size={16} />
              <select
                value={gameFilter}
                onChange={(e) => setGameFilter(e.target.value)}
                className="bg-white/5 border border-border rounded-2xl py-4 pl-10 pr-8 text-foreground focus:outline-none focus:border-accent-sky appearance-none font-bold text-xs uppercase tracking-widest cursor-pointer"
              >
                <option value="all" className="bg-card">All Games</option>
                <option value="1" className="bg-card">Euro Truck Simulator 2</option>
                <option value="2" className="bg-card">American Truck Simulator</option>
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
                  <th className="px-8 py-5">Vehicle Info</th>
                  <th className="px-8 py-5">Brand</th>
                  <th className="px-8 py-5">Game & Type</th>
                  <th className="px-8 py-5 text-right">Price (NC)</th>
                  <th className="px-8 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-foreground/20 font-black uppercase tracking-[0.2em] italic">
                      <div className="flex justify-center items-center gap-3">
                        <Truck className="animate-pulse" size={24} />
                        Loading fleet store data...
                      </div>
                    </td>
                  </tr>
                ) : filteredStores.length > 0 ? (
                  filteredStores.map((store) => (
                    <tr
                      key={store._id}
                      className="hover:bg-white/[0.02] group transition-all"
                    >
                      {/* Vehicle Info */}
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-4">
                          <img
                            src={store.photo_url || "https://placehold.co/100x60?text=No+Image"}
                            alt={store.name}
                            className="w-16 h-10 object-cover rounded-md border border-border"
                          />
                          <div>
                            <p className="font-black text-foreground leading-none uppercase tracking-tight">
                              {store.name}
                            </p>
                            <p className="text-[10px] font-mono text-foreground/30 mt-1">
                              ID: {store.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Brand */}
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-2">
                          {store.brand?.logo_url && (
                            <img src={store.brand.logo_url} alt="Brand" className="h-4 object-contain" />
                          )}
                          <span className="text-xs font-bold text-foreground/70 uppercase tracking-wider">
                            {store.brand?.name || "-"}
                          </span>
                        </div>
                      </td>

                      {/* Game & Type */}
                      <td className="px-8 py-4">
                        <div className="flex gap-2">
                          {store.game_id === 1 ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              ETS2
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-orange-500/10 text-orange-400 border border-orange-500/20">
                              ATS
                            </div>
                          )}
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${store.type === 'truck' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                            {store.type}
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-8 py-4 text-right">
                        <span className="font-mono font-bold text-amber-500">
                          {store.price?.toLocaleString('id-ID')} NC
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-8 py-4 text-right">
                        <button
                          onClick={() => handleEditClick(store)}
                          className="inline-flex items-center justify-center p-3 bg-white/5 rounded-xl text-foreground/40 hover:text-accent-sky hover:bg-accent-sky/10 transition-all group/btn border border-transparent hover:border-accent-sky/20"
                          title="Edit Vehicle"
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
                      No vehicles found
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
          <div className="glass-panel p-8 rounded-[2rem] border border-border/50 max-w-4xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-foreground/40 hover:text-foreground transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-accent-sky/10 rounded-lg text-accent-sky border border-accent-sky/20">
                  {isEditMode ? <Edit2 size={16} /> : <Plus size={16} />}
                </div>
                <h2 className="text-xl font-black text-foreground uppercase tracking-tight">
                  {isEditMode ? "Edit Vehicle" : "Add New Vehicle"}
                </h2>
              </div>
              <p className="text-foreground/40 text-xs font-bold uppercase tracking-widest mt-2">
                {isEditMode ? "Ubah detail kendaraan" : "Masukkan data kendaraan baru"}
              </p>
            </div>

            {/* General Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="col-span-1 lg:col-span-2">
                <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                  Vehicle ID (Unik)
                </label>
                <input
                  type="text"
                  value={formData.id}
                  disabled={isEditMode}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent-sky transition-all disabled:opacity-50"
                  placeholder="e.g. TRUCK-001"
                />
              </div>
              <div className="col-span-1 lg:col-span-2">
                <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                  Nama Kendaraan
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent-sky transition-all"
                  placeholder="e.g. Scania S Highline"
                />
              </div>
              <div className="col-span-1 lg:col-span-2">
                <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                  In-Game ID (Trucky)
                </label>
                <input
                  type="text"
                  value={formData.in_game_id}
                  onChange={(e) => setFormData({ ...formData, in_game_id: e.target.value })}
                  className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground font-mono focus:outline-none focus:border-accent-sky transition-all"
                  placeholder="e.g. vehicle.scania.s_2016"
                />
              </div>
              <div className="col-span-1 lg:col-span-2">
                <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                  Brand
                </label>
                <select
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent-sky transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled className="bg-card">Pilih Brand</option>
                  {brands.map((b) => (
                    <option key={b._id} value={b._id} className="bg-card">
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                  Game
                </label>
                <select
                  value={formData.game_id}
                  onChange={(e) => setFormData({ ...formData, game_id: e.target.value })}
                  className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent-sky transition-all appearance-none cursor-pointer"
                >
                  <option value="1" className="bg-card">ETS2</option>
                  <option value="2" className="bg-card">ATS</option>
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                  Tipe
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent-sky transition-all appearance-none cursor-pointer"
                >
                  <option value="truck" className="bg-card">Truck</option>
                  <option value="bus" className="bg-card">Bus</option>
                </select>
              </div>
              <div className="col-span-1 lg:col-span-2">
                <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                  Price (NC)
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground font-mono focus:outline-none focus:border-accent-sky transition-all"
                  placeholder="e.g. 150000"
                />
              </div>
              <div className="col-span-1 lg:col-span-2">
                <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                  Photo (Upload)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.photo_url}
                    readOnly
                    className="flex-1 bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none opacity-50 cursor-not-allowed"
                    placeholder="URL akan terisi otomatis"
                  />
                  <label className="inline-flex items-center gap-2 px-4 py-3 bg-accent-sky/10 hover:bg-accent-sky/20 text-accent-sky border border-accent-sky/20 rounded-xl cursor-pointer transition-all">
                    {isUploading ? "Uploading..." : <Upload size={16} />}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleFileUpload}
                      disabled={isUploading} 
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Maintenance Costs Section */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-widest border-b border-border/50 pb-2">
                Maintenance Cost (Per Service)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['engine', 'tires', 'transmission', 'brakes'].map((part) => (
                  <div key={`maint-${part}`}>
                    <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                      {part} Cost
                    </label>
                    <input
                      type="number"
                      value={(formData.component_cost_maintenance as any)[part]}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        component_cost_maintenance: { ...formData.component_cost_maintenance, [part]: e.target.value } 
                      })}
                      className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground font-mono focus:outline-none focus:border-accent-sky transition-all"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Unfix Wear Costs Section */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-widest border-b border-border/50 pb-2">
                Unfix Wear Cost (Total Loss)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['engine', 'tires', 'transmission', 'brakes'].map((part) => (
                  <div key={`unfix-${part}`}>
                    <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                      {part} Replace
                    </label>
                    <input
                      type="number"
                      value={(formData.component_cost_unfix_wear as any)[part]}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        component_cost_unfix_wear: { ...formData.component_cost_unfix_wear, [part]: e.target.value } 
                      })}
                      className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground font-mono focus:outline-none focus:border-accent-sky transition-all"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-foreground/60 hover:text-foreground hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !formData.id || !formData.name || !formData.price || !formData.brand || !formData.photo_url}
                className="inline-flex items-center gap-2 px-6 py-3 bg-accent-sky/10 hover:bg-accent-sky/20 text-accent-sky border border-accent-sky/20 disabled:opacity-50 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
              >
                {isSaving ? "Saving..." : <><Save size={14} /> {isEditMode ? "Save Changes" : "Add Vehicle"}</>}
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
