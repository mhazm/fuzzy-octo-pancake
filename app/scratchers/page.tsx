import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DriverAccessBlocker from "@/components/DriverAccessBlocker";
import ScratcherClient from "./ScratcherClient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scratch & Win — Kupon Gosok Instan",
  description: "Gosok kupon keberuntunganmu sekarang! Beli kupon scratcher dan raih hadiah instan ribuan Nismara Coin (NC).",
  openGraph: {
    title: "Scratch & Win — Kupon Gosok Instan",
    description: "Gosok kupon keberuntunganmu sekarang! Beli kupon scratcher dan raih hadiah instan ribuan Nismara Coin (NC).",
    url: "https://transport.nismara.web.id/scratchers",
    siteName: "Nismara Transport",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "https://images.nismara.my.id/227300_188.jpg",
        width: 1200,
        height: 630,
        alt: "Scratch & Win Nismara Transport",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Scratch & Win — Kupon Gosok Instan",
    description: "Beli kupon scratcher dan raih hadiah instan ribuan Nismara Coin (NC).",
    images: ["https://images.nismara.my.id/227300_188.jpg"],
  },
};

export default async function ScratchersPage() {
  const session = await getServerSession(authOptions);

  // Jika belum login atau bukan driver, tampilkan blocker
  if (!session || !session.user?.isDriver || !session.user.driverData) {
    return <DriverAccessBlocker session={session} />;
  }

  return (
    <main className="min-h-screen bg-background py-12 px-4 md:px-8">
      <ScratcherClient isDriver={session.user.isDriver} />
    </main>
  );
}
