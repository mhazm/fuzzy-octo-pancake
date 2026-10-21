"use client";

import React, { useState, useEffect } from "react";
import { halloweenAudio } from "@/lib/halloweenAudio";

interface FloatingGhostProps {
  onTriggerJumpscare: () => void;
  clickThreshold?: number;
}

const GHOST_MESSAGES = [
  "Hihihi! Siapa yang nyolek? 👻",
  "Jangan sentuh aku, nanti nyesel! 🎃",
  "Aku peringatkan ya, jangan ganggu! ⚠️",
  "Satu klik lagi aku parani lho ya... 💀",
];

export default function FloatingGhost({
  onTriggerJumpscare,
  clickThreshold = 5,
}: FloatingGhostProps) {
  const [clicks, setClicks] = useState(0);
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [isWobbling, setIsWobbling] = useState(false);
  const [position, setPosition] = useState({ x: 80, y: 35 }); // percentage

  // Gerakan melayang dinamis sesekali
  useEffect(() => {
    const interval = setInterval(() => {
      setPosition((prev) => {
        // Berpindah halus di area kanan atau kiri layar
        const nextX = Math.min(
          92,
          Math.max(8, prev.x + (Math.random() * 20 - 10)),
        );
        const nextY = Math.min(
          80,
          Math.max(20, prev.y + (Math.random() * 24 - 12)),
        );
        return { x: nextX, y: nextY };
      });
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextClicks = clicks + 1;
    setClicks(nextClicks);

    setIsWobbling(true);
    setTimeout(() => setIsWobbling(false), 500);

    if (nextClicks >= clickThreshold) {
      setBubbleText("BOOOM! 💥");
      halloweenAudio.playIntenseJumpscare();
      onTriggerJumpscare();
      setClicks(0);
      setBubbleText(null);
    } else {
      halloweenAudio.playGhostClick(1 + nextClicks * 0.2);
      const msgIndex = Math.min(nextClicks - 1, GHOST_MESSAGES.length - 1);
      setBubbleText(GHOST_MESSAGES[msgIndex]);
      setTimeout(() => {
        setBubbleText(null);
      }, 2400);
    }
  };

  return (
    <div
      className="fixed z-[95] pointer-events-none transition-all duration-1000 ease-out select-none"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div className="relative group">
        {/* Balon Kata / Dialog Ghost */}
        {bubbleText && (
          <div className="absolute -top-14 left-1/2 -translate-x-1/2 whitespace-nowrap bg-zinc-950/90 text-amber-400 border border-amber-500/40 px-3 py-1.5 rounded-xl shadow-xl shadow-amber-500/10 text-xs font-bold animate-bounce tracking-wide backdrop-blur-md">
            {bubbleText}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-950" />
          </div>
        )}

        {/* Ghost Body (Clickable) */}
        <button
          type="button"
          onClick={handleClick}
          aria-label="Halloween Ghost"
          className={`pointer-events-auto relative cursor-pointer outline-none transition-transform duration-300 hover:scale-125 active:scale-95 ${
            isWobbling
              ? "animate-[wiggle_0.2s_ease-in-out_infinite]"
              : "animate-float-ghost"
          }`}
        >
          {/* Aura Cahaya Mistis */}
          <div className="absolute -inset-2 bg-gradient-to-r from-purple-500/20 via-sky-400/20 to-orange-500/30 rounded-full blur-xl group-hover:blur-2xl transition-all opacity-80 group-hover:opacity-100" />

          {/* SVG Hantu Modern & Halus */}
          <svg
            className="w-14 h-14 md:w-16 md:h-16 drop-shadow-[0_10px_20px_rgba(168,85,247,0.35)]"
            viewBox="0 0 100 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Ghost Shadow */}
            <ellipse cx="50" cy="115" rx="25" ry="5" fill="rgba(0,0,0,0.25)" />

            {/* Ghost Sheet Body */}
            <path
              d="M20 50C20 25 33 10 50 10C67 10 80 25 80 50V90C80 94 76 97 73 95L65 89L58 96C55 99 50 99 47 96L40 89L32 95C29 97 25 94 25 90V50Z"
              fill="url(#ghost-gradient)"
              stroke="rgba(255, 255, 255, 0.4)"
              strokeWidth="1.5"
            />

            {/* Mata Glowing */}
            <ellipse
              cx="40"
              cy="42"
              rx="4.5"
              ry="6"
              fill="#09090b"
              className="group-hover:fill-red-500 transition-colors"
            />
            <ellipse
              cx="60"
              cy="42"
              rx="4.5"
              ry="6"
              fill="#09090b"
              className="group-hover:fill-red-500 transition-colors"
            />
            <circle cx="41.5" cy="40.5" r="1.5" fill="#ffffff" />
            <circle cx="61.5" cy="40.5" r="1.5" fill="#ffffff" />

            {/* Mulut O atau Senyum Spooky */}
            {clicks > 0 ? (
              <ellipse cx="50" cy="56" rx="5" ry="7" fill="#09090b" />
            ) : (
              <path
                d="M44 54C47 58 53 58 56 54"
                stroke="#09090b"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            )}

            {/* Pipi Merona / Glow Oranye */}
            <circle cx="33" cy="49" r="3" fill="rgba(249, 115, 22, 0.4)" />
            <circle cx="67" cy="49" r="3" fill="rgba(249, 115, 22, 0.4)" />

            {/* Gradients */}
            <defs>
              <linearGradient
                id="ghost-gradient"
                x1="50"
                y1="10"
                x2="50"
                y2="100"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="0.6" stopColor="#f1f5f9" stopOpacity="0.85" />
                <stop offset="1" stopColor="#e2e8f0" stopOpacity="0.75" />
              </linearGradient>
            </defs>
          </svg>
        </button>
      </div>

      <style jsx global>{`
        @keyframes float-ghost {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-12px) rotate(3deg);
          }
        }
        @keyframes wiggle {
          0%,
          100% {
            transform: rotate(-8deg) scale(1.1);
          }
          50% {
            transform: rotate(8deg) scale(1.1);
          }
        }
        .animate-float-ghost {
          animation: float-ghost 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
