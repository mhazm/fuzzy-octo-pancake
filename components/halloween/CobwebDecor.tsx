"use client";

import React from "react";

export default function CobwebDecor() {
  return (
    <>
      {/* Top Left Cobweb */}
      <div className="fixed top-0 left-0 z-[80] pointer-events-none select-none opacity-40 hover:opacity-60 transition-opacity">
        <svg
          className="w-24 h-24 md:w-36 md:h-36"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Radial Spokes */}
          <line x1="0" y1="0" x2="100" y2="0" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <line x1="0" y1="0" x2="90" y2="35" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <line x1="0" y1="0" x2="70" y2="70" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <line x1="0" y1="0" x2="35" y2="90" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <line x1="0" y1="0" x2="0" y2="100" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />

          {/* Spiral Threads Arc 1 */}
          <path
            d="M 25 0 Q 23 8 22 9 Q 18 18 16 16 Q 8 23 0 25"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="0.8"
            fill="none"
          />
          {/* Spiral Threads Arc 2 */}
          <path
            d="M 50 0 Q 46 17 45 18 Q 36 36 33 33 Q 17 46 0 50"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="0.8"
            fill="none"
          />
          {/* Spiral Threads Arc 3 */}
          <path
            d="M 75 0 Q 69 26 67 27 Q 53 53 50 50 Q 26 69 0 75"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="0.8"
            fill="none"
          />
          {/* Spiral Threads Arc 4 */}
          <path
            d="M 100 0 Q 90 35 88 36 Q 70 70 66 66 Q 35 90 0 100"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="0.8"
            fill="none"
          />

          {/* Little Spider Dangling */}
          <line x1="70" y1="70" x2="70" y2="85" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" strokeDasharray="2,2" />
          <circle cx="70" cy="88" r="2.5" fill="#f97316" />
          <line x1="68" y1="87" x2="65" y2="85" stroke="#f97316" strokeWidth="0.8" />
          <line x1="72" y1="87" x2="75" y2="85" stroke="#f97316" strokeWidth="0.8" />
          <line x1="68" y1="89" x2="65" y2="91" stroke="#f97316" strokeWidth="0.8" />
          <line x1="72" y1="89" x2="75" y2="91" stroke="#f97316" strokeWidth="0.8" />
        </svg>
      </div>

      {/* Top Right Cobweb */}
      <div className="fixed top-0 right-0 z-[80] pointer-events-none select-none opacity-30 hover:opacity-50 transition-opacity transform scale-x-[-1]">
        <svg
          className="w-20 h-20 md:w-28 md:h-28"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <line x1="0" y1="0" x2="100" y2="0" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <line x1="0" y1="0" x2="90" y2="35" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <line x1="0" y1="0" x2="70" y2="70" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <line x1="0" y1="0" x2="35" y2="90" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <line x1="0" y1="0" x2="0" y2="100" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />

          <path d="M 35 0 Q 32 12 30 13 Q 24 24 22 22 Q 12 32 0 35" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" fill="none" />
          <path d="M 70 0 Q 64 24 62 25 Q 49 49 46 46 Q 24 64 0 70" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" fill="none" />
        </svg>
      </div>
    </>
  );
}
