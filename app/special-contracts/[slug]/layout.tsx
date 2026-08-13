import type { Metadata, ResolvingMetadata } from "next";
import React from "react";
import clientPromise from "@/lib/mongodb";

type Props = {
  params: Promise<{ slug: string }>;
};

// Helper untuk konversi ID Game ke Nama Lengkap
const getGameName = (gameId: string | undefined) => {
  if (gameId === "1") return "Euro Truck Simulator 2";
  if (gameId === "2") return "American Truck Simulator";
  return "Simulation Game";
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  const client = await clientPromise;
  const db = client.db();

  // Pencarian fleksibel (slug ke spasi/dash)
  const flexiblePattern = slug.split("-").join("[ -]");
  const query = {
    contractName: { $regex: new RegExp(`^${flexiblePattern}$`, "i") },
  };

  // Mencari di koleksi utama atau history
  let contract = await db.collection("contracts").findOne(query);
  if (!contract) {
    contract = await db.collection("contracthistories").findOne(query);
  }

  // Pengolahan data untuk Meta
  const contractName = contract?.contractName || slug;
  const contractCompany = contract?.companyName || "Unknown Company";
  const gameName = getGameName(contract?.gameId);

  // Menggunakan domain asset terbaru sesuai konfigurasi R2 kamu
  const contractImage =
    contract?.imageUrl || "https://images.nismara.my.id/227300_188.jpg";

  return {
    title: `${contractName} - ${gameName}`,
    description: `Detail Special Contract ${contractName} Nismara Transport. Tersedia untuk ${gameName} dengan tujuan perusahaan ${contractCompany}.`,
    openGraph: {
      title: `${contractName}`,
      description: `Ambil muatan Special Contract ${contractName} di ${gameName}. Join Nismara Transport sekarang!`,
      images: [
        {
          url: contractImage,
          width: 1200,
          height: 630,
          alt: `Contract ${contractName}`,
        },
      ],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${contractName}`,
      images: [contractImage],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function SpecialContractLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="min-h-screen bg-background">
      {/* Kamu bisa menambahkan Sidebar atau Breadcrumb di sini jika diperlukan */}
      {children}
    </section>
  );
}
