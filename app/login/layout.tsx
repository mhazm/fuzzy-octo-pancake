import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Login",
  description:
    "Akses dashboard logistik dan sistem pengiriman barang Nismara Transport",
  openGraph: {
    title: "Login",
    description:
      "Akses dashboard logistik dan sistem pengiriman barang Nismara Transport",
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
