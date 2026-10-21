"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react"; // Tambahkan useEffect
import {
  updateProfile,
  getUserSettings,
  syncTruckersMP,
  unlinkTruckersMP,
  submitHaulmpApplication,
  cancelHaulmpApplication,
} from "./actions"; // Import actions TMP & HaulMP
import {
  User,
  Image as ImageIcon,
  Layout,
  Monitor,
  Save,
  Loader2,
  CheckCircle,
  UploadCloud,
  ShieldAlert,
  Link as LinkIcon,
  Truck,
  Unlink,
  Clock,
  Send,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { compressImageToWebP } from "@/lib/imageUtils";
import { showAlert, showConfirm } from "@/lib/dialog";


export default function SettingsClient() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true); // State loading awal
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Tab State: "profile" | "sync"
  const [activeTab, setActiveTab] = useState<"profile" | "sync">("profile");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "sync" || tabParam === "profile") {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const handleTabChange = (tab: "profile" | "sync") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  // TMP State
  const [tmpId, setTmpId] = useState("");
  const [isTmpDriver, setIsTmpDriver] = useState(false);
  const [truckersmpId, setTruckersmpId] = useState<string | null>(null);
  const [isSyncingTmp, setIsSyncingTmp] = useState(false);

  // HaulMP State
  const [isDriver, setIsDriver] = useState(false);
  const [isHaulmpDriver, setIsHaulmpDriver] = useState(false);
  const [haulmpId, setHaulmpId] = useState<string | null>(null);
  const [haulmpApp, setHaulmpApp] = useState<any | null>(null);
  const [haulmpNotes, setHaulmpNotes] = useState("");
  const [isSubmittingHaulmp, setIsSubmittingHaulmp] = useState(false);
  const [isCancellingHaulmp, setIsCancellingHaulmp] = useState(false);

  // State form
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [bgUrl, setBgUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bgFile, setBgFile] = useState<File | null>(null);

  const [isUploading, setIsUploading] = useState({
    avatar: false,
    banner: false,
    background: false,
  });

  const [socialMedia, setSocialMedia] = useState({
    youtube: "",
    facebook: "",
    instagram: "",
    twitter: "",
    tiktok: "",
    world_of_truck: "",
    website: "",
  });

  // LOGIKA PENGAMBILAN DATA AWAL
  useEffect(() => {
    async function fetchInitialData() {
      const data = await getUserSettings();
      if (data) {
        setName(data.name);
        setAvatarUrl(data.image);
        setBannerUrl(data.bannerUrl);
        setBgUrl(data.backgroundUrl);
        if (data.social_media) {
          setSocialMedia({
            youtube: data.social_media.youtube || "",
            facebook: data.social_media.facebook || "",
            instagram: data.social_media.instagram || "",
            twitter: data.social_media.twitter || "",
            tiktok: data.social_media.tiktok || "",
            world_of_truck: data.social_media.world_of_truck || "",
            website: data.social_media.website || "",
          });
        }
        setTruckersmpId(data.truckersmpId || null);
        setIsTmpDriver(data.isTmpDriver || false);
        setIsDriver(Boolean(data.isDriver));
        setIsHaulmpDriver(Boolean(data.isHaulmpDriver));
        setHaulmpId(data.haulmpId || null);
        setHaulmpApp(data.haulmpApplication || null);
      }
      setIsInitialLoading(false);
    }

    if (session) {
      fetchInitialData();
    }
  }, [session]);

  const handleSyncTmp = async () => {
    if (!tmpId || isNaN(Number(tmpId))) {
      showAlert("ID TruckersMP harus berupa angka yang valid.");
      return;
    }
    
    setIsSyncingTmp(true);
    const result = await syncTruckersMP(Number(tmpId));
    setIsSyncingTmp(false);
    
    if (result.success) {
      showAlert(result.message);
      setTruckersmpId(tmpId);
      setIsTmpDriver(true);
    } else {
      if (result.message.includes("Ticket") || result.message.includes("bukan member")) {
         setMessage({ type: "error", text: result.message + " Buka menu Ticket untuk meminta bantuan." });
      } else {
         showAlert(result.message, "error");
      }
    }
  };

  const handleUnlinkTmp = async () => {
    if (await showConfirm("Yakin ingin memutus tautan akun TruckersMP Anda?")) {
      setIsSyncingTmp(true);
      const result = await unlinkTruckersMP();
      setIsSyncingTmp(false);
      
      if (result.success) {
        showAlert(result.message);
        setTruckersmpId(null);
        setIsTmpDriver(false);
        setTmpId("");
      } else {
        showAlert(result.message, "error");
      }
    }
  };

  const handleSubmitHaulmp = async () => {
    setIsSubmittingHaulmp(true);
    try {
      const result = await submitHaulmpApplication(haulmpNotes);
      if (result.success) {
        await showAlert(result.message);
        const data = await getUserSettings();
        if (data) {
          setIsHaulmpDriver(Boolean(data.isHaulmpDriver));
          setHaulmpApp(data.haulmpApplication || null);
        }
        setHaulmpNotes("");
      } else {
        await showAlert(result.message, "error");
      }
    } catch (error) {
      console.error(error);
      await showAlert("Terjadi kesalahan internal saat mengajukan verifikasi.", "error");
    } finally {
      setIsSubmittingHaulmp(false);
    }
  };

  const handleCancelHaulmp = async () => {
    if (!(await showConfirm("Yakin ingin membatalkan pengajuan verifikasi VTC HaulMP Anda?"))) {
      return;
    }
    setIsCancellingHaulmp(true);
    try {
      const result = await cancelHaulmpApplication();
      if (result.success) {
        await showAlert(result.message);
        const data = await getUserSettings();
        if (data) {
          setIsHaulmpDriver(Boolean(data.isHaulmpDriver));
          setHaulmpApp(data.haulmpApplication || null);
        }
      } else {
        await showAlert(result.message, "error");
      }
    } catch (error) {
      console.error(error);
      await showAlert("Terjadi kesalahan saat membatalkan pengajuan.", "error");
    } finally {
      setIsCancellingHaulmp(false);
    }
  };

  const uploadToR2 = async (file: File, folder: string) => {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        folder,
      }),
    });
    const { signedUrl, publicUrl } = await res.json();
    await fetch(signedUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
    return publicUrl;
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "avatar" | "banner" | "background",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showAlert("Format tidak didukung! Harap unggah gambar.");
      return;
    }

    const isNismaraPlus = (session?.user as any)?.nismaraplus?.status === true;
    
    // Validasi Format
    if (!isNismaraPlus && file.type === "image/gif") {
      showAlert("Hanya member Nismara+ yang diizinkan mengunggah GIF.");
      return;
    }

    // Validasi Ukuran
    const maxSizeMB = isNismaraPlus ? 5 : 3;
    if (file.size > maxSizeMB * 1024 * 1024) {
      showAlert(`Maksimal ukuran file adalah ${maxSizeMB}MB.`);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    if (type === "avatar") {
      setAvatarUrl(previewUrl);
      setAvatarFile(file);
    }
    if (type === "banner") {
      setBannerUrl(previewUrl);
      setBannerFile(file);
    }
    if (type === "background") {
      setBgUrl(previewUrl);
      setBgFile(file);
    }
  };

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setMessage(null);

    // Validasi URL Sosial Media
    const validators = {
      youtube: (url: string) => url === "" || url.includes("youtube.com") || url.includes("youtu.be"),
      facebook: (url: string) => url === "" || url.includes("facebook.com") || url.includes("fb.com"),
      instagram: (url: string) => url === "" || url.includes("instagram.com"),
      twitter: (url: string) => url === "" || url.includes("twitter.com") || url.includes("x.com"),
      tiktok: (url: string) => url === "" || url.includes("tiktok.com"),
      world_of_truck: (url: string) => url === "" || url.includes("worldoftrucks.com"),
    };

    for (const [key, validator] of Object.entries(validators)) {
      if (!validator(formData.get(key) as string)) {
        setMessage({ type: "error", text: `Link ${key} tidak valid. Pastikan sesuai dengan platformnya!` });
        setIsLoading(false);
        return;
      }
    }

    try {
      let finalAvatarUrl = formData.get("image") as string;
      let finalBannerUrl = formData.get("bannerUrl") as string;
      let finalBgUrl = formData.get("backgroundUrl") as string;

      if (avatarFile) {
        setIsUploading(prev => ({ ...prev, avatar: true }));
        const compressed = await compressImageToWebP(avatarFile);
        finalAvatarUrl = await uploadToR2(compressed, "profiles");
        formData.set("image", finalAvatarUrl);
        setIsUploading(prev => ({ ...prev, avatar: false }));
      }
      if (bannerFile) {
        setIsUploading(prev => ({ ...prev, banner: true }));
        const compressed = await compressImageToWebP(bannerFile);
        finalBannerUrl = await uploadToR2(compressed, "profiles");
        formData.set("bannerUrl", finalBannerUrl);
        setIsUploading(prev => ({ ...prev, banner: false }));
      }
      if (bgFile) {
        setIsUploading(prev => ({ ...prev, background: true }));
        const compressed = await compressImageToWebP(bgFile);
        finalBgUrl = await uploadToR2(compressed, "profiles");
        formData.set("backgroundUrl", finalBgUrl);
        setIsUploading(prev => ({ ...prev, background: false }));
      }

      const result = await updateProfile(formData);

      if (result.success) {
        setMessage({ type: "success", text: result.message });
        await update({
          name: formData.get("name"),
          image: finalAvatarUrl,
        });
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Terjadi kesalahan saat memproses gambar." });
    }

    setIsLoading(false);
  }

  // Tampilan saat loading data dari DB
  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-foreground">
            Pengaturan Akun
          </h1>
          <p className="text-gray-400">
            Kustomisasi identitas publik Nismara kamu dan kelola sinkronisasi akun game eksternal.
          </p>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex items-center gap-2 p-1.5 bg-black/40 border border-white/10 rounded-2xl mb-8 w-full sm:w-fit backdrop-blur-md">
          <button
            type="button"
            onClick={() => handleTabChange("profile")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === "profile"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "text-gray-400 hover:text-foreground hover:bg-white/5"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profil & Kustomisasi</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("sync")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 relative ${
              activeTab === "sync"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "text-gray-400 hover:text-foreground hover:bg-white/5"
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            <span>Sinkronisasi Akun</span>
            {(truckersmpId || isHaulmpDriver) && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block ring-2 ring-black" />
            )}
          </button>
        </div>

        {message && (
          <div
            className={`p-4 mb-6 rounded-2xl border backdrop-blur-sm flex items-center gap-3 transition-all duration-300 shadow-lg ${
              message.type === "success"
                ? "bg-accent-sky/10 border-accent-sky/20 text-accent-sky shadow-accent-sky/5"
                : "bg-red-500/10 border-red-500/20 text-red-400 shadow-red-500/5"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="w-5 h-5 shrink-0" />
            ) : (
              <ShieldAlert className="w-5 h-5 shrink-0" />
            )}
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {/* TAB 1: PROFIL & KUSTOMISASI */}
        {activeTab === "profile" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleSubmit(formData);
            }}
            className="space-y-8 animate-in fade-in duration-200"
          >
          <div className="glass-panel p-8 rounded-[2rem] border-border/50">
            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <User className="text-primary w-5 h-5" /> Identitas Dasar
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Display Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> Avatar Profile
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full border-2 border-border/50 overflow-hidden bg-black/20 shrink-0">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="text-gray-500 w-5 h-5" />
                    )}
                  </div>
                  <input
                    type="file"
                    id="avatarUpload"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, "avatar")}
                  />
                  <label
                    htmlFor="avatarUpload"
                    className="cursor-pointer px-4 py-2 bg-card border border-border text-foreground text-sm font-bold rounded-xl hover:border-primary/50 transition-colors"
                  >
                    {isUploading.avatar ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Ganti Avatar"
                    )}
                  </label>
                </div>
                <input type="hidden" name="image" value={avatarUrl} />
              </div>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-[2rem] border-border/50">
            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Layout className="text-accent-sky w-5 h-5" /> Kustomisasi Tema
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Banner Section */}
              <div className="space-y-2">
                <div className="w-full h-24 rounded-xl border-2 border-border/50 overflow-hidden bg-black/20 mb-4">
                  {bannerUrl ? (
                    <img
                      src={bannerUrl}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                      No Banner
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  id="bannerUpload"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "banner")}
                />
                <label
                  htmlFor="bannerUpload"
                  className="cursor-pointer flex justify-center py-2 bg-card border border-border text-foreground text-sm font-bold rounded-xl hover:border-accent-sky/50 transition-colors"
                >
                  {isUploading.banner ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Upload Banner"
                  )}
                </label>
                <input type="hidden" name="bannerUrl" value={bannerUrl} />
              </div>

              {/* Background Section */}
              <div className="space-y-2">
                <div className="w-full h-24 rounded-xl border-2 border-border/50 overflow-hidden bg-black/20 mb-4">
                  {bgUrl ? (
                    <img src={bgUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                      No Background
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  id="bgUpload"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "background")}
                />
                <label
                  htmlFor="bgUpload"
                  className="cursor-pointer flex justify-center py-2 bg-card border border-border text-foreground text-sm font-bold rounded-xl hover:border-accent-sky/50 transition-colors"
                >
                  {isUploading.background ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Upload Background"
                  )}
                </label>
                <input type="hidden" name="backgroundUrl" value={bgUrl} />
              </div>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-[2rem] border-border/50">
            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <LinkIcon className="text-pink-500 w-5 h-5" /> Tautan Sosial Media
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { id: "youtube", label: "YouTube URL", placeholder: "https://youtube.com/..." },
                { id: "facebook", label: "Facebook URL", placeholder: "https://facebook.com/..." },
                { id: "instagram", label: "Instagram URL", placeholder: "https://instagram.com/..." },
                { id: "twitter", label: "Twitter / X URL", placeholder: "https://twitter.com/..." },
                { id: "tiktok", label: "TikTok URL", placeholder: "https://tiktok.com/..." },
                { id: "world_of_truck", label: "World of Trucks URL", placeholder: "https://worldoftrucks.com/..." },
                { id: "website", label: "Website Pribadi", placeholder: "https://my-website.com" },
              ].map((platform) => (
                <div key={platform.id} className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {platform.label}
                  </label>
                  <input
                    type="url"
                    name={platform.id}
                    value={socialMedia[platform.id as keyof typeof socialMedia]}
                    onChange={(e) => setSocialMedia({ ...socialMedia, [platform.id]: e.target.value })}
                    placeholder={platform.placeholder}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-pink-500 transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary/80 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-primary/20"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
        )}

        {/* TAB 2: SINKRONISASI AKUN */}
        {activeTab === "sync" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Info Notice */}
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-3">
              <LinkIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-foreground">Sinkronisasi Platform Eksternal</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Hubungkan akun game eksternal Anda untuk integrasi data konvoi, leaderboard, dan verifikasi driver resmi Nismara Transport.
                </p>
              </div>
            </div>

            {/* TRUCKERSMP SYNC CARD */}
            <div className="glass-panel p-8 rounded-[2rem] border-border/50 bg-black/40">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Truck className="text-orange-500 w-5 h-5" /> Integrasi TruckersMP
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                Tautkan akun TruckersMP Anda untuk memastikan Anda adalah anggota Nismara Transport.
              </p>
              
              {truckersmpId ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
                    <div>
                      <h3 className="font-bold text-green-400">Akun Terhubung</h3>
                      <p className="text-sm text-green-500/80">ID TruckersMP: {truckersmpId}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleUnlinkTmp}
                    disabled={isSyncingTmp}
                    className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 font-bold rounded-xl text-sm transition-colors flex items-center gap-2"
                  >
                    {isSyncingTmp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                    Putuskan Tautan
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-end gap-4">
                  <div className="w-full space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      ID TruckersMP
                    </label>
                    <input
                      type="text"
                      value={tmpId}
                      onChange={(e) => setTmpId(e.target.value)}
                      placeholder="Contoh: 5610149"
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                  <button 
                    onClick={handleSyncTmp}
                    disabled={isSyncingTmp || !tmpId}
                    className="w-full sm:w-auto px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                  >
                    {isSyncingTmp ? <Loader2 className="w-5 h-5 animate-spin" /> : <Truck className="w-5 h-5" />}
                    Sinkronisasi
                  </button>
                </div>
              )}
            </div>

            {/* HAULMP INTEGRATION CARD */}
            {(isDriver || (session?.user as any)?.isDriver) ? (
              <div className="glass-panel p-8 rounded-[2rem] border-border/50 bg-black/40">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <Truck className="text-emerald-400 w-5 h-5" /> Integrasi VTC HaulMP
                  </h2>
                  {isHaulmpDriver ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Terverifikasi
                    </span>
                  ) : haulmpApp?.status === "pending" ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Menunggu Persetujuan
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/5 text-gray-400 border border-white/10">
                      Belum Terdaftar
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-400 mb-6">
                  Verifikasi akun Anda di platform multiplayer HaulMP untuk mencatat pekerjaan dan mengikuti konvoi resmi Nismara Transport di HaulMP.
                </p>

                {isHaulmpDriver ? (
                  <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                      <div>
                        <h3 className="font-bold text-emerald-400 text-base">Driver HaulMP Aktif</h3>
                        <p className="text-xs text-emerald-300/80">
                          Akun Anda telah terdaftar dan diverifikasi dalam roster VTC HaulMP Nismara Transport.
                        </p>
                      </div>
                    </div>
                    {haulmpId && (
                      <div className="pt-2 border-t border-emerald-500/20 text-xs text-emerald-300/90 font-mono">
                        ID HaulMP: {haulmpId}
                      </div>
                    )}
                  </div>
                ) : haulmpApp?.status === "pending" ? (
                  <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-4">
                    <div className="flex items-start gap-3">
                      <Clock className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h3 className="font-bold text-amber-400 text-base">Pengajuan Sedang Ditinjau</h3>
                        <p className="text-xs text-amber-300/80 leading-relaxed">
                          Pengajuan verifikasi VTC HaulMP Anda telah terkirim dan sedang menunggu pemeriksaan oleh manajemen Nismara.
                        </p>
                        {haulmpApp.notes && (
                          <p className="text-xs text-amber-200/70 italic mt-1 bg-black/20 p-2 rounded-lg border border-amber-500/10">
                            Catatan Anda: &quot;{haulmpApp.notes}&quot;
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-amber-500/20">
                      <button
                        type="button"
                        onClick={handleCancelHaulmp}
                        disabled={isCancellingHaulmp}
                        className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isCancellingHaulmp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        Batalkan Pengajuan
                      </button>
                      {haulmpApp.channelId ? (
                        <a
                          href={`https://discord.com/channels/863959415702028318/${haulmpApp.channelId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-[#5865F2]/20 hover:bg-[#5865F2]/30 text-[#9aa4fc] border border-[#5865F2]/40 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Kunjungi Channel Tiket
                        </a>
                      ) : (
                        <a
                          href="https://discord.gg/nismara"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Buka Discord Nismara
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {haulmpApp?.status === "rejected" && (
                      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 space-y-1">
                        <div className="font-bold text-red-400 flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4" /> Pengajuan Sebelumnya Ditolak
                        </div>
                        {(haulmpApp.reviewReason || haulmpApp.reviewNotes) && (
                          <p className="italic">Alasan manajemen: &quot;{haulmpApp.reviewReason || haulmpApp.reviewNotes}&quot;</p>
                        )}
                        <p className="text-red-400/80">
                          Anda dapat mengajukan permohonan verifikasi kembali setelah memperbaiki persyaratan.
                        </p>
                      </div>
                    )}

                    <div className="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-2 text-xs text-gray-400">
                      <p className="font-semibold text-gray-300">Langkah Verifikasi Driver HaulMP:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-1 text-gray-400">
                        <li>Pastikan Anda sudah bergabung / mengirim application ke VTC Nismara di platform HaulMP.</li>
                        <li>Kirim pengajuan verifikasi melalui formulir di bawah ini (sertakan catatan atau link profil jika ada).</li>
                        <li>Buka tiket di channel Discord Nismara jika membutuhkan konfirmasi cepat dari manajemen.</li>
                      </ol>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Catatan / Tautan Profil HaulMP (Opsional)
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="text"
                          value={haulmpNotes}
                          onChange={(e) => setHaulmpNotes(e.target.value)}
                          placeholder="Contoh: Sudah apply di VTC HaulMP nama akun..."
                          className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={handleSubmitHaulmp}
                          disabled={isSubmittingHaulmp}
                          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 text-sm"
                        >
                          {isSubmittingHaulmp ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          Ajukan Verifikasi
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-panel p-6 rounded-[2rem] border-border/50 bg-black/20 text-xs text-gray-400 flex items-center gap-3">
                <Truck className="w-5 h-5 text-gray-500 shrink-0" />
                <p>
                  Integrasi VTC HaulMP khusus diperuntukkan bagi Driver terdaftar Nismara Transport.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
