"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react"; // Tambahkan useEffect
import { updateProfile, getUserSettings } from "./actions"; // Import getUserSettings
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
  Link,
} from "lucide-react";
import { compressImageToWebP } from "@/lib/imageUtils";

export default function SettingsClient() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true); // State loading awal
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // State form
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [bgUrl, setBgUrl] = useState("");

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
      }
      setIsInitialLoading(false);
    }

    if (session) {
      fetchInitialData();
    }
  }, [session]);

  // Fungsi handleFileUpload tetap sama seperti sebelumnya...
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "avatar" | "banner" | "background",
  ) => {
    let file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Format tidak didukung! Harap unggah gambar.");
      return;
    }

    const isNismaraPlus = (session?.user as any)?.nismaraplus?.status === true;
    
    // Validasi Format
    if (!isNismaraPlus && file.type === "image/gif") {
      alert("Hanya member Nismara+ yang diizinkan mengunggah GIF.");
      return;
    }

    // Validasi Ukuran
    const MAX_SIZE = isNismaraPlus ? 10 * 1024 * 1024 : 3 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert(`Maksimal ukuran file adalah ${isNismaraPlus ? "10MB" : "3MB"}.`);
      return;
    }

    setIsUploading((prev) => ({ ...prev, [type]: true }));

    try {
      // Kompresi (otomatis bypass GIF di imageUtils)
      file = await compressImageToWebP(file, isNismaraPlus ? 10 : 3, 1920);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          folder: "profiles",
        }),
      });
      const { signedUrl, publicUrl } = await res.json();

      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (uploadRes.ok) {
        if (type === "avatar") setAvatarUrl(publicUrl);
        if (type === "banner") setBannerUrl(publicUrl);
        if (type === "background") setBgUrl(publicUrl);
      }
    } catch (error) {
      console.error(error);
      alert("Gagal mengunggah gambar.");
    } finally {
      setIsUploading((prev) => ({ ...prev, [type]: false }));
      e.target.value = "";
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

    const result = await updateProfile(formData);

    if (result.success) {
      setMessage({ type: "success", text: result.message });
      await update({
        name: formData.get("name"),
        image: formData.get("image"),
      });
    } else {
      setMessage({ type: "error", text: result.message });
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
            Profile Settings
          </h1>
          <p className="text-gray-400">
            Kustomisasi identitas publik Nismara kamu.
          </p>
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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleSubmit(formData);
          }}
          className="space-y-8"
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
              <Link className="text-pink-500 w-5 h-5" /> Tautan Sosial Media
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
      </div>
    </main>
  );
}
