import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Convoy - Nismara Transport",
  description:
    "Lihat berbagai aktifitas konvoi yang diadakan oleh Nismara Transport",
  openGraph: {
    title: "Convoy - Nismara Transport",
    description:
      "Lihat berbagai aktifitas konvoi yang diadakan oleh Nismara Transport",
    images: ["https://images.nismara.my.id/227300_188.jpg"],
  },
  keywords: [
    "Nismara Transport",
    "Nismara Group",
    "Convoy Nismara Transport",
    "Konvoi Nismara Transport",
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

export default function CookiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
