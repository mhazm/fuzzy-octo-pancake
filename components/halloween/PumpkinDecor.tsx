"use client";

import React from "react";

export default function PumpkinDecor() {
  return (
    <div className="fixed bottom-3 right-4 z-[90] pointer-events-none select-none drop-shadow-[0_10px_25px_rgba(249,115,22,0.3)]">
      <div className="relative group cursor-default">
        {/* Glow ambient candle light */}
        <div className="absolute -inset-2 bg-orange-600/25 rounded-full blur-xl animate-pulse" />

        {/* Jack-o'-lantern SVG */}
        <svg
          className="w-12 h-12 md:w-16 md:h-16 transform transition-transform duration-300 hover:scale-110"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Stem / Tangkai */}
          <path
            d="M48 24C48 18 52 10 60 8C58 13 55 17 54 22C53 23 50 24 48 24Z"
            fill="#15803d"
            stroke="#14532d"
            strokeWidth="1.5"
          />

          {/* Pumpkin Lobes Body */}
          <ellipse cx="50" cy="58" rx="42" ry="32" fill="#ea580c" />
          <ellipse cx="32" cy="58" rx="26" ry="30" fill="#f97316" />
          <ellipse cx="68" cy="58" rx="26" ry="30" fill="#f97316" />
          <ellipse cx="50" cy="58" rx="28" ry="31" fill="#fb923c" />

          {/* Carved Eyes (Flickering Light) */}
          <g className="animate-[flicker_2.5s_infinite]">
            {/* Left Eye */}
            <polygon points="34,48 44,48 39,40" fill="#fef08a" />
            <polygon points="35,47 43,47 39,41" fill="#fef9c3" />

            {/* Right Eye */}
            <polygon points="56,48 66,48 61,40" fill="#fef08a" />
            <polygon points="57,47 65,47 61,41" fill="#fef9c3" />

            {/* Nose */}
            <polygon points="50,52 46,59 54,59" fill="#fef08a" />

            {/* Spooky Carved Mouth */}
            <path
              d="M30 67C35 78 65 78 70 67C65 71 58 68 55 72C52 68 45 71 40 68C36 72 32 68 30 67Z"
              fill="#fef08a"
            />
            {/* Teeth Cutouts */}
            <rect x="42" y="66" width="4" height="4" fill="#9a3412" />
            <rect x="54" y="66" width="4" height="4" fill="#9a3412" />
            <rect x="48" y="70" width="4" height="4" fill="#9a3412" />
          </g>
        </svg>
      </div>

      <style jsx global>{`
        @keyframes flicker {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 8px rgba(254, 240, 138, 0.9)); }
          25% { opacity: 0.85; filter: drop-shadow(0 0 3px rgba(254, 240, 138, 0.5)); }
          50% { opacity: 0.95; filter: drop-shadow(0 0 10px rgba(254, 240, 138, 1)); }
          75% { opacity: 0.7; filter: drop-shadow(0 0 2px rgba(254, 240, 138, 0.4)); }
        }
      `}</style>
    </div>
  );
}
