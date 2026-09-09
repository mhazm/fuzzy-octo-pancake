
import type { Metadata } from "next";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Mod Market & Aksesoris Driver",
  description: "Katalog mod resmi Euro Truck Simulator 2 dan American Truck Simulator eksklusif Nismara Transport. Temukan livery, aksesoris truk, dan mod komunitas.",
  openGraph: {
    title: "Mod Market & Aksesoris Driver",
    description: "Katalog mod resmi Euro Truck Simulator 2 dan American Truck Simulator eksklusif Nismara Transport. Temukan livery, aksesoris truk, dan mod komunitas.",
    url: "https://transport.nismara.web.id/market",
    siteName: "Nismara Transport",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "https://images.nismara.my.id/227300_188.jpg",
        width: 1200,
        height: 630,
        alt: "Mod Market Nismara Transport",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mod Market & Aksesoris Driver",
    description: "Katalog mod resmi Euro Truck Simulator 2 dan American Truck Simulator eksklusif Nismara Transport.",
    images: ["https://images.nismara.my.id/227300_188.jpg"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
