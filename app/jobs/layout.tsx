import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Jobs",
  description:
    "Lihat seluruh daftar pekerjaan dan pengiriman di Nismara Transport mulai dari ongoing jobs, completed deliveries, hingga canceled jobs dalam sistem logistik terintegrasi.",
  openGraph: {
    title: "Jobs",
    description: "Daftar pekerjaan dan pengiriman resmi Nismara Transport.",
    images: ["https://images.nismara.my.id/227300_188.jpg"],
  },
  keywords: [
    "Nismara Transport",
    "Jobs Nismara Transport",
    "Logistics Jobs",
    "Pengiriman Barang",
    "Truck Delivery",
    "Ongoing Delivery",
    "Completed Jobs",
    "Canceled Jobs",
    "Sistem Logistik",
    "Transport Management",
    "Driver Jobs",
    "Freight Delivery",
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

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
