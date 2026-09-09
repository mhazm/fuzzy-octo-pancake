import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Kebijakan Privasi & Perlindungan Data",
  description:
    "Kebijakan privasi Nismara Transport menjelaskan cara kami mengelola, melindungi, dan menggunakan data pengguna secara aman dan transparan.",
  openGraph: {
    title: "Kebijakan Privasi & Perlindungan Data",
    description:
      "Kebijakan privasi Nismara Transport menjelaskan cara kami mengelola, melindungi, dan menggunakan data pengguna secara aman dan transparan.",
    url: "https://transport.nismara.web.id/privacy",
    siteName: "Nismara Transport",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "https://images.nismara.my.id/227300_188.jpg",
        width: 1200,
        height: 630,
        alt: "Kebijakan Privasi Nismara Transport",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kebijakan Privasi & Perlindungan Data",
    description:
      "Kebijakan privasi Nismara Transport menjelaskan cara kami mengelola dan melindungi data pengguna.",
    images: ["https://images.nismara.my.id/227300_188.jpg"],
  },
  keywords: [
    "Nismara Transport",
    "Nismara Group",
    "Privacy Policy Nismara Transport",
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

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
