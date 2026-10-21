"use client";

import React, { useState, useEffect } from "react";
import { HALLOWEEN_CONFIG, HALLOWEEN_THEME_ACTIVE } from "@/lib/constants/seasonTheme";
import FloatingGhost from "./FloatingGhost";
import PumpkinDecor from "./PumpkinDecor";
import CobwebDecor from "./CobwebDecor";
import CrackedScreenOverlay from "./CrackedScreenOverlay";
import JumpscareModal from "./JumpscareModal";

export default function HalloweenDecorations() {
  const [mounted, setMounted] = useState(false);
  const [isCracked, setIsCracked] = useState(false);
  const [isJumpscareOpen, setIsJumpscareOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !HALLOWEEN_THEME_ACTIVE) {
    return null;
  }

  const handleTriggerJumpscare = () => {
    setIsCracked(true);
    setIsJumpscareOpen(true);
  };

  const handleRepairScreen = () => {
    setIsCracked(false);
    setIsJumpscareOpen(false);
  };

  return (
    <>
      {/* 1. Jaring Laba-laba di Sudut Atas */}
      {HALLOWEEN_CONFIG.decorations.cobwebs && <CobwebDecor />}

      {/* 2. Labu Berpijar Jack-o'-lantern di Sudut Bawah */}
      {HALLOWEEN_CONFIG.decorations.pumpkins && <PumpkinDecor />}

      {/* 3. Hantu Melayang Interaktif (Easter Egg Clicker) */}
      {HALLOWEEN_CONFIG.decorations.floatingGhost && (
        <FloatingGhost
          onTriggerJumpscare={handleTriggerJumpscare}
          clickThreshold={HALLOWEEN_CONFIG.jumpscare.clickThreshold}
        />
      )}

      {/* 4. Overlay Layar Retak (Shattered Glass) */}
      <CrackedScreenOverlay
        isCracked={isCracked}
        onClear={handleRepairScreen}
      />

      {/* 5. Jumpscare Modal Flash & Dialog Perbaikan */}
      <JumpscareModal
        isOpen={isJumpscareOpen}
        imageSrc={HALLOWEEN_CONFIG.jumpscare.imageSrc}
        flashDurationMs={HALLOWEEN_CONFIG.jumpscare.flashDurationMs}
        onClose={handleRepairScreen}
      />
    </>
  );
}
