import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Login Driver & Anggota Armada",
  description:
    "Masuk ke portal dashboard Nismara Transport menggunakan akun Discord untuk mengakses data armada, saldo NC, dan aktivitas konvoi.",
  openGraph: {
    title: "Login Driver & Anggota Armada",
    description:
      "Masuk ke portal dashboard Nismara Transport menggunakan akun Discord untuk mengakses data armada, saldo NC, dan aktivitas konvoi.",
    url: "https://transport.nismara.web.id/login",
    siteName: "Nismara Transport",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "https://images.nismara.my.id/227300_188.jpg",
        width: 1200,
        height: 630,
        alt: "Login Nismara Transport",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Login Driver & Anggota Armada",
    description:
      "Masuk ke portal dashboard Nismara Transport menggunakan akun Discord.",
    images: ["https://images.nismara.my.id/227300_188.jpg"],
  },
  keywords: ["Nismara Transport", "Nismara Group", "Login Nismara Transport"],
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

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
