"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  Edit2, 
  Save, 
  X, 
  CheckCircle2, 
  XCircle,
  Plus,
  CalendarDays,
  Upload,
  Trash2,
  Image as ImageIcon
} from "lucide-react";
import { compressImageToWebP } from "@/lib/imageUtils";
import { useSession } from "next-auth/react";

export default function FleetBrandManager() {
  const { data: session } = useSession();
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({ id: "", name: "", logo_url: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

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
      const res = await fetch("/api/fleet/brand");
      const data = await res.json();
      setBrands(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast("Gagal memuat data", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredBrands = brands.filter((brand) => {
    const matchesSearch =
      brand.name?.toLowerCase().includes(search.toLowerCase()) ||
      brand.id?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const handleAddClick = () => {
    setFormData({ id: "", name: "", logo_url: "" });
    setLogoFile(null);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleEditClick = (brand: any) => {
    setFormData({ 
      id: brand.id, 
      name: brand.name, 
      logo_url: brand.logo_url || "" 
    });
    setLogoFile(null);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let finalLogoUrl = formData.logo_url;
      const isNismaraPlus = (session?.user as any)?.nismaraplus?.status === true;

      if (logoFile) {
        setIsUploading(true);
        const compressed = await compressImageToWebP(logoFile, isNismaraPlus ? 5 : 3, 1024);
        
        const resUpload = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: compressed.name,
            fileType: compressed.type,
            fileSize: compressed.size,
            folder: "fleet/brands",
          }),
        });
        const uploadData = await resUpload.json();
        if (!resUpload.ok) throw new Error(uploadData.error || "Gagal mendapatkan URL upload");

        const s3Res = await fetch(uploadData.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": compressed.type },
          body: compressed,
        });
        if (!s3Res.ok) throw new Error("Gagal mengupload file ke server");
        
        finalLogoUrl = uploadData.publicUrl;
        setIsUploading(false);
      }

      const url = isEditMode ? `/api/fleet/brand/${formData.id}` : `/api/fleet/brand`;
      const method = isEditMode ? "PATCH" : "POST";

      const payload = {
        ...formData,
        logo_url: finalLogoUrl,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Gagal menyimpan data");
      
      showToast(isEditMode ? "Brand berhasil diupdate!" : "Brand berhasil ditambahkan!", "success");
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      showToast("Gagal menyimpan brand.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Format tidak didukung! Harap unggah gambar.", "error");
      return;
    }

    const isNismaraPlus = (session?.user as any)?.nismaraplus?.status === true;
    
    if (!isNismaraPlus && file.type === "image/gif") {
      showToast("Hanya member Nismara+ yang diizinkan mengunggah GIF.", "error");
      return;
    }

    const maxSizeMB = isNismaraPlus ? 5 : 3;
    if (file.size > maxSizeMB * 1024 * 1024) {
      showToast(`Maksimal ukuran file adalah ${maxSizeMB}MB.`, "error");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setFormData({ ...formData, logo_url: previewUrl });
    setLogoFile(file);
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
            <div className="p-2 bg-primary/10 rounded-lg text-primary border border-primary/20">
              <CalendarDays size={20} />
            </div>
            <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase">
              Brand Management
            </h1>
          </div>
          <p className="text-foreground/40 font-bold uppercase text-[10px] tracking-[0.2em] ml-11">
            Nismara Transport • Manage Fleet Brands
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* SEARCH BAR */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/20 group-focus-within:text-primary transition-colors"
              size={18}
            />
            <input
              type="text"
              placeholder="Search brand name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-border rounded-2xl py-4 pl-12 pr-4 text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddClick}
              className="inline-flex items-center gap-2 px-6 py-4 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-2xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap"
            >
              <Plus size={16} /> Add Brand
            </button>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="glass-panel rounded-[2rem] border border-border overflow-hidden">
          <div className="overflow-x-auto max-h-[65vh]">
            <table className="w-full text-left border-collapse relative">
              <thead>
                <tr className="text-foreground/20 text-[10px] font-black uppercase tracking-widest border-b border-border bg-card/80 sticky top-0 z-10 backdrop-blur-md">
                  <th className="px-8 py-5">Brand Info</th>
                  <th className="px-8 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={2} className="px-8 py-20 text-center text-foreground/20 font-black uppercase tracking-[0.2em] italic">
                      Loading fleet brands...
                    </td>
                  </tr>
                ) : filteredBrands.length > 0 ? (
                  filteredBrands.map((brand) => (
                    <tr
                      key={brand._id}
                      className="hover:bg-white/[0.02] group transition-all"
                    >
                      {/* Brand Info */}
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-4">
                          <img
                            src={brand.logo_url || "https://placehold.co/60x60?text=Logo"}
                            alt={brand.name}
                            className="w-12 h-12 object-contain rounded-md border border-border bg-white/5 p-1"
                          />
                          <div>
                            <p className="font-black text-foreground leading-none uppercase tracking-tight">
                              {brand.name}
                            </p>
                            <p className="text-[10px] font-mono text-foreground/30 mt-1">
                              ID: {brand.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-8 py-4 text-right">
                        <button
                          onClick={() => handleEditClick(brand)}
                          className="inline-flex items-center justify-center p-3 bg-white/5 rounded-xl text-foreground/40 hover:text-primary hover:bg-primary/10 transition-all group/btn border border-transparent hover:border-primary/20"
                          title="Edit Brand"
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
                      colSpan={2}
                      className="px-8 py-20 text-center text-foreground/20 font-black uppercase tracking-[0.2em] italic"
                    >
                      No brands found
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
          <div className="glass-panel p-8 rounded-[2rem] border border-border/50 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-foreground/40 hover:text-foreground transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg text-primary border border-primary/20">
                  {isEditMode ? <Edit2 size={16} /> : <Plus size={16} />}
                </div>
                <h2 className="text-xl font-black text-foreground uppercase tracking-tight">
                  {isEditMode ? "Edit Brand" : "Add New Brand"}
                </h2>
              </div>
              <p className="text-foreground/40 text-xs font-bold uppercase tracking-widest mt-2">
                {isEditMode ? "Ubah detail brand" : "Masukkan data brand baru"}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-8">
              <div>
                <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                  Brand ID (Unik)
                </label>
                <input
                  type="text"
                  value={formData.id}
                  disabled={isEditMode}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary transition-all disabled:opacity-50"
                  placeholder="e.g. SCANIA"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                  Nama Brand
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary transition-all"
                  placeholder="e.g. Scania"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">
                  Logo (Upload)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.logo_url}
                    readOnly
                    className="flex-1 bg-white/5 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none opacity-50 cursor-not-allowed"
                    placeholder="URL akan terisi otomatis"
                  />
                  <label className="inline-flex items-center gap-2 px-4 py-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl cursor-pointer transition-all">
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

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-foreground/60 hover:text-foreground hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !formData.id || !formData.name}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 disabled:opacity-50 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
              >
                {isSaving ? "Saving..." : <><Save size={14} /> {isEditMode ? "Save Changes" : "Add Brand"}</>}
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
