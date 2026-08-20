"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showAlert } from "@/lib/dialog";
import { editGoalDetails } from "./actions";
import { Edit, Trophy } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useRouter } from "next/navigation";

export default function EditGoalModal({ goal }: { goal: any }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const [title, setTitle] = useState(goal.title);
  const [slug, setSlug] = useState(goal.slug);
  const [description, setDescription] = useState(goal.description);
  const [type, setType] = useState<"nc" | "km">(goal.type);
  const [targetAmount, setTargetAmount] = useState(goal.targetAmount.toString());
  const [deadline, setDeadline] = useState(new Date(goal.deadline).toISOString().slice(0, 16));
  const [rewardType, setRewardType] = useState<"currency-boost" | "coupon" | "special-contract">(goal.rewardType);
  const [multiplier, setMultiplier] = useState(goal.rewardDetails?.multiplier?.toString() || "2");
  const [couponAmount, setCouponAmount] = useState(goal.rewardDetails?.amount?.toString() || "10000");
  const [couponType, setCouponType] = useState(goal.rewardDetails?.type || "NC");
  const [companyName, setCompanyName] = useState(goal.rewardDetails?.companyName || "");
  const [rewardDuration, setRewardDuration] = useState(goal.rewardDetails?.duration?.toString() || "3");

  const [achParticipant, setAchParticipant] = useState(goal.achievementRewards?.participant || { enabled: false, name: "", description: "" });
  const [achTopContrib, setAchTopContrib] = useState(goal.achievementRewards?.topContributor || { enabled: false, name: "", description: "" });

  // Sync state when open
  useEffect(() => {
    if (open) {
      setTitle(goal.title);
      setSlug(goal.slug);
      setDescription(goal.description);
      setType(goal.type);
      setTargetAmount(goal.targetAmount.toString());
      setDeadline(new Date(goal.deadline).toISOString().slice(0, 16));
      setRewardType(goal.rewardType);
      setMultiplier(goal.rewardDetails?.multiplier?.toString() || "2");
      setCouponAmount(goal.rewardDetails?.amount?.toString() || "10000");
      setCouponType(goal.rewardDetails?.type || "NC");
      setCompanyName(goal.rewardDetails?.companyName || "");
      setRewardDuration(goal.rewardDetails?.duration?.toString() || "3");
      setAchParticipant(goal.achievementRewards?.participant || { enabled: false, name: "", description: "" });
      setAchTopContrib(goal.achievementRewards?.topContributor || { enabled: false, name: "", description: "" });
    }
  }, [open, goal]);

  async function handleSubmit() {
    setLoading(true);
    try {
      const payload = {
        title,
        slug,
        description,
        type,
        targetAmount: Number(targetAmount),
        deadline: new Date(deadline.includes('T') ? `${deadline}+07:00` : deadline),
        rewardType,
        rewardDetails: rewardType === "currency-boost" 
          ? { multiplier: Number(multiplier), duration: Number(rewardDuration) } 
          : rewardType === "coupon"
          ? { amount: Number(couponAmount), type: couponType, duration: Number(rewardDuration) }
          : { companyName, duration: Number(rewardDuration) },
        achievementRewards: {
          participant: achParticipant,
          topContributor: achTopContrib
        }
      };

      const res = await editGoalDetails(goal._id, payload);
      if (res.success) {
        await showAlert("Perubahan berhasil disimpan & disiarkan ke kreator.", "Berhasil");
        setOpen(false);
        router.refresh();
      } else {
        await showAlert(res.error || "Gagal menyimpan perubahan.", "Gagal");
      }
    } catch (e: any) {
      await showAlert(e.message, "Gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 hover:text-blue-600 border border-blue-500/30"
      >
        <Edit className="w-4 h-4 mr-2" />
        Edit
      </Button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={`Edit Goal: ${goal.title}`} maxWidth="max-w-2xl">
        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="space-y-2">
            <Label>Judul Goal</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Slug (URL)</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} className="font-mono" />
          </div>

          <div className="space-y-2">
            <Label>Deskripsi</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipe Target</Label>
              <Select value={type} onValueChange={(v) => v && setType(v as "nc" | "km")}>
                <SelectTrigger>
                  <SelectValue>{type === "nc" ? "Nismara Coin" : "Kilometer"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nc">Nismara Coin (Donasi)</SelectItem>
                  <SelectItem value="km">Jarak Tempuh (Kilometer)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Angka</Label>
              <Input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tenggat Waktu</Label>
            <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Tipe Hadiah</Label>
            <Select value={rewardType} onValueChange={(v) => v && setRewardType(v as "currency-boost" | "coupon" | "special-contract")}>
              <SelectTrigger>
                <SelectValue>{rewardType === "currency-boost" ? "Currency Boost" : rewardType === "coupon" ? "Kupon" : "Special Contract"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="currency-boost">Currency Boost Event</SelectItem>
                <SelectItem value="coupon">Kupon Massal</SelectItem>
                <SelectItem value="special-contract">Special Contract</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {rewardType === "currency-boost" ? (
            <div className="space-y-2">
              <Label>Multiplier Boost (x)</Label>
              <Input type="number" step="0.1" min="0.1" value={multiplier} onChange={(e) => setMultiplier(e.target.value)} />
            </div>
          ) : rewardType === "coupon" ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jumlah Hadiah</Label>
                <Input type="number" value={couponAmount} onChange={(e) => setCouponAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tipe Kupon</Label>
                <Select value={couponType} onValueChange={(v) => v && setCouponType(v)}>
                  <SelectTrigger>
                    <SelectValue>{couponType}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NC">Nismara Coin (NC)</SelectItem>
                    <SelectItem value="Penalty Remover">Penghapus Penalti (Poin)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Nama Perusahaan (Special Contract)</Label>
              <Input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-border/50">
            <Label>Durasi Aktif Hadiah (Hari)</Label>
            <p className="text-xs text-muted-foreground mb-1">Berapa lama event/kupon ini akan aktif jika target tercapai?</p>
            <Input type="number" min="1" value={rewardDuration} onChange={(e) => setRewardDuration(e.target.value)} />
          </div>

          <div className="space-y-4 pt-4 border-t border-border/50">
            <h4 className="flex items-center gap-2 font-bold text-amber-500"><Trophy className="w-4 h-4"/> Hadiah Achievement</h4>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={achParticipant.enabled} onChange={e => setAchParticipant({ ...achParticipant, enabled: e.target.checked })} />
                <span className="font-semibold text-sm">Achievement Partisipan</span>
              </label>
              {achParticipant.enabled && (
                <div className="pl-6 space-y-2">
                  <Input placeholder="Nama Achievement" value={achParticipant.name} onChange={e => setAchParticipant({ ...achParticipant, name: e.target.value })} />
                  <Input placeholder="Deskripsi" value={achParticipant.description} onChange={e => setAchParticipant({ ...achParticipant, description: e.target.value })} />
                  {achParticipant.imageUrl && <img src={achParticipant.imageUrl} alt="Partisipan" className="h-16 w-16 object-cover rounded" />}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={achTopContrib.enabled} onChange={e => setAchTopContrib({ ...achTopContrib, enabled: e.target.checked })} />
                <span className="font-semibold text-sm">Achievement Top Kontributor</span>
              </label>
              {achTopContrib.enabled && (
                <div className="pl-6 space-y-2">
                  <Input placeholder="Nama Achievement" value={achTopContrib.name} onChange={e => setAchTopContrib({ ...achTopContrib, name: e.target.value })} />
                  <Input placeholder="Deskripsi" value={achTopContrib.description} onChange={e => setAchTopContrib({ ...achTopContrib, description: e.target.value })} />
                  {achTopContrib.imageUrl && <img src={achTopContrib.imageUrl} alt="Top Contributor" className="h-16 w-16 object-cover rounded" />}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
