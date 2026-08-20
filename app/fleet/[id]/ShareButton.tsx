"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

export default function ShareButton({ title, text }: { title?: string, text?: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || "Nismara Transport Fleet",
          text: text || "Lihat profil truk ini di Nismara Transport!",
          url: url,
        });
        return;
      } catch (err) {
        console.log("Error sharing", err);
      }
    }
    
    // Fallback to copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-4 py-2 bg-background/50 hover:bg-background border border-border/50 rounded-xl text-sm font-bold uppercase tracking-widest transition-colors text-foreground/80 hover:text-foreground shadow-sm"
    >
      {copied ? <Check size={16} className="text-emerald-500" /> : <Share2 size={16} />}
      {copied ? "Tersalin!" : "Share / Copy Link"}
    </button>
  );
}
