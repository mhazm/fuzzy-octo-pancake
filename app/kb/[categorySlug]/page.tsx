import { getServerSession } from "next-auth/next";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import NavbarClient from "@/components/NavbarClient";
import KBCategoryClient from "@/components/kb/KBCategoryClient";
import clientPromise from "@/lib/mongodb";
import { notFound, redirect } from "next/navigation";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  
  let categoryName = resolvedParams.categorySlug;
  try {
    const client = await clientPromise;
    const db = client.db();
    const categoryDoc = await db.collection("kb_categories").findOne({ slug: resolvedParams.categorySlug });
    if (categoryDoc && categoryDoc.name) {
      categoryName = categoryDoc.name;
    }
  } catch (error) {
    console.error("Error fetching category metadata:", error);
  }

  const title = `Panduan ${categoryName} | Knowledge Base`;
  const description = `Kumpulan artikel panduan, dokumentasi, dan informasi resmi untuk kategori ${categoryName} di Nismara Transport.`;
  const pageUrl = `https://transport.nismara.web.id/kb/${resolvedParams.categorySlug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "Nismara Transport",
      locale: "id_ID",
      type: "website",
      images: [
        {
          url: "https://images.nismara.my.id/227300_188.jpg",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://images.nismara.my.id/227300_188.jpg"],
    },
  };
}

export default async function KBCategoryPage({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const session = await getServerSession(authOptions);
  const resolvedParams = await params;

  const isManager = session?.user?.role === "manager" || session?.user?.role === "admin";
  const isDriver = session?.user?.isDriver === true;

  const allowedAccess = ["public"];
  if (isDriver || isManager) allowedAccess.push("driver");
  if (isManager) allowedAccess.push("manager");

  try {
    const client = await clientPromise;
    const db = client.db();
    const categoryDoc = await db.collection("kb_categories").findOne({ slug: resolvedParams.categorySlug });

    if (!categoryDoc) {
      notFound();
    }

    const catAccess = categoryDoc.accessLevel || "public";
    if (!allowedAccess.includes(catAccess)) {
      if (!session) {
        redirect(`/login?callbackUrl=/kb/${resolvedParams.categorySlug}`);
      }
      notFound();
    }
  } catch (err: any) {
    if (err?.message?.includes("NEXT_NOT_FOUND") || err?.message?.includes("NEXT_REDIRECT") || err?.digest?.includes("NEXT_")) {
      throw err;
    }
    console.error("Error checking category access:", err);
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <NavbarClient session={session} />
      <div className="pt-24 pb-12 flex-1">
        <KBCategoryClient categorySlug={resolvedParams.categorySlug} session={session} />
      </div>
    </div>
  );
}
