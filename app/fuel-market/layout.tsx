import { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Bursa Solar & Fuel Market",
  description:
    "Pasar transaksi bahan bakar terpusat Nismara Transport. Tersedia harga subsidi SPBU sistem dan perdagangan solar P2P antar pengemudi.",
  openGraph: {
    title: "Bursa Solar & Fuel Market",
    description:
      "Pasar transaksi bahan bakar terpusat Nismara Transport. Tersedia harga subsidi SPBU sistem dan perdagangan solar P2P antar pengemudi.",
    url: "https://transport.nismara.web.id/fuel-market",
    siteName: "Nismara Transport",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "https://images.nismara.my.id/227300_188.jpg",
        width: 1200,
        height: 630,
        alt: "Fuel Market Nismara Transport",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bursa Solar & Fuel Market",
    description:
      "Pasar transaksi bahan bakar terpusat Nismara Transport. Tersedia harga subsidi SPBU sistem dan perdagangan solar P2P antar pengemudi.",
    images: ["https://images.nismara.my.id/227300_188.jpg"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
