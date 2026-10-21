"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { ArrowLeft, Ghost, Sparkles } from "lucide-react";

interface JumpscareModalProps {
  isOpen: boolean;
  imageSrc?: string;
  flashDurationMs?: number;
  onClose: () => void;
}

export default function JumpscareModal({
  isOpen,
  imageSrc = "/images/halloween/jumpscare.webp",
  flashDurationMs = 2800,
  onClose,
}: JumpscareModalProps) {
  const [isJumpscareActive, setIsJumpscareActive] = useState(false);
  const [showEndBlackout, setShowEndBlackout] = useState(false);

  useEffect(() => {
    let blackoutTimer: NodeJS.Timeout | null = null;

    if (isOpen) {
      setIsJumpscareActive(true);
      setShowEndBlackout(false);

      // Jumpscare berlangsung 2.8s:
      // 0.0s - 0.8s: Driver tampil jelas fullscreen
      // 0.8s - 2.4s: Zoom in mendekat agresif ke layar
      // 2.4s - 2.8s: Penuh putih (white-out flash)
      const jumpscareTimer = setTimeout(() => {
        setIsJumpscareActive(false);

        // Langsung transisi ke layar hitam penuh dengan font spooky
        setShowEndBlackout(true);
      }, flashDurationMs);

      return () => {
        clearTimeout(jumpscareTimer);
        if (blackoutTimer) clearTimeout(blackoutTimer);
      };
    } else {
      setIsJumpscareActive(false);
      setShowEndBlackout(false);
    }
  }, [isOpen, flashDurationMs]);

  if (!isOpen) return null;

  return (
    <>
      {/* 1. JUMPSCARE CINEMATIC: DRIVER TAMPIL JELAS -> ZOOM MENDEKAT -> PUTIH PENUH */}
      {isJumpscareActive && (
        <div className="fixed inset-0 z-[200] w-screen h-screen flex items-center justify-center bg-black overflow-hidden select-none">
          {/* Overlay Efek Darah & Distorsi Merah Berkedip */}
          <div className="absolute inset-0 bg-red-950/30 mix-blend-color-dodge pointer-events-none z-10 animate-[strobe-red_0.1s_infinite]" />

          {/* Gambar Driver Jumpscare dengan Animasi Sinematik: Tampil Jelas -> Zoom In Menerjang -> Over-brightening */}
          <div className="relative w-screen h-screen w-full h-full flex items-center justify-center animate-[jumpscare-driver-zoom_2.8s_cubic-bezier(0.2,0.1,0.25,1)_forwards]">
            <Image
              src={imageSrc}
              alt="Halloween Jumpscare Phantom Driver"
              fill
              sizes="100vw"
              priority
              className="object-cover w-full h-full filter contrast-125 brightness-110 drop-shadow-[0_0_100px_rgba(255,255,255,0.9)]"
            />
          </div>

          {/* Flash Putih Penuh di Akhir Benturan Zoom (Detik ke 2.3s - 2.8s) */}
          <div className="absolute inset-0 bg-white pointer-events-none z-30 animate-[flash-whiteout_2.8s_ease-out_forwards]" />
        </div>
      )}

      {/* 2. END SCREEN: LAYAR HITAM PENUH DENGAN TYPOGRAPHY SPOOKY */}
      {showEndBlackout && (
        <div className="fixed inset-0 z-[190] w-screen h-screen bg-black flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-700">
          {/* Ambient Glow Horor di Belakang */}
          <div className="absolute w-[450px] h-[450px] bg-red-600/15 rounded-full blur-[160px] pointer-events-none" />
          <div className="absolute w-[350px] h-[350px] bg-orange-600/10 rounded-full blur-[140px] pointer-events-none" />

          {/* Icon Roh Hantu Melayang Kecil */}
          <div className="relative mb-6">
            <Ghost className="w-12 h-12 text-orange-500 animate-bounce" />
            <div className="absolute -inset-2 bg-orange-500/20 blur-xl rounded-full" />
          </div>

          {/* Judul Spooky: HAPPY HALLOWEEN */}
          <h1 className="relative text-5xl md:text-8xl font-black uppercase tracking-[0.22em] text-transparent bg-clip-text bg-gradient-to-b from-red-500 via-orange-500 to-amber-600 drop-shadow-[0_0_35px_rgba(239,68,68,0.7)] animate-[spooky-flicker_3s_infinite] font-serif">
            HAPPY HALLOWEEN
          </h1>

          {/* Pesan Misterius / Lore Driver */}
          <p className="mt-6 max-w-lg text-sm md:text-base text-zinc-400 font-mono tracking-[0.2em] uppercase leading-relaxed">
            Jadi gimana rasanya disamperin sama roh driver Nismara Transport...
          </p>

          {/* Tombol Back / Kembali ke Website */}
          <div className="mt-12 flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={onClose}
              className="group relative px-9 py-4 rounded-full border border-orange-500/50 bg-zinc-950/80 hover:bg-orange-600 text-orange-200 hover:text-zinc-950 font-mono text-xs uppercase tracking-[0.3em] font-black transition-all duration-300 shadow-2xl shadow-orange-500/20 hover:shadow-orange-500/60 hover:scale-105 active:scale-95 flex items-center gap-3 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span>Kembali ke Website</span>
            </button>
            <span className="text-[11px] font-mono tracking-widest text-zinc-600 uppercase">
              (Silahkan coba lagi kalau mau diparani lagi)
            </span>
          </div>

          {/* Footer Subtitle */}
          <div className="absolute bottom-6 text-[10px] md:text-xs font-mono text-zinc-700 tracking-[0.3em] uppercase">
            Nismara Transport • Halloween Special Edition
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes jumpscare-driver-zoom {
          /* 0% - 28% (0s - 0.8s): Driver tampil jelas dan diam menatap tajam */
          0% {
            transform: scale(1) translate(0, 0);
            filter: brightness(1) contrast(1.1);
            opacity: 1;
          }
          20% {
            transform: scale(1.02) translate(-2px, 1px);
            filter: brightness(1.05) contrast(1.15);
            opacity: 1;
          }
          28% {
            transform: scale(1.05) translate(2px, -2px) rotate(0.5deg);
            filter: brightness(1.1) contrast(1.2);
            opacity: 1;
          }

          /* 28% - 80% (0.8s - 2.25s): Mulai zoom in cepat mendekat ke layar + guncangan liar */
          35% {
            transform: scale(1.25) translate(-8px, 6px) rotate(-1deg);
            filter: brightness(1.25) contrast(1.3);
          }
          45% {
            transform: scale(1.6) translate(10px, -8px) rotate(1.5deg);
            filter: brightness(1.4) contrast(1.4);
          }
          58% {
            transform: scale(2.2) translate(-14px, 10px) rotate(-2deg);
            filter: brightness(1.7) contrast(1.6);
          }
          70% {
            transform: scale(3.2) translate(16px, -12px) rotate(2.5deg);
            filter: brightness(2.2) contrast(1.9);
          }
          80% {
            transform: scale(4.4) translate(-10px, 8px) rotate(-1.5deg);
            filter: brightness(3) contrast(2.2);
          }

          /* 80% - 100% (2.25s - 2.8s): Zoom in ekstrem sampai menabrak layar dan penuh putih */
          90% {
            transform: scale(6) translate(0, 0);
            filter: brightness(5.5);
          }
          100% {
            transform: scale(8) translate(0, 0);
            filter: brightness(10);
            opacity: 1;
          }
        }

        @keyframes flash-whiteout {
          0%,
          75% {
            opacity: 0;
          }
          82% {
            opacity: 0.6;
          }
          90%,
          98% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes strobe-red {
          0%,
          100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.55;
          }
        }

        @keyframes spooky-flicker {
          0%,
          100% {
            opacity: 1;
            filter: drop-shadow(0 0 35px rgba(239, 68, 68, 0.8));
          }
          20% {
            opacity: 0.85;
            filter: drop-shadow(0 0 20px rgba(239, 68, 68, 0.5));
          }
          40% {
            opacity: 0.95;
            filter: drop-shadow(0 0 45px rgba(239, 68, 68, 0.95));
          }
          60% {
            opacity: 0.75;
            filter: drop-shadow(0 0 15px rgba(239, 68, 68, 0.4));
          }
          80% {
            opacity: 1;
            filter: drop-shadow(0 0 40px rgba(239, 68, 68, 0.85));
          }
        }
      `}</style>
    </>
  );
}
