"use client";

import React, { useState } from "react";
import {
  Wrench,
  Warehouse,
  Coins,
  Truck,
  ArrowRight,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import HireMechanicModal from "./HireMechanicModal";
import { MechanicSpecialty } from "@/lib/constants/mechanics";
import { Modal } from "@/components/ui/Modal";

interface GarageClientProps {
  garage: any;
}

export default function GarageClient({ garage }: GarageClientProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] =
    useState<MechanicSpecialty>("umum");

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [downgradeModalOpen, setDowngradeModalOpen] = useState(false);

  const [loadingAction, setLoadingAction] = useState(false);
  const [firing, setFiring] = useState<MechanicSpecialty | null>(null);

  const mechanics = garage.mechanics || {};

  const handleUpgrade = async () => {
    setLoadingAction(true);
    try {
      const res = await fetch("/api/garage/upgrade", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Gagal meng-upgrade garasi");

      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingAction(false);
      setUpgradeModalOpen(false);
    }
  };

  const handleDowngrade = async () => {
    setLoadingAction(true);
    try {
      const res = await fetch("/api/garage/downgrade", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Gagal men-downgrade garasi");

      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingAction(false);
      setDowngradeModalOpen(false);
    }
  };

  const handleFire = async (specialty: MechanicSpecialty) => {
    if (
      !confirm(
        `Apakah Anda yakin ingin memecat Mekanik ${specialty}? Uang sewa yang sudah dibayar minggu ini tidak akan dikembalikan.`,
      )
    )
      return;

    setFiring(specialty);
    try {
      const res = await fetch("/api/garage/mechanics/fire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specialty }),
      });
      if (!res.ok) throw new Error("Gagal memecat mekanik");

      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setFiring(null);
    }
  };

  const specialties: {
    key: MechanicSpecialty;
    title: string;
    color: string;
    desc: string;
  }[] = [
    {
      key: "umum",
      title: "Mekanik Umum",
      color: "text-emerald-500",
      desc: "Mempercepat durasi perbaikan Rem & Body.",
    },
    {
      key: "ban",
      title: "Spesialis Ban",
      color: "text-accent-sky",
      desc: "Mempercepat durasi penggantian Ban.",
    },
    {
      key: "mesin",
      title: "Spesialis Mesin",
      color: "text-amber-500",
      desc: "Mempercepat servis Mesin & Transmisi.",
    },
  ];

  const formatDaysLeft = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? `${diffDays} hari lagi` : "Kedaluwarsa";
  };

  const canDowngrade =
    garage.fleetSlot > 1 && garage.fleetSlot > garage.fleetSlotUsed;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-10 pb-10 animate-in fade-in duration-700">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Warehouse size={24} />
            </div>
            <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase">
              Garage Dashboard
            </h1>
          </div>
          <p className="text-foreground/40 font-bold uppercase text-[10px] tracking-[0.2em] ml-11">
            Nismara Transport Hub • Asset & Crew Management
          </p>
        </div>

        <Link
          href="/dashboard/garage/fleet"
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-card border border-border hover:bg-muted text-sm font-bold uppercase tracking-wider transition-all"
        >
          <Truck size={18} /> Kelola Kendaraan <ArrowRight size={16} />
        </Link>
      </div>

      {/* OVERVIEW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border/50 rounded-2xl p-6 relative overflow-hidden shadow-lg group hover:border-primary/50 transition-colors">
          <div className="absolute right-0 top-0 p-6 opacity-10 rotate-12 group-hover:rotate-0 group-hover:scale-110 transition-transform duration-500">
            <Warehouse size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-1">
              Kapasitas Garasi
            </p>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-black">
                {garage.fleetSlotUsed}
              </span>
              <span className="text-muted-foreground font-bold">
                / {garage.fleetSlot} Slot
              </span>
            </div>

            <div className="flex flex-col mt-3 pt-3 border-t border-border/50 space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">
                  Garasi Level {garage.fleetSlotLevel}
                </p>
                <div className="flex gap-2">
                  {canDowngrade && (
                    <button
                      onClick={() => setDowngradeModalOpen(true)}
                      className="text-[10px] font-bold uppercase tracking-widest bg-red-500/10 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                    >
                      Downgrade
                    </button>
                  )}
                  <button
                    onClick={() => setUpgradeModalOpen(true)}
                    className="text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
                  >
                    Upgrade
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-6 relative overflow-hidden shadow-lg group hover:border-primary/50 transition-colors">
          <div className="absolute right-0 top-0 p-6 opacity-10 rotate-12 group-hover:rotate-0 group-hover:scale-110 transition-transform duration-500">
            <Coins size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-1">
              Biaya Operasional (Bulan)
            </p>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-black text-red-400">
                {garage.operational_cost.toLocaleString("id-ID")}
              </span>
              <span className="text-muted-foreground font-bold">NC</span>
            </div>
            {garage.next_payment_date ? (
              <p className="text-[10px] text-muted-foreground uppercase font-medium flex items-center gap-1">
                <AlertTriangle size={10} className="text-amber-500" />
                Jatuh Tempo:{" "}
                {new Date(garage.next_payment_date).toLocaleDateString("id-ID")}
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground uppercase font-medium">
                Tidak ada tagihan
              </p>
            )}
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-6 relative overflow-hidden shadow-lg group hover:border-primary/50 transition-colors">
          <div className="absolute right-0 top-0 p-6 opacity-10 rotate-12 group-hover:rotate-0 group-hover:scale-110 transition-transform duration-500">
            <AlertTriangle size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <AlertTriangle size={12} className="text-amber-500" />
              WIP Fuel Tank
            </p>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-black text-accent-sky">100</span>
              <span className="text-muted-foreground font-bold">
                / 1.000 Liter
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase font-medium">
              Fitur pengisian bensin segera hadir
            </p>
          </div>
        </div>
      </div>

      {/* MECHANICS SECTION */}
      <div>
        <h2 className="text-2xl font-black uppercase tracking-widest mb-6 flex items-center gap-3">
          <Wrench size={24} className="text-primary" /> Crew Mekanik
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {specialties.map((sp) => {
            const mechanic = mechanics[sp.key];
            const isHired = mechanic && mechanic.name;

            return (
              <div
                key={sp.key}
                className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-lg flex flex-col h-full hover:border-primary/30 transition-colors"
              >
                <div
                  className={`p-4 border-b border-border/50 bg-muted/20 flex justify-between items-center ${isHired ? "" : "grayscale opacity-60"}`}
                >
                  <h3
                    className={`font-black uppercase tracking-wider text-sm ${sp.color}`}
                  >
                    {sp.title}
                  </h3>
                  {isHired && (
                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[10px] font-bold uppercase tracking-widest">
                      Aktif
                    </span>
                  )}
                </div>

                <div className="p-6 flex-1 flex flex-col justify-center">
                  {isHired ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center border border-border">
                          <Wrench size={20} className="text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-lg font-black">{mechanic.name}</p>
                          <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">
                            Level {mechanic.level}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <div className="bg-background/50 p-3 rounded-lg border border-border/50 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">
                            Boost
                          </p>
                          <p className="text-emerald-500 font-black">
                            +{mechanic.boostPercentage}%
                          </p>
                        </div>
                        <div className="bg-background/50 p-3 rounded-lg border border-border/50 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">
                            Gaji
                          </p>
                          <p className="text-red-400 font-black">
                            {mechanic.salary >= 1000
                              ? `${mechanic.salary / 1000}k`
                              : mechanic.salary}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 text-center border-t border-border/50 mt-4 pt-4">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-3">
                          Perpanjangan berikutnya:
                          <br />
                          <strong className="text-foreground mt-1 block">
                            {formatDaysLeft(mechanic.extendAt)}
                          </strong>
                        </p>

                        <button
                          onClick={() => handleFire(sp.key)}
                          disabled={firing === sp.key}
                          className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors w-full disabled:opacity-50"
                        >
                          {firing === sp.key ? "Memproses..." : "Pecat Mekanik"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Wrench
                          size={24}
                          className="text-muted-foreground/30"
                        />
                      </div>
                      <p className="text-sm font-bold text-muted-foreground mb-2">
                        Slot mekanik kosong.
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed mb-6 px-4">
                        {sp.desc}
                      </p>
                      <button
                        onClick={() => {
                          setSelectedSpecialty(sp.key);
                          setModalOpen(true);
                        }}
                        className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5"
                      >
                        Hire Mekanik
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <HireMechanicModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        specialty={selectedSpecialty}
      />

      {/* Upgrade Modal */}
      <Modal
        isOpen={upgradeModalOpen}
        onClose={() => !loadingAction && setUpgradeModalOpen(false)}
        title="Upgrade Slot Garasi"
      >
        <div className="space-y-6">
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex gap-3 text-primary">
            <Warehouse className="shrink-0" />
            <div>
              <p className="font-bold text-sm mb-1">Konfirmasi Upgrade</p>
              <p className="text-xs opacity-90 leading-relaxed">
                Anda akan menambahkan kapasitas armada menjadi{" "}
                <strong>{garage.fleetSlot + 1} Slot</strong>. Upgrade ini
                membutuhkan biaya awal sebesar <strong>1.000 NC</strong>.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">Kapasitas Baru</span>
              <span className="font-bold">{garage.fleetSlot + 1} Slot</span>
            </div>
            <div className="flex justify-between text-sm items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">
                Tagihan Operasional (Bulan)
              </span>
              <span className="font-bold text-red-400">
                {((garage.fleetSlot + 1) * 250).toLocaleString("id-ID")} NC
              </span>
            </div>
            <div className="flex justify-between text-sm items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">Biaya Upgrade</span>
              <span className="font-black text-lg text-primary">1.000 NC</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setUpgradeModalOpen(false)}
              className="flex-1 py-3 rounded-xl font-bold text-sm bg-card border border-border hover:bg-muted transition-colors uppercase tracking-wider"
              disabled={loadingAction}
            >
              Batal
            </button>
            <button
              onClick={handleUpgrade}
              className="flex-1 py-3 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all uppercase tracking-wider shadow-lg hover:shadow-primary/25 disabled:opacity-50 flex justify-center items-center gap-2"
              disabled={loadingAction}
            >
              {loadingAction ? "Memproses..." : "Bayar & Upgrade"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Downgrade Modal */}
      <Modal
        isOpen={downgradeModalOpen}
        onClose={() => !loadingAction && setDowngradeModalOpen(false)}
        title="Downgrade Slot Garasi"
      >
        <div className="space-y-6">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 text-red-500">
            <AlertCircle className="shrink-0" />
            <div>
              <p className="font-bold text-sm mb-1">Konfirmasi Downgrade</p>
              <p className="text-xs opacity-90 leading-relaxed">
                Anda akan mengurangi kapasitas armada dari{" "}
                <strong>{garage.fleetSlot} Slot</strong> menjadi{" "}
                <strong>{garage.fleetSlot - 1} Slot</strong>. Tindakan ini tidak
                memakan biaya, namun <strong>1.000 NC</strong> dari saat Anda
                upgrade sebelumnya <strong>tidak akan direfund</strong>.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">Kapasitas Baru</span>
              <span className="font-bold">{garage.fleetSlot - 1} Slot</span>
            </div>
            <div className="flex justify-between text-sm items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">
                Tagihan Operasional (Bulan)
              </span>
              <span className="font-bold text-emerald-500">
                {(garage.fleetSlot - 1 === 1
                  ? 0
                  : (garage.fleetSlot - 1) * 250
                ).toLocaleString("id-ID")}{" "}
                NC
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setDowngradeModalOpen(false)}
              className="flex-1 py-3 rounded-xl font-bold text-sm bg-card border border-border hover:bg-muted transition-colors uppercase tracking-wider"
              disabled={loadingAction}
            >
              Batal
            </button>
            <button
              onClick={handleDowngrade}
              className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-500 text-white hover:bg-red-600 transition-all uppercase tracking-wider shadow-lg hover:shadow-red-500/25 disabled:opacity-50 flex justify-center items-center gap-2"
              disabled={loadingAction}
            >
              {loadingAction ? "Memproses..." : "Lanjutkan Downgrade"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
