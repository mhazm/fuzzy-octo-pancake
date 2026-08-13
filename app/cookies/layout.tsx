import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Cookies Policy",
  description:
    "Informasi kebijakan cookie Nismara Transport mengenai penggunaan cookie dan teknologi serupa untuk meningkatkan layanan",
  openGraph: {
    title: "Cookies Policy",
    description:
      "Informasi kebijakan cookie Nismara Transport mengenai penggunaan cookie dan teknologi serupa untuk meningkatkan layanan",
    images: ["https://images.nismara.my.id/227300_188.jpg"],
  },
  keywords: [
    "Nismara Transport",
    "Nismara Group",
    "Cookies Policy Nismara Transport",
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
