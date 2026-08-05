import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Kebijakan privasi Nismara Transport menjelaskan cara kami mengelola, melindungi, dan menggunakan data pengguna secara aman dan transparan",
  openGraph: {
    title: "Privacy Policy",
    description:
      "Kebijakan privasi Nismara Transport menjelaskan cara kami mengelola, melindungi, dan menggunakan data pengguna secara aman dan transparan",
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
