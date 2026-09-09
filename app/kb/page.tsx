import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import KBPortalClient from "@/components/kb/KBPortalClient";
import NavbarClient from "@/components/NavbarClient";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Knowledge Base & Pusat Panduan Driver",
  description: "Pusat informasi resmi, panduan teknis, peraturan komunitas, dan SOP pengiriman Nismara Transport.",
  openGraph: {
    title: "Knowledge Base & Pusat Panduan Driver",
    description: "Pusat informasi resmi, panduan teknis, peraturan komunitas, dan SOP pengiriman Nismara Transport.",
    url: "https://transport.nismara.web.id/kb",
    siteName: "Nismara Transport",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "https://images.nismara.my.id/227300_188.jpg",
        width: 1200,
        height: 630,
        alt: "Knowledge Base Nismara Transport",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Knowledge Base & Pusat Panduan Driver",
    description: "Pusat informasi resmi, panduan teknis, peraturan komunitas, dan SOP pengiriman Nismara Transport.",
    images: ["https://images.nismara.my.id/227300_188.jpg"],
  },
};

export default async function KBPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <NavbarClient session={session} />
      <div className="pt-24 pb-12">
        <KBPortalClient session={session} />
      </div>
    </div>
  );
}
