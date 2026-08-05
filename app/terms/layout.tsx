import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Pelajari syarat dan ketentuan Nismara Transport. Ketahui aturan penggunaan, kebijakan, serta hak dan kewajiban pengguna platform",
  openGraph: {
    title: "Terms & Conditions",
    description:
      "Pelajari syarat dan ketentuan Nismara Transport. Ketahui aturan penggunaan, kebijakan, serta hak dan kewajiban pengguna platform",
    images: ["https://images.nismara.my.id/227300_188.jpg"],
  },
  keywords: [
    "Nismara Transport",
    "Nismara Group",
    "Terms & Conditions Nismara Transport",
    "Terms Nismara Transport",
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

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
