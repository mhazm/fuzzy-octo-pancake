import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "Lihat leaderboard resmi Nismara Transport dengan peringkat driver terbaik, delivery terbanyak, jarak tempuh tertinggi, dan performa komunitas trucking.",
  openGraph: {
    title: "Leaderboard",
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
