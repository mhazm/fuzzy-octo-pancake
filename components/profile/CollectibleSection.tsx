"use client";

import { useState } from "react";
import { ConvoyTicket } from "@/components/ui/ConvoyTicket";
import { Ticket } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

interface Collectible {
  _id: string;
  type: string;
  title: string;
  subtitle: string;
  date: string;
  seat: string;
  gate: string;
  ticketNumber: string;
  createdAt: string;
}

export default function CollectibleSection({
  collectibles,
}: {
  collectibles: Collectible[];
}) {
  const [showAll, setShowAll] = useState(false);

  if (!collectibles || collectibles.length === 0) {
    return null;
  }

  const displayedCollectibles = collectibles.slice(0, 3);

  return (
    <>
      <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-6 relative overflow-hidden">
        {/* Title */}
        <div className="flex justify-between items-center mb-6 border-b border-border/50 pb-4 relative z-10">
          <h2 className="text-lg font-bold text-foreground/90 uppercase tracking-widest text-sm flex items-center gap-2">
            <Ticket className="w-5 h-5 text-amber-500" /> Koleksi Tiket
          </h2>
          {collectibles.length > 3 && (
            <button
              onClick={() => setShowAll(true)}
              className="text-xs font-bold text-primary hover:text-primary/80 uppercase tracking-wider"
            >
              Lihat Semua ({collectibles.length})
            </button>
          )}
        </div>

        {/* Content */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-4">
          {displayedCollectibles.map((c) => {
            const dateStr = new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const num = parseInt(c.ticketNumber.replace("NCE-", "")) || 0;
            const tones: any[] = ["blue", "green", "amber", "rose", "purple"];
            const dynamicTone = tones[num % tones.length];

            return (
              <ConvoyTicket
                key={c._id}
                eyebrow="Nismara Group"
                event={c.title}
                holder={c.subtitle}
                code={c.ticketNumber}
                details={[
                  { label: "Date", value: dateStr },
                  { label: "Seat", value: c.seat },
                  { label: "Gate", value: c.gate },
                ]}
                tone={dynamicTone}
                className="w-full shadow-lg"
              />
            );
          })}
        </div>
      </div>

      <Modal
        isOpen={showAll}
        onClose={() => setShowAll(false)}
        title={`KOLEKSI TIKET (${collectibles.length})`}
        maxWidth="max-w-5xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 md:p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {collectibles.map((c) => {
            const dateStr = new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const num = parseInt(c.ticketNumber.replace("NCE-", "")) || 0;
            const tones: any[] = ["blue", "green", "amber", "rose", "purple"];
            const dynamicTone = tones[num % tones.length];

            return (
              <ConvoyTicket
                key={c._id}
                eyebrow="Nismara Group"
                event={c.title}
                holder={c.subtitle}
                code={c.ticketNumber}
                details={[
                  { label: "Date", value: dateStr },
                  { label: "Seat", value: c.seat },
                  { label: "Gate", value: c.gate },
                ]}
                tone={dynamicTone}
                className="w-full shadow-md"
              />
            );
          })}
        </div>
      </Modal>
    </>
  );
}
