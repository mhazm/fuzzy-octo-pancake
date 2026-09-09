import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Kontrak Khusus & Special Contracts",
  description:
    "Lihat daftar Special Contract eksklusif di Nismara Transport dengan pengiriman prioritas, kargo berharga tinggi, tantangan rute, dan bonus NC berlimpah.",
  openGraph: {
    title: "Kontrak Khusus & Special Contracts",
    description:
      "Special Contract resmi Nismara Transport untuk pengiriman prioritas dan tantangan kargo eksklusif berhadiah NC.",
    url: "https://transport.nismara.web.id/special-contracts",
    siteName: "Nismara Transport",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "https://images.nismara.my.id/227300_188.jpg",
        width: 1200,
        height: 630,
        alt: "Special Contracts Nismara Transport",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kontrak Khusus & Special Contracts",
    description:
      "Special Contract resmi Nismara Transport untuk pengiriman prioritas dan tantangan kargo eksklusif berhadiah NC.",
    images: ["https://images.nismara.my.id/227300_188.jpg"],
  },
  keywords: [
    "Nismara Transport",
    "Special Contract",
    "Exclusive Delivery",
    "Cargo Contract",
    "Truck Logistics",
    "Driver Challenge",
    "Freight Delivery",
    "Logistics Event",
    "Transport Management",
    "Special Cargo",
    "Priority Delivery",
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

export default function SpecialContractLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
