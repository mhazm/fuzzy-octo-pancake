import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Papan Peringkat & Leaderboard Driver",
  description:
    "Lihat peringkat resmi driver terbaik Nismara Transport, total kilometer pengiriman terbanyak, performa job, dan kontribusi komunitas.",
  openGraph: {
    title: "Papan Peringkat & Leaderboard Driver",
    description: "Peringkat driver dan komunitas terbaik di Nismara Transport.",
    url: "https://transport.nismara.web.id/leaderboard",
    siteName: "Nismara Transport",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "https://images.nismara.my.id/227300_188.jpg",
        width: 1200,
        height: 630,
        alt: "Leaderboard Nismara Transport",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Papan Peringkat & Leaderboard Driver",
    description: "Peringkat driver dan komunitas terbaik di Nismara Transport.",
    images: ["https://images.nismara.my.id/227300_188.jpg"],
  },
  keywords: [
    "Nismara Transport",
    "Leaderboard Nismara",
    "Top Driver",
    "Truck Driver Ranking",
    "Delivery Leaderboard",
    "Logistics Ranking",
    "Best Driver",
    "Truck Simulator Community",
    "Freight Leaderboard",
    "Nismara Group",
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

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
