"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Trophy,
  Gift,
  Coins,
  Fuel,
  Shield,
  Zap,
  Wrench,
  Truck,
  Crown,
  Download,
  Package,
  Star,
  Save,
  Layers,
  Sparkles,
} from "lucide-react";
import { showAlert, showConfirm } from "@/lib/dialog";

interface RewardItem {
  type: string;
  title: string;
  description?: string;
  amount?: number;
  voucherCategory?: string;
  voucherDiscountType?: string;
  voucherDiscountValue?: number;
  voucherDurationHours?: number;
  badgeId?: string;
  imageUrl?: string;
}

interface SeasonLevel {
  level: number;
  xpRequired: number;
  cumulativeXp: number;
  freeRewards: RewardItem[];
  premiumRewards: RewardItem[];
}

interface TemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  templateId?: string | null;
}

export default function TemplateEditorModal({
  isOpen,
  onClose,
  onSuccess,
  templateId,
}: TemplateEditorModalProps) {
  const [template, setTemplate] = useState<any>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [levels, setLevels] = useState<SeasonLevel[]>([]);
  const [selectedLevelNum, setSelectedLevelNum] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reward Add Modal State
  const [editingTrack, setEditingTrack] = useState<"free" | "premium" | null>(null);
  const [rewardForm, setRewardForm] = useState<RewardItem>({
    type: "NC",
    title: "1.000 Nismara Coin",
    description: "",
    amount: 1000,
    voucherCategory: "NC_BOOSTER",
    voucherDiscountType: "percentage",
    voucherDiscountValue: 25,
    voucherDurationHours: 2,
    badgeId: "",
  });

  useEffect(() => {
    if (isOpen && templateId) {
      loadTemplate();
    }
  }, [isOpen, templateId]);

  const loadTemplate = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/manage/season-pass/templates/${templateId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat data template");

      setTemplate(data.template);
      setName(data.template.name || "");
      setDescription(data.template.description || "");
      setLevels(data.template.levels || []);
      setSelectedLevelNum(1);
    } catch (err: any) {
      await showAlert(`Gagal: ${err.message}`);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentLevelConfig = levels.find((l) => l.level === selectedLevelNum) || levels[0];

  const handleSaveTemplate = async () => {
    if (!name.trim()) {
      await showAlert("Nama template wajib diisi!");
      return;
    }

    setIsSaving(true);
    try {
      // Recalculate cumulative XP
      let cumXp = 0;
      const updatedLevels = levels.map((lvl) => {
        cumXp += Number(lvl.xpRequired || 0);
        return {
          ...lvl,
          cumulativeXp: cumXp,
        };
      });

      const res = await fetch(`/api/manage/season-pass/templates/${templateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          levels: updatedLevels,
          totalXp: cumXp,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan template");

      await showAlert("Template berhasil diperbarui!");
      onSuccess();
      onClose();
    } catch (err: any) {
      await showAlert(`Gagal: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateLevelXp = (levelNum: number, newXp: number) => {
    setLevels((prev) =>
      prev.map((l) => (l.level === levelNum ? { ...l, xpRequired: Number(newXp) } : l))
    );
  };

  const handleAddReward = (track: "free" | "premium") => {
    if (!rewardForm.title.trim()) {
      showAlert("Judul hadiah wajib diisi!");
      return;
    }

    setLevels((prev) =>
      prev.map((lvl) => {
        if (lvl.level !== selectedLevelNum) return lvl;
        const targetList = track === "free" ? [...lvl.freeRewards] : [...lvl.premiumRewards];
        targetList.push({ ...rewardForm });
        return {
          ...lvl,
          [track === "free" ? "freeRewards" : "premiumRewards"]: targetList,
        };
      })
    );

    setEditingTrack(null);
  };

  const handleRemoveReward = (track: "free" | "premium", index: number) => {
    setLevels((prev) =>
      prev.map((lvl) => {
        if (lvl.level !== selectedLevelNum) return lvl;
        const targetList = track === "free" ? [...lvl.freeRewards] : [...lvl.premiumRewards];
        targetList.splice(index, 1);
        return {
          ...lvl,
          [track === "free" ? "freeRewards" : "premiumRewards"]: targetList,
        };
      })
    );
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case "NC":
        return <Coins size={14} className="text-amber-400" />;
      case "FUEL":
        return <Fuel size={14} className="text-cyan-400" />;
      case "SAFEBOX_TICKET":
        return <Shield size={14} className="text-purple-400" />;
      case "VOUCHER":
        return <Zap size={14} className="text-amber-400" />;
      case "NPLUS_TRIAL":
        return <Crown size={14} className="text-emerald-400" />;
      case "BADGE":
        return <Trophy size={14} className="text-amber-400" />;
      case "MOD_LIVERY":
      case "DOWNLOADABLE":
        return <Download size={14} className="text-yellow-400" />;
      case "PHYSICAL_MERCH":
        return <Package size={14} className="text-purple-400" />;
      default:
        return <Gift size={14} className="text-blue-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-card border border-border rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/80 bg-card/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground uppercase tracking-tight">
                Editor Template Hadiah Level (1–30)
              </h2>
              <p className="text-xs text-muted-foreground">
                Kustomisasi hadiah Free Track & Premium Track untuk setiap level musim.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Content */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-16 space-y-3">
            <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Memuat Data Level Template...
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Sidebar Level Navigator */}
            <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-border p-4 bg-black/20 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto shrink-0">
              <div className="hidden md:block pb-2 mb-2 border-b border-border/60">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Pilih Level (30 Level)
                </span>
              </div>
              <div className="flex md:grid md:grid-cols-3 gap-1.5 w-full">
                {levels.map((lvl) => {
                  const isSelected = lvl.level === selectedLevelNum;
                  const totalRewards = (lvl.freeRewards?.length || 0) + (lvl.premiumRewards?.length || 0);
                  return (
                    <button
                      key={lvl.level}
                      onClick={() => setSelectedLevelNum(lvl.level)}
                      className={`px-3 py-2 rounded-xl text-xs font-black transition flex flex-col items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20 font-black scale-105"
                          : "bg-card/70 hover:bg-card border border-border/50 text-foreground"
                      }`}
                    >
                      <span>Lvl {lvl.level}</span>
                      <span className={`text-[9px] ${isSelected ? "text-black/80" : "text-muted-foreground"}`}>
                        {totalRewards} Item
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Level Detail & Reward Editor */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {/* Template Meta Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-border/60">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                    Nama Template
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-amber-500/50"
                    placeholder="Contoh: Template Musim Standar NC & Fuel"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                    Deskripsi Singkat
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-border text-foreground text-xs focus:outline-none focus:border-amber-500/50"
                    placeholder="Keterangan alokasi hadiah..."
                  />
                </div>
              </div>

              {/* Selected Level Header & XP Config */}
              {currentLevelConfig && (
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-black text-xs font-black uppercase tracking-wider">
                        Level {currentLevelConfig.level}
                      </span>
                      <h3 className="text-base font-black text-foreground uppercase tracking-tight">
                        Konfigurasi Hadiah Level {currentLevelConfig.level}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground shrink-0">
                      XP Dibutuhkan:
                    </label>
                    <input
                      type="number"
                      value={currentLevelConfig.xpRequired}
                      onChange={(e) => handleUpdateLevelXp(currentLevelConfig.level, Number(e.target.value))}
                      className="w-28 px-3 py-1.5 rounded-xl bg-black/40 border border-border text-foreground text-xs font-bold text-center focus:outline-none focus:border-amber-500/50"
                    />
                    <span className="text-xs font-bold text-muted-foreground">XP</span>
                  </div>
                </div>
              )}

              {/* Two Column Track Rewards */}
              {currentLevelConfig && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Free Track Rewards */}
                  <div className="p-5 rounded-2xl bg-black/20 border border-border/80 space-y-4">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                      <div className="flex items-center gap-2">
                        <Gift size={16} className="text-muted-foreground" />
                        <span className="text-xs font-black uppercase tracking-wider text-foreground">
                          Free Track (Hadiah Gratis)
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setEditingTrack("free");
                          setRewardForm({
                            type: "NC",
                            title: "1.000 Nismara Coin",
                            amount: 1000,
                            description: "",
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1"
                      >
                        <Plus size={13} /> Tambah Item
                      </button>
                    </div>

                    <div className="space-y-2">
                      {currentLevelConfig.freeRewards?.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-4 text-center">
                          Tidak ada hadiah di track gratis untuk level ini.
                        </p>
                      ) : (
                        currentLevelConfig.freeRewards?.map((r, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-card border border-border/60 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="p-1.5 rounded-lg bg-black/30">
                                {getRewardIcon(r.type)}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-foreground">{r.title}</p>
                                <p className="text-[10px] text-muted-foreground uppercase">
                                  {r.type} {r.amount ? `• ${r.amount.toLocaleString("id-ID")}` : ""}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveReward("free", idx)}
                              className="p-1.5 text-muted-foreground hover:text-red-400 transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Premium Track Rewards */}
                  <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-4">
                    <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                      <div className="flex items-center gap-2">
                        <Crown size={16} className="text-amber-400" />
                        <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                          Premium Track (Pass Eksklusif)
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setEditingTrack("premium");
                          setRewardForm({
                            type: "NC",
                            title: "2.500 Nismara Coin",
                            amount: 2500,
                            description: "",
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1"
                      >
                        <Plus size={13} /> Tambah Item
                      </button>
                    </div>

                    <div className="space-y-2">
                      {currentLevelConfig.premiumRewards?.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-4 text-center">
                          Tidak ada hadiah di track premium untuk level ini.
                        </p>
                      ) : (
                        currentLevelConfig.premiumRewards?.map((r, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-card border border-amber-500/20 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="p-1.5 rounded-lg bg-amber-500/10">
                                {getRewardIcon(r.type)}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-foreground">{r.title}</p>
                                <p className="text-[10px] text-muted-foreground uppercase">
                                  {r.type} {r.amount ? `• ${r.amount.toLocaleString("id-ID")}` : ""}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveReward("premium", idx)}
                              className="p-1.5 text-muted-foreground hover:text-red-400 transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Reward Sub-Modal Form */}
        {editingTrack && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-20 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h4 className="text-sm font-black uppercase tracking-wider text-foreground">
                  Tambah Hadiah ({editingTrack === "free" ? "Free Track" : "Premium Track"})
                </h4>
                <button
                  onClick={() => setEditingTrack(null)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Tipe Hadiah
                  </label>
                  <select
                    value={rewardForm.type}
                    onChange={(e) => {
                      const t = e.target.value;
                      let defaultTitle = "1.000 Nismara Coin";
                      let defaultAmt = 1000;
                      if (t === "FUEL") {
                        defaultTitle = "500 Liter Fuel Garasi";
                        defaultAmt = 500;
                      } else if (t === "SAFEBOX_TICKET") {
                        defaultTitle = "1x Tiket Hukuman Safebox";
                        defaultAmt = 1;
                      } else if (t === "VOUCHER") {
                        defaultTitle = "Voucher Booster +25% NC (2 Jam)";
                        defaultAmt = 0;
                      } else if (t === "NPLUS_TRIAL") {
                        defaultTitle = "3 Hari Nismara+ Trial";
                        defaultAmt = 3;
                      } else if (t === "BADGE") {
                        defaultTitle = "Lencana Eksklusif Season";
                        defaultAmt = 0;
                      } else if (t === "MOD_LIVERY") {
                        defaultTitle = "Mod Livery Eksklusif";
                        defaultAmt = 0;
                      }
                      setRewardForm({ ...rewardForm, type: t, title: defaultTitle, amount: defaultAmt });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-border text-foreground text-xs font-bold"
                  >
                    <option value="NC">Nismara Coin (NC)</option>
                    <option value="FUEL">Fuel Garasi (Liter)</option>
                    <option value="SAFEBOX_TICKET">Tiket Bebas Hukuman (Safebox)</option>
                    <option value="VOUCHER">Kupon / Voucher Diskon / Booster</option>
                    <option value="NPLUS_TRIAL">Trial Nismara+ Premium</option>
                    <option value="BADGE">Lencana / Badge Profil</option>
                    <option value="MOD_LIVERY">Mod Livery Truk Eksklusif</option>
                    <option value="PHYSICAL_MERCH">Merchandise Fisik (Mug, Kaos)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Nama / Judul Hadiah
                  </label>
                  <input
                    type="text"
                    value={rewardForm.title}
                    onChange={(e) => setRewardForm({ ...rewardForm, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-border text-foreground text-xs font-bold"
                    placeholder="Contoh: 2.500 Nismara Coin"
                  />
                </div>

                {(rewardForm.type === "NC" || rewardForm.type === "FUEL" || rewardForm.type === "SAFEBOX_TICKET" || rewardForm.type === "NPLUS_TRIAL") && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Jumlah (Nominal / Liter / Hari)
                    </label>
                    <input
                      type="number"
                      value={rewardForm.amount || 0}
                      onChange={(e) => setRewardForm({ ...rewardForm, amount: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-border text-foreground text-xs font-bold"
                    />
                  </div>
                )}

                {rewardForm.type === "VOUCHER" && (
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                        Kategori Voucher
                      </label>
                      <select
                        value={rewardForm.voucherCategory || "NC_BOOSTER"}
                        onChange={(e: any) => setRewardForm({ ...rewardForm, voucherCategory: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-border text-foreground text-xs"
                      >
                        <option value="NC_BOOSTER">Booster NC (+25% / +50%)</option>
                        <option value="FLEET_MAINTENANCE">Diskon Servis Truk</option>
                        <option value="MARKET_MOD">Diskon Pembelian Mod</option>
                        <option value="GARAGE_UPGRADE">Diskon Upgrade Garasi</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                          Nilai Diskon (%)
                        </label>
                        <input
                          type="number"
                          value={rewardForm.voucherDiscountValue || 25}
                          onChange={(e) => setRewardForm({ ...rewardForm, voucherDiscountValue: Number(e.target.value) })}
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-border text-foreground text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                          Durasi (Jam)
                        </label>
                        <input
                          type="number"
                          value={rewardForm.voucherDurationHours || 2}
                          onChange={(e) => setRewardForm({ ...rewardForm, voucherDurationHours: Number(e.target.value) })}
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-border text-foreground text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {rewardForm.type === "BADGE" && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      ID Lencana (Badge ID)
                    </label>
                    <input
                      type="text"
                      value={rewardForm.badgeId || ""}
                      onChange={(e) => setRewardForm({ ...rewardForm, badgeId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-border text-foreground text-xs"
                      placeholder="Contoh: s1_pioneer, s1_master"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTrack(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-white/5"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleAddReward(editingTrack)}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider transition shadow-lg shadow-amber-500/20"
                >
                  Tambahkan ke Level
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-border/80 bg-card/60">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-border hover:bg-white/5 text-foreground text-xs font-bold uppercase tracking-wider transition"
          >
            Tutup
          </button>
          <button
            onClick={handleSaveTemplate}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black text-xs font-black uppercase tracking-wider transition shadow-lg shadow-amber-500/25 flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={16} /> {isSaving ? "Menyimpan Perubahan..." : "Simpan Template"}
          </button>
        </div>
      </div>
    </div>
  );
}
