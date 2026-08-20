import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Currency Boost",
  description:
    "Lihat event nismara coin boost terbaru Nismara Transport dari yang sedang berjalan maupun yang sudah berlalu",
  openGraph: {
    title: "Currency Boost",
    description:
      "Lihat event nismara coin boost terbaru Nismara Transport dari yang sedang berjalan maupun yang sudah berlalu",
    images: ["https://images.nismara.my.id/227300_188.jpg"],
  },
  keywords: [
    "Nismara Transport",
    "Nismara Group",
    "Nismara Events",
    "Event Trucking Indonesia",
    "Komunitas Truck Simulator",
    "Convoy Truck",
    "Event Driver",
    "Logistics Event",
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

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
