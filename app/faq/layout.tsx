import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Temukan jawaban dari pertanyaan yang sering diajukan seputar Nismara Transport, sistem driver, pengiriman barang, event, dan layanan logistik.",
  openGraph: {
    title: "FAQ",
    description: "Pusat bantuan dan pertanyaan umum resmi Nismara Transport.",
    images: ["https://images.nismara.my.id/227300_188.jpg"],
  },
  keywords: [
    "Nismara Transport",
    "FAQ Nismara Transport",
    "Pusat Bantuan",
    "Pertanyaan Umum",
    "Sistem Driver",
    "Layanan Logistik",
    "Pengiriman Barang",
    "Bantuan Driver",
    "Truck Management",
  ],
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
    },
  },
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
