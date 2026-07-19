import type { Metadata, ResolvingMetadata } from "next";
import React from "react";
import clientPromise from "@/lib/mongodb";

type Props = {
  params: Promise<{ convoyUri: string }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const resolvedParams = await params;
  const convoyUri = resolvedParams.convoyUri;

  const client = await clientPromise;
  const db = client.db();

  // DEBUGGING: Cek apa yang dikirim ke database
  console.log("Mencari convoy dengan URI:", convoyUri);

  const convoyData = await db.collection("convoylobby").findOne({
    convoyUri: convoyUri,
  });

  if (!convoyData) {
    console.log("Convoy data not found for URI:", convoyUri);
  }

  const convoyName = convoyData?.convoyName;
  const sourceCity = convoyData?.sourceCity || "Unknown";
  const cargo = convoyData?.cargoName || "Unknown";
  const plannedDistance = convoyData?.plannedDistanceKm || "0";
  const destinationCity = convoyData?.destinationCity || "Unknown";
  const imageUrl =
    convoyData?.imageUrl || "https://images.nismara.my.id/227300_188.jpg";

  return {
    title: `#${convoyName} | Nismara Transport`,
    description: `#${convoyName} akan berlangsung dari ${sourceCity} menuju ${destinationCity} dengan membawa cargo ${cargo}. Perjalanan ini akan menempuh jarak ${plannedDistance} km.`,
    openGraph: {
      title: `#${convoyName} | Nismara Transport`,
      description: `#${convoyName} akan berlangsung dari ${sourceCity} menuju ${destinationCity} dengan membawa cargo ${cargo}. Perjalanan ini akan menempuh jarak ${plannedDistance} km.`,
      images: [imageUrl],
    },
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
}

export default function CarsUriLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
