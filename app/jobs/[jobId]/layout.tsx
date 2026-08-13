import type { Metadata, ResolvingMetadata } from "next";
import React from "react";
import clientPromise from "@/lib/mongodb";

type Props = {
  params: Promise<{ jobId: string }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const resolvedParams = await params;
  const jobId = resolvedParams.jobId;

  const client = await clientPromise;
  const db = client.db();

  const localJob = await db.collection("jobhistories").findOne({
    $or: [{ jobId: jobId }, { jobId: Number(jobId) }],
  });

  if (!localJob) {
    console.error("Error fetching cars for metadata:", localJob);
  }

  const jobIds = localJob?.jobId || jobId;
  const jobStatus = localJob?.jobStatus || "Unknown";
  const jobGame = localJob?.game || "Unknown";

  return {
    title: `Job #${jobIds} Details - Nismara Transport`,
    description: `Pekerjaan #${jobIds} Nismara Transport yang bertugas di ${jobGame} dengan status ${jobStatus}`,
    openGraph: {
      title: `Job #${jobIds} Details - Nismara Transport`,
      description: `Pekerjaan #${jobIds} Nismara Transport yang bertugas di ${jobGame} dengan status ${jobStatus}`,
      images: ["https://images.nismara.my.id/227300_188.jpg"],
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
