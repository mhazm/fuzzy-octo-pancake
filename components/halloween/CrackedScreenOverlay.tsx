"use client";

import React, { useEffect, useState } from "react";

interface CrackedScreenOverlayProps {
  isCracked: boolean;
  onClear: () => void;
}

export default function CrackedScreenOverlay({
  isCracked,
  onClear,
}: CrackedScreenOverlayProps) {
  const [isRumbling, setIsRumbling] = useState(false);

  useEffect(() => {
    if (isCracked) {
      setIsRumbling(true);
      const timer = setTimeout(() => {
        setIsRumbling(false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isCracked]);

  if (!isCracked) return null;

  return (
    <div
      className={`fixed inset-0 z-[120] pointer-events-none select-none overflow-hidden transition-opacity duration-300 ${
        isRumbling ? "animate-[rumble_0.08s_infinite]" : ""
      }`}
    >
      {/* Retakan Kaca SVG Dinamis dengan Pantulan Cahaya */}
      <svg
        className="w-full h-full object-cover filter drop-shadow-[0_0_12px_rgba(255,255,255,0.7)]"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="crack-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
            <stop offset="30%" stopColor="rgba(200,230,255,0.25)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>

        {/* Lingkaran Pusat Benturan Kaca */}
        <circle cx="500" cy="500" r="80" fill="url(#crack-glow)" />
        <circle cx="500" cy="500" r="25" fill="rgba(255,255,255,0.4)" />

        {/* Poligon Pecahan Kaca Pusat */}
        <polygon points="500,470 530,490 515,535 475,520 480,485" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" />
        <polygon points="530,490 575,475 580,520 545,540 515,535" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />
        <polygon points="475,520 435,550 450,580 495,570 515,535" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />

        {/* Retakan Merambat Utama (Spiderweb Glass Cracks) */}
        {/* Cabang 1: Atas Kiri */}
        <polyline points="500,500 440,410 400,380 320,330 240,240 180,210 90,130 0,80" stroke="rgba(255,255,255,0.9)" strokeWidth="3" fill="none" />
        <polyline points="440,410 380,430 310,400 210,420 100,440 0,420" stroke="rgba(255,255,255,0.7)" strokeWidth="2" fill="none" />
        <polyline points="320,330 280,270 210,180 140,80 80,0" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" fill="none" />

        {/* Cabang 2: Atas Kanan */}
        <polyline points="500,500 560,400 620,340 710,260 780,200 890,120 1000,50" stroke="rgba(255,255,255,0.9)" strokeWidth="3" fill="none" />
        <polyline points="560,400 640,420 730,410 840,430 1000,390" stroke="rgba(255,255,255,0.7)" strokeWidth="2" fill="none" />
        <polyline points="710,260 740,190 790,100 850,0" stroke="rgba(255,255,255,0.75)" strokeWidth="2" fill="none" />

        {/* Cabang 3: Bawah Kanan */}
        <polyline points="500,500 580,590 660,670 750,750 830,830 920,910 1000,980" stroke="rgba(255,255,255,0.9)" strokeWidth="3" fill="none" />
        <polyline points="580,590 670,570 770,610 880,590 1000,620" stroke="rgba(255,255,255,0.75)" strokeWidth="2" fill="none" />
        <polyline points="660,670 690,760 740,860 780,1000" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" fill="none" />

        {/* Cabang 4: Bawah Kiri */}
        <polyline points="500,500 420,590 350,660 260,760 180,840 90,930 0,990" stroke="rgba(255,255,255,0.9)" strokeWidth="3" fill="none" />
        <polyline points="420,590 330,620 230,610 110,650 0,660" stroke="rgba(255,255,255,0.7)" strokeWidth="2" fill="none" />
        <polyline points="350,660 320,770 280,880 230,1000" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" fill="none" />

        {/* Busur Hubungan Antar Retakan (Concentric Stress Rings) */}
        <path d="M 320 330 Q 500 240 710 260" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" fill="none" />
        <path d="M 710 260 Q 820 480 660 670" stroke="rgba(255,255,255,0.55)" strokeWidth="1.8" fill="none" />
        <path d="M 660 670 Q 480 810 350 660" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" fill="none" />
        <path d="M 350 660 Q 180 500 320 330" stroke="rgba(255,255,255,0.55)" strokeWidth="1.8" fill="none" />

        <path d="M 400 380 Q 500 320 620 340" stroke="rgba(255,255,255,0.75)" strokeWidth="2" fill="none" />
        <path d="M 620 340 Q 700 500 580 590" stroke="rgba(255,255,255,0.7)" strokeWidth="2" fill="none" />
        <path d="M 580 590 Q 500 690 420 590" stroke="rgba(255,255,255,0.7)" strokeWidth="2" fill="none" />
        <path d="M 420 590 Q 320 500 400 380" stroke="rgba(255,255,255,0.75)" strokeWidth="2" fill="none" />
      </svg>

      <style jsx global>{`
        @keyframes rumble {
          0% { transform: translate(0, 0) rotate(0deg); }
          20% { transform: translate(-10px, 8px) rotate(-1deg); }
          40% { transform: translate(8px, -10px) rotate(1.2deg); }
          60% { transform: translate(-12px, -6px) rotate(-0.8deg); }
          80% { transform: translate(10px, 10px) rotate(1deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
