"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  CheckCircle2, 
  XCircle,
  ChevronLeft,
  ChevronRight,
  Zap,
  Truck,
  Building2,
  Check,
  Search,
  ChevronDown
} from "lucide-react";
import Link from "next/link";

export default function BuyFleetPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Stepper State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedBrand, setSelectedBrand] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    id: "",
    fleet_number: "",
    driver: "",
    odometer: 0,
    wheels: "4x2",
    status: "active"
  });
  const [isSaving, setIsSaving] = useState(false);

  // Driver Search State
  const [searchDriverTerm, setSearchDriverTerm] = useState("");
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);

  // Filter Users
  const filteredUsers = users.filter((u) => {
    const term = searchDriverTerm.toLowerCase();
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
      const [resBrands, resStores, resUsers] = await Promise.all([
        fetch("/api/fleet/brand"),
        fetch("/api/fleet/store"),
        fetch("/api/users")
      ]);
      const dataBrands = await resBrands.json();
      const dataStores = await resStores.json();
      const dataUsers = await resUsers.json();
      
      setBrands(Array.isArray(dataBrands) ? dataBrands : []);
      setStores(Array.isArray(dataStores) ? dataStores : []);
      setUsers(Array.isArray(dataUsers) ? dataUsers : []);
    } catch (error) {
      showToast("Gagal memuat data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBrandSelect = (brand: any) => {
    setSelectedBrand(brand);
    setStep(2);
  };

  const handleModelSelect = (model: any) => {
    setSelectedModel(model);
    setStep(3);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const fleet_name = `${selectedBrand.name} ${selectedModel.name}`;
      
      const payload = {
        ...formData,
        fleet_name,
        game_id: selectedModel.game_id.toString(),
        model: selectedModel._id,
      };

      const res = await fetch(`/api/fleet/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Gagal membeli fleet");
      
      showToast("Kendaraan berhasil dibeli!", "success");
      
      setTimeout(() => {
        router.push("/dashboard/manage/fleet/assign");
      }, 1000);
    } catch (error) {
      showToast("Gagal menyimpan pembelian.", "error");
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

  const availableModels = stores.filter(s => s.brand?._id === selectedBrand?._id);

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4">
        <Link href="/dashboard/manage/fleet/assign" className="inline-flex items-center gap-2 text-foreground/40 hover:text-amber-500 transition-colors w-fit text-sm font-bold uppercase tracking-widest">
          <ChevronLeft size={16} /> Back to Assignment
        </Link>
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 border border-amber-500/20">
              <Zap size={20} />
            </div>
            <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase">
              Buy New Fleet
            </h1>
          </div>
          <p className="text-foreground/40 font-bold uppercase text-[10px] tracking-[0.2em] ml-11">
            Nismara Transport • Store
          </p>
        </div>
      </div>

      {/* STEPPER */}
      <div className="flex items-center justify-between relative max-w-2xl mx-auto mb-12">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-white/5 rounded-full z-0"></div>
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-amber-500 rounded-full z-0 transition-all duration-500"
          style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
        ></div>

        {/* Step 1 */}
        <div className="relative z-10 flex flex-col items-center gap-2">
          <button 
            onClick={() => setStep(1)}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all duration-500 ${
            step >= 1 ? 'bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)] cursor-pointer' : 'bg-card border-2 border-border text-foreground/40'
          }`}>
            {step > 1 ? <Check size={18} /> : "1"}
          </button>
          <span className={`text-[10px] font-black uppercase tracking-widest ${step >= 1 ? 'text-amber-500' : 'text-foreground/40'}`}>Brand</span>
        </div>

        {/* Step 2 */}
        <div className="relative z-10 flex flex-col items-center gap-2">
          <button 
            onClick={() => step > 1 && setStep(2)}
            disabled={step < 2}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all duration-500 ${
            step >= 2 ? 'bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)] cursor-pointer' : 'bg-card border-2 border-border text-foreground/40 cursor-not-allowed'
          }`}>
            {step > 2 ? <Check size={18} /> : "2"}
          </button>
          <span className={`text-[10px] font-black uppercase tracking-widest ${step >= 2 ? 'text-amber-500' : 'text-foreground/40'}`}>Model</span>
        </div>

        {/* Step 3 */}
        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all duration-500 ${
            step >= 3 ? 'bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'bg-card border-2 border-border text-foreground/40'
          }`}>
            3
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest ${step >= 3 ? 'text-amber-500' : 'text-foreground/40'}`}>Details</span>
        </div>
      </div>

      <div className="glass-panel p-8 rounded-[2rem] border border-border min-h-[50vh]">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-full text-foreground/20 font-black uppercase tracking-[0.2em] italic py-32">
            <Truck className="animate-pulse mb-4" size={32} />
            Memuat Data...
          </div>
        ) : (
          <>
            {/* STEP 1: SELECT BRAND */}
            {step === 1 && (
              <div className="animate-in slide-in-from-right-8 duration-500">
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-foreground">Select Brand</h2>
                  <p className="text-foreground/40 font-bold uppercase tracking-widest text-[10px] mt-2">Pilih merk kendaraan</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {brands.map(brand => (
                    <button
                      key={brand._id}
                      onClick={() => handleBrandSelect(brand)}
                      className="group flex flex-col items-center gap-4 p-8 bg-white/5 border border-border rounded-2xl hover:bg-amber-500/10 hover:border-amber-500/50 transition-all duration-300 hover:-translate-y-1"
                    >
                      <img 
                        src={brand.logo_url || "https://placehold.co/100x100?text=Logo"} 
                        alt={brand.name} 
                        className="w-20 h-20 object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-500"
                      />
                      <span className="font-black text-foreground uppercase tracking-wider group-hover:text-amber-500 transition-colors">
                        {brand.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: SELECT MODEL */}
            {step === 2 && (
              <div className="animate-in slide-in-from-right-8 duration-500">
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setStep(1)}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-foreground/60 hover:text-foreground transition-colors border border-border"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <img src={selectedBrand?.logo_url} alt={selectedBrand?.name} className="h-10 object-contain" />
                    <div>
                      <h2 className="text-2xl font-black uppercase tracking-tighter text-foreground">Select Model</h2>
                      <p className="text-foreground/40 font-bold uppercase tracking-widest text-[10px] mt-1">Pilih tipe kendaraan</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableModels.length > 0 ? (
                    availableModels.map(model => (
                      <div
                        key={model._id}
                        className="group flex flex-col bg-white/5 border border-border rounded-2xl overflow-hidden hover:bg-amber-500/5 hover:border-amber-500/30 transition-all duration-300"
                      >
                        <div className="h-48 relative overflow-hidden bg-white/5 flex items-center justify-center p-6">
                          <img 
                            src={model.photo_url || "https://placehold.co/400x300?text=No+Image"} 
                            alt={model.name} 
                            className="w-full h-full object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-700"
                          />
                          <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-black/60 backdrop-blur-md text-white border border-white/10 z-10">
                            {model.game_id === 1 ? "ETS2" : "ATS"}
                          </div>
                          <div className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/20 backdrop-blur-md text-amber-500 border border-amber-500/20">
                            {model.price.toLocaleString('id-ID')} NC
                          </div>
                        </div>
                        <div className="p-6 flex flex-col justify-between flex-1 gap-6">
                          <div>
                            <h3 className="font-black text-xl text-foreground uppercase tracking-tight">{model.name}</h3>
                            <p className="text-foreground/40 font-mono text-[10px] mt-1">ID: {model.id}</p>
                          </div>
                          <button
                            onClick={() => handleModelSelect(model)}
                            className="w-full py-3 bg-white/5 hover:bg-amber-500 hover:text-white border border-border hover:border-amber-500 rounded-xl font-black text-xs uppercase tracking-widest transition-all text-foreground"
                          >
                            Pilih Model Ini
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
                      <Truck className="text-foreground/20" size={48} />
                      <p className="text-foreground/40 font-black uppercase tracking-widest">
                        Belum ada kendaraan dari brand ini di Store.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: DETAILS & ASSIGNMENT */}
            {step === 3 && (
              <div className="animate-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto">
                <div className="mb-8 flex items-center gap-4">
                  <button 
                    onClick={() => setStep(2)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-foreground/60 hover:text-foreground transition-colors border border-border"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-foreground">Purchase Details</h2>
                    <p className="text-foreground/40 font-bold uppercase tracking-widest text-[10px] mt-1">Lengkapi data pendaftaran unit</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                  {/* Summary Card */}
                  <div className="col-span-1 glass-panel p-6 rounded-2xl border-amber-500/20 bg-amber-500/5 h-fit sticky top-24">
                    <img 
                      src={selectedModel?.photo_url || "https://placehold.co/400x300"} 
                      alt={selectedModel?.name} 
                      className="w-full h-40 object-cover rounded-xl mb-4 border border-border"
                    />
                    <h3 className="font-black text-lg uppercase tracking-tight text-foreground">
                      {selectedBrand?.name} {selectedModel?.name}
                    </h3>
                    <p className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mt-1">
                      Final Fleet Name
                    </p>
                    
                    <div className="w-full h-px bg-border/50 my-4" />
                    
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-foreground/60 uppercase">Price</span>
                      <span className="font-mono font-bold text-amber-500">{selectedModel?.price.toLocaleString('id-ID')} NC</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-foreground/60 uppercase">Game</span>
                      <span className="font-black text-[10px] text-foreground bg-white/10 px-2 py-0.5 rounded">{selectedModel?.game_id === 1 ? 'ETS2' : 'ATS'}</span>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="col-span-1 md:col-span-2 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 md:col-span-1">
                        <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                          ID Kendaraan (Unik)
                        </label>
                        <input
                          type="text"
                          value={formData.id}
                          onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                          className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-amber-500 transition-all"
                          placeholder="e.g. F-001"
                        />
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                          Nomor Lambung
                        </label>
                        <input
                          type="text"
                          value={formData.fleet_number}
                          onChange={(e) => setFormData({ ...formData, fleet_number: e.target.value })}
                          className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-amber-500 transition-all"
                          placeholder="e.g. 01"
                        />
                      </div>
                      <div className="col-span-2 relative">
                        <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                          Assign To Driver
                        </label>
                        
                        <div 
                          className="relative cursor-pointer"
                          onClick={() => setShowDriverDropdown(!showDriverDropdown)}
                        >
                          <div className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-amber-500 font-bold flex items-center justify-between transition-all hover:border-amber-500">
                            <span>
                              {formData.driver 
                                ? users.find(u => u._id === formData.driver)?.name || "Unknown Driver"
                                : "-- Kosongkan (Unassigned) --"}
                            </span>
                            <ChevronDown size={18} className="text-foreground/40" />
                          </div>
                        </div>

                        {showDriverDropdown && (
                          <div className="absolute top-full left-0 w-full mt-2 bg-[#1a1a1a] border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                            <div className="p-3 border-b border-border bg-white/5 sticky top-0 flex items-center gap-2">
                              <Search size={16} className="text-foreground/40" />
                              <input 
                                type="text"
                                placeholder="Cari nama, Discord ID, Trucky ID..."
                                className="w-full bg-transparent text-sm focus:outline-none text-foreground placeholder:text-foreground/20 font-medium"
                                value={searchDriverTerm}
                                onChange={(e) => setSearchDriverTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                              <button
                                onClick={() => {
                                  setFormData({ ...formData, driver: "" });
                                  setShowDriverDropdown(false);
                                  setSearchDriverTerm("");
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
                                      setFormData({ ...formData, driver: u._id });
                                      setShowDriverDropdown(false);
                                      setSearchDriverTerm("");
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
                                  Driver tidak ditemukan
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="col-span-2 md:col-span-1">
                        <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                          Odometer Awal (KM)
                        </label>
                        <input
                          type="number"
                          value={formData.odometer}
                          onChange={(e) => setFormData({ ...formData, odometer: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground font-mono focus:outline-none focus:border-amber-500 transition-all"
                        />
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                          Wheels
                        </label>
                        <select
                          value={formData.wheels}
                          onChange={(e) => setFormData({ ...formData, wheels: e.target.value })}
                          className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-amber-500 transition-all appearance-none cursor-pointer"
                        >
                          <option value="4x2" className="bg-card">4x2</option>
                          <option value="4x6" className="bg-card">4x6</option>
                          <option value="4x8" className="bg-card">4x8</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-8 flex justify-end gap-3">
                      <button
                        onClick={handleSave}
                        disabled={isSaving || !formData.id || !formData.fleet_number}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] disabled:opacity-50 disabled:shadow-none rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                      >
                        {isSaving ? "Processing..." : "Confirm & Buy"}
                        {!isSaving && <ChevronRight size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

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
