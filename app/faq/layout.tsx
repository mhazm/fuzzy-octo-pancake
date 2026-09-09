import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Pusat Bantuan & Pertanyaan Umum (FAQ)",
  description:
    "Temukan jawaban dari pertanyaan yang sering diajukan seputar Nismara Transport, pendaftaran driver, pengiriman kargo, event mabar, dan sistem reward.",
  openGraph: {
    title: "Pusat Bantuan & Pertanyaan Umum (FAQ)",
    description: "Pusat bantuan dan pertanyaan umum resmi Nismara Transport.",
    url: "https://transport.nismara.web.id/faq",
    siteName: "Nismara Transport",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "https://images.nismara.my.id/227300_188.jpg",
        width: 1200,
        height: 630,
        alt: "FAQ Nismara Transport",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pusat Bantuan & Pertanyaan Umum (FAQ)",
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
