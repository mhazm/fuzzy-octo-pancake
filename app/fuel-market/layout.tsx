import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fuel Market",
  description:
    "Pasar transaksi bahan bakar terpusat Nismara Transport. Tersedia harga sistem dan pasar P2P antar pengemudi.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
