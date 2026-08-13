import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Teams",
  description:
    "Lihat berbagai tim resmi di Nismara Transport mulai dari tim driver, logistics management, event team, convoy team, hingga operasional perusahaan.",
  openGraph: {
    title: "Teams",
    description:
      "Daftar team resmi dan komunitas operasional Nismara Transport.",
    images: ["https://images.nismara.my.id/227300_188.jpg"],
  },
  keywords: [
    "Nismara Transport",
    "Nismara Teams",
    "Truck Driver Team",
    "Logistics Team",
    "Convoy Team",
    "Event Team",
    "Transport Community",
    "Management Team",
    "Driver Community",
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

export default function TeamsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
