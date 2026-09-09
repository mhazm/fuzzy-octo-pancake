import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan Layanan (Terms)",
  description:
    "Pelajari syarat dan ketentuan Nismara Transport. Ketahui aturan penggunaan, kebijakan komunitas, serta hak dan kewajiban driver.",
  openGraph: {
    title: "Syarat & Ketentuan Layanan (Terms)",
    description:
      "Pelajari syarat dan ketentuan Nismara Transport. Ketahui aturan penggunaan, kebijakan komunitas, serta hak dan kewajiban driver.",
    url: "https://transport.nismara.web.id/terms",
    siteName: "Nismara Transport",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "https://images.nismara.my.id/227300_188.jpg",
        width: 1200,
        height: 630,
        alt: "Syarat & Ketentuan Nismara Transport",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Syarat & Ketentuan Layanan (Terms)",
    description:
      "Pelajari syarat dan ketentuan penggunaan platform dan komunitas Nismara Transport.",
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
