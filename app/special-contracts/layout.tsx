import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Special Contract",
  description:
    "Lihat daftar Special Contract eksklusif di Nismara Transport dengan pengiriman prioritas, cargo khusus, tantangan driver, dan reward tambahan.",
  openGraph: {
    title: "Special Contract",
    description:
      "Special Contract resmi Nismara Transport untuk pengiriman dan tantangan eksklusif.",
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
