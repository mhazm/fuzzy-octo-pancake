import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DriverAccessBlocker from "@/components/DriverAccessBlocker";
import RacingClient from "./RacingClient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Truck Drag Race — Adu Cepat Truk Antar Driver",
  description: "Tantang pengemudi lain dalam adu cepat lintasan lurus Truck Drag Race! Pasang taruhan NC, racik strategi, dan rebut trofi juara.",
  openGraph: {
    title: "Truck Drag Race — Adu Cepat Truk Antar Driver",
    description: "Tantang pengemudi lain dalam adu cepat lintasan lurus Truck Drag Race! Pasang taruhan NC, racik strategi, dan rebut trofi juara.",
    url: "https://transport.nismara.web.id/racing",
    siteName: "Nismara Transport",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "https://images.nismara.my.id/227300_188.jpg",
        width: 1200,
        height: 630,
        alt: "Truck Drag Race Nismara Transport",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Truck Drag Race — Adu Cepat Truk Antar Driver",
    description: "Tantang pengemudi lain dalam adu cepat lintasan lurus Truck Drag Race!",
    images: ["https://images.nismara.my.id/227300_188.jpg"],
  },
};

export default async function RacingPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return <DriverAccessBlocker session={session as any} />;
  }

  // Same logic as scratchers page: check isDriver
  const isDriver = !!session.user.isDriver;

  if (!isDriver) {
    return <DriverAccessBlocker session={session as any} />;
  }

  return <RacingClient isDriver={isDriver} />;
}
