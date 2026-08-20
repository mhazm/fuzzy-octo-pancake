"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showAlert } from "@/lib/dialog";
import { createCommunityGoal } from "../actions";
import { Target, Info, Calendar, Trophy, ChevronDown, ChevronUp, Upload } from "lucide-react";
import { compressImageToWebP } from "@/lib/imageUtils";

export default function CreateGoalClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<"nc" | "km">("nc");
  const [rewardType, setRewardType] = useState<"currency-boost" | "coupon" | "special-contract">("currency-boost");
  
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (!isSlugManuallyEdited) {
      setSlug(newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
    setIsSlugManuallyEdited(true);
  };

  // Achievement Rewards state
  const [showAchievements, setShowAchievements] = useState(false);
  const [participantAch, setParticipantAch] = useState({ enabled: false, name: "", description: "" });
  const [topContribAch, setTopContribAch] = useState({ enabled: false, name: "", description: "" });
  const [participantAchFile, setParticipantAchFile] = useState<File | null>(null);
  const [participantAchPreview, setParticipantAchPreview] = useState<string | null>(null);
  const [topContribAchFile, setTopContribAchFile] = useState<File | null>(null);
  const [topContribAchPreview, setTopContribAchPreview] = useState<string | null>(null);

  // Goal Banner Image state
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleAchImageSelect = (file: File, type: "participant" | "topContrib") => {
    const preview = URL.createObjectURL(file);
    if (type === "participant") { setParticipantAchFile(file); setParticipantAchPreview(preview); }
    else { setTopContribAchFile(file); setTopContribAchPreview(preview); }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const targetAmount = Number(formData.get("targetAmount"));
    if (type === "nc" && targetAmount < 200000) {
      setLoading(false);
      return showAlert("Target NC minimal adalah 200.000 NC", "Target Terlalu Kecil");
    }
    if (type === "km" && targetAmount < 50000) {
      setLoading(false);
      return showAlert("Target KM minimal adalah 50.000 KM", "Target Terlalu Kecil");
    }

    formData.set("type", type);
    formData.set("rewardType", rewardType);

    // Upload achievement images if any and pass data
    const uploadImage = async (file: File, maxDimension: number = 512, folder: string = "achievements") => {
      const compressed = await compressImageToWebP(file, 3, maxDimension);
      const presignRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: compressed.name, fileType: compressed.type, folder, fileSize: compressed.size }),
      });
      if (!presignRes.ok) return null;
      const { signedUrl, publicUrl } = await presignRes.json();
      await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": compressed.type }, body: compressed });
      return publicUrl as string;
    };

    if (bannerFile) {
      const imageUrl = await uploadImage(bannerFile, 1280, "community-goals");
      if (imageUrl) formData.set("imageUrl", imageUrl);
    }

    if (participantAch.enabled) {
      const imageUrl = participantAchFile ? await uploadImage(participantAchFile, 512, "achievements") : null;
      formData.set("achParticipant", JSON.stringify({ ...participantAch, imageUrl }));
    }
    if (topContribAch.enabled) {
      const imageUrl = topContribAchFile ? await uploadImage(topContribAchFile, 512, "achievements") : null;
      formData.set("achTopContrib", JSON.stringify({ ...topContribAch, imageUrl }));
    }

    const res = await createCommunityGoal(formData);
    
    setLoading(false);
    
    if (res.success) {
      await showAlert("Usulan Community Goal Anda berhasil dikirim ke Manager untuk ditinjau.", "Berhasil!");
      router.push("/dashboard");
    } else {
      await showAlert(res.error || "Terjadi kesalahan.", "Gagal");
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-12 pb-20 px-4 md:px-0">
      <div>
        <h1 className="text-3xl font-black text-foreground mb-2 flex items-center gap-3">
          <Target className="text-primary w-8 h-8" />
          Usulkan Community Goal
        </h1>
        <p className="text-muted-foreground">
          Ajak seluruh driver Nismara Transport untuk bersama-sama mencapai target dan dapatkan hadiah komunitas!
        </p>
      </div>

      <Card className="border-border/50 bg-card/40 backdrop-blur-md shadow-xl overflow-hidden">
        <div className="bg-primary/10 p-4 border-b border-border flex items-start gap-3 text-sm text-foreground/80">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p>
            Goal yang Anda usulkan tidak akan langsung diterbitkan. Tim Management akan meninjau kelayakan target dan hadiah yang Anda usulkan sebelum menyetujuinya.
          </p>
        </div>
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Judul Goal <span className="text-red-500">*</span></Label>
              <Input 
                id="title" 
                name="title" 
                value={title}
                onChange={handleTitleChange}
                placeholder="Contoh: Operasi Bersih Jalan Pantura" 
                required 
                maxLength={60}
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL) <span className="text-red-500">*</span></Label>
              <p className="text-xs text-muted-foreground mb-1">Tautan unik untuk goal ini. Hanya gunakan huruf, angka, dan strip (-).</p>
              <Input 
                id="slug" 
                name="slug" 
                value={slug}
                onChange={handleSlugChange}
                placeholder="operasi-bersih-pantura" 
                required 
                maxLength={60}
                className="bg-background/50 font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi <span className="text-red-500">*</span></Label>
              <Textarea 
                id="description" 
                name="description" 
                placeholder="Ceritakan latar belakang atau motivasi dari goal ini..." 
                required 
                rows={4}
                className="bg-background/50 resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Banner / Gambar Goal (Opsional)</Label>
              <p className="text-xs text-muted-foreground mb-2">Unggah gambar dengan rasio lanskap sangat disarankan. Gambar akan otomatis dikompresi (Maks 3MB).</p>
              <label className={`w-full h-48 sm:h-64 rounded-xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer flex items-center justify-center overflow-hidden transition-colors relative bg-background/50 group`}>
                {bannerPreview ? (
                  <>
                    <img src={bannerPreview} className="w-full h-full object-cover" alt="Banner Preview" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white font-bold text-sm flex items-center gap-2">
                        <Upload className="w-4 h-4" /> Ganti Gambar
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <Upload className="w-8 h-8 mb-2" />
                    <span className="text-sm font-semibold">Klik untuk memilih gambar</span>
                  </div>
                )}
                <input 
                  type="file" 
                  name="imageFile" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleBannerSelect} 
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Tipe Target <span className="text-red-500">*</span></Label>
                <Select value={type} onValueChange={(v) => v && setType(v as "nc" | "km")}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue>{type === "nc" ? "Nismara Coin (Donasi)" : "Jarak Tempuh (Kilometer)"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nc">Nismara Coin (Donasi)</SelectItem>
                    <SelectItem value="km">Jarak Tempuh (Kilometer)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetAmount">Jumlah Target <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input 
                    id="targetAmount" 
                    name="targetAmount" 
                    type="number" 
                    min={1} 
                    required 
                    placeholder="Contoh: 50000"
                    className="bg-background/50 pl-4 pr-12"
                  />
                  <div className="absolute inset-y-0 right-4 flex items-center text-sm font-bold text-muted-foreground pointer-events-none">
                    {type === "nc" ? "NC" : "KM"}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Tenggat Waktu (Deadline) <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input 
                  id="deadline" 
                  name="deadline" 
                  type="datetime-local" 
                  required 
                  className="bg-background/50 pl-10"
                />
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="border-t border-border/50 pt-6 mt-6">
              <h3 className="text-lg font-bold text-foreground mb-4">Usulan Hadiah</h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Tipe Hadiah <span className="text-red-500">*</span></Label>
                  <Select value={rewardType} onValueChange={(v) => v && setRewardType(v as "currency-boost" | "coupon" | "special-contract")}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue>{rewardType === "currency-boost" ? "Currency Boost Event" : rewardType === "coupon" ? "Kupon Massal" : "Special Contract"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="currency-boost">Currency Boost Event</SelectItem>
                      <SelectItem value="coupon">Kupon Massal</SelectItem>
                      <SelectItem value="special-contract">Special Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {rewardType === "currency-boost" && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label htmlFor="multiplier">Multiplier Pendapatan (x) <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input 
                        id="multiplier" 
                        name="multiplier" 
                        type="number" 
                        step="0.1" 
                        min={0.1} 
                        placeholder="Contoh: 0.5"
                        required={rewardType === "currency-boost"}
                        className="bg-background/50 pr-8"
                      />
                      <div className="absolute inset-y-0 right-4 flex items-center text-sm font-bold text-muted-foreground pointer-events-none">
                        x
                      </div>
                    </div>
                  </div>
                )}

                {rewardType === "coupon" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <Label htmlFor="couponType">Isi Kupon</Label>
                      <Select defaultValue="NC" name="couponType">
                        <SelectTrigger className="bg-background/50">
                          <SelectValue placeholder="Pilih isi kupon..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NC">Nismara Coin</SelectItem>
                          <SelectItem value="Penalty Remover">Penghapus Penalti (Poin)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="couponAmount">Jumlah / Nilai <span className="text-red-500">*</span></Label>
                      <Input 
                        id="couponAmount" 
                        name="couponAmount" 
                        type="number" 
                        min={1} 
                        placeholder="Contoh: 500"
                        required={rewardType === "coupon"}
                        className="bg-background/50"
                      />
                    </div>
                  </div>
                )}

                {rewardType === "special-contract" && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label htmlFor="companyName">Nama Perusahaan (Special Contract) <span className="text-red-500">*</span></Label>
                    <Input 
                      id="companyName" 
                      name="companyName" 
                      placeholder="Contoh: IKEA, Scania, Volvo..."
                      required={rewardType === "special-contract"}
                      className="bg-background/50"
                    />
                  </div>
                )}
                
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 pt-2 border-t border-border/50">
                  <Label htmlFor="rewardDuration">Durasi Aktif Hadiah (Hari) <span className="text-red-500">*</span></Label>
                  <p className="text-xs text-muted-foreground mb-1">Berapa lama event/kupon ini akan aktif jika target tercapai?</p>
                  <Input 
                    id="rewardDuration" 
                    name="rewardDuration" 
                    type="number" 
                    min={1} 
                    placeholder="Contoh: 3"
                    required
                    className="bg-background/50"
                  />
                </div>
              </div>
            </div>

            {/* ===== ACHIEVEMENT REWARDS ===== */}
            <div className="border border-amber-500/30 rounded-xl bg-amber-500/5 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAchievements(!showAchievements)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-amber-500/10 transition-colors"
              >
                <div className="flex items-center gap-2 font-bold text-amber-400">
                  <Trophy className="w-4 h-4" />
                  Hadiah Achievement (Opsional)
                </div>
                {showAchievements ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>

              {showAchievements && (
                <div className="p-4 pt-0 space-y-6">
                  <p className="text-xs text-muted-foreground">Achievement akan <strong>dibuat dan dibagikan otomatis</strong> hanya jika goal ini berhasil diselesaikan. Jika gagal, achievement tidak akan ada.</p>

                  {/* Achievement Semua Partisipan */}
                  <div className="space-y-3 border border-border/50 rounded-lg p-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={participantAch.enabled} onChange={e => setParticipantAch(p => ({ ...p, enabled: e.target.checked }))} className="w-4 h-4 accent-amber-500" />
                      <span className="font-semibold text-sm">🏅 Achievement untuk Semua Partisipan</span>
                    </label>
                    {participantAch.enabled && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex gap-4 items-center">
                          <label className="w-16 h-16 rounded-xl border-2 border-dashed border-border hover:border-amber-500/50 cursor-pointer flex items-center justify-center overflow-hidden shrink-0 transition-colors">
                            {participantAchPreview ? <img src={participantAchPreview} className="w-full h-full object-cover" alt="preview" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
                            <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleAchImageSelect(e.target.files[0], "participant")} />
                          </label>
                          <div className="flex-1 space-y-2">
                            <Input placeholder="Nama Achievement" value={participantAch.name} onChange={e => setParticipantAch(p => ({ ...p, name: e.target.value }))} className="bg-background/50" />
                            <Input placeholder="Deskripsi singkat..." value={participantAch.description} onChange={e => setParticipantAch(p => ({ ...p, description: e.target.value }))} className="bg-background/50" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Achievement Top Kontributor */}
                  <div className="space-y-3 border border-border/50 rounded-lg p-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={topContribAch.enabled} onChange={e => setTopContribAch(p => ({ ...p, enabled: e.target.checked }))} className="w-4 h-4 accent-amber-500" />
                      <span className="font-semibold text-sm">🥇 Achievement untuk Top Kontributor (#1)</span>
                    </label>
                    {topContribAch.enabled && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex gap-4 items-center">
                          <label className="w-16 h-16 rounded-xl border-2 border-dashed border-border hover:border-amber-500/50 cursor-pointer flex items-center justify-center overflow-hidden shrink-0 transition-colors">
                            {topContribAchPreview ? <img src={topContribAchPreview} className="w-full h-full object-cover" alt="preview" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
                            <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleAchImageSelect(e.target.files[0], "topContrib")} />
                          </label>
                          <div className="flex-1 space-y-2">
                            <Input placeholder="Nama Achievement" value={topContribAch.name} onChange={e => setTopContribAch(p => ({ ...p, name: e.target.value }))} className="bg-background/50" />
                            <Input placeholder="Deskripsi singkat..." value={topContribAch.description} onChange={e => setTopContribAch(p => ({ ...p, description: e.target.value }))} className="bg-background/50" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full h-12 text-md mt-8 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
              {loading ? "Mengirim Usulan..." : "Kirim Usulan Goal"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
