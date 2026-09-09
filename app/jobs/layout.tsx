import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Daftar Pengiriman & Job Logistik",
  description:
    "Pantau seluruh aktivitas pekerjaan dan pengiriman kargo driver Nismara Transport secara real-time dari Euro Truck Simulator 2 dan American Truck Simulator.",
  openGraph: {
    title: "Daftar Pengiriman & Job Logistik",
    description:
      "Pantau seluruh aktivitas pekerjaan dan pengiriman kargo driver Nismara Transport secara real-time.",
    url: "https://transport.nismara.web.id/jobs",
    siteName: "Nismara Transport",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "https://images.nismara.my.id/227300_188.jpg",
        width: 1200,
        height: 630,
        alt: "Daftar Pengiriman Nismara Transport",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Daftar Pengiriman & Job Logistik",
    description:
      "Pantau seluruh aktivitas pekerjaan dan pengiriman kargo driver Nismara Transport secara real-time.",
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
