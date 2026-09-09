import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../api/auth/[...nextauth]/route";
import NavbarClient from "@/components/NavbarClient";
import KBArticleClient from "@/components/kb/KBArticleClient";
import KBSidebarClient from "@/components/kb/KBSidebarClient";
import clientPromise from "@/lib/mongodb";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string; articleSlug: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;

  let articleTitle = resolvedParams.articleSlug;
  let articleDescription = "Panduan dan informasi resmi seputar Nismara Transport";
  let coverImage = "https://images.nismara.my.id/227300_188.jpg";
  
  try {
    const client = await clientPromise;
    const db = client.db();
    const articleDoc = await db.collection("kb_articles").findOne({ slug: resolvedParams.articleSlug });
    if (articleDoc) {
      if (articleDoc.title) articleTitle = articleDoc.title;
      if (articleDoc.description) articleDescription = articleDoc.description;
      if (articleDoc.coverImage) coverImage = articleDoc.coverImage;
    }
  } catch (error) {
    console.error("Error fetching article metadata:", error);
  }

  const title = `${articleTitle} | Knowledge Base`;
  const pageUrl = `https://transport.nismara.web.id/kb/${resolvedParams.categorySlug}/${resolvedParams.articleSlug}`;

  return {
    title,
    description: articleDescription,
    openGraph: {
      title,
      description: articleDescription,
      url: pageUrl,
      siteName: "Nismara Transport",
      locale: "id_ID",
      type: "article",
      images: [
        {
          url: coverImage,
          width: 1200,
          height: 630,
          alt: articleTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: articleDescription,
      images: [coverImage],
    },
  };
}

export default async function KBArticlePage({
  params,
}: {
  params: Promise<{ categorySlug: string; articleSlug: string }>;
}) {
  const session = await getServerSession(authOptions);
  const resolvedParams = await params;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <NavbarClient session={session} />
      
      {/* Container for Sidebar + Content */}
      <div className="flex-1 flex w-full max-w-screen-2xl mx-auto pt-20 px-4 sm:px-6 lg:px-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-72 shrink-0 border-r border-border/30 h-[calc(100vh-5rem)] sticky top-20 overflow-y-auto no-scrollbar">
          <KBSidebarClient currentSlug={resolvedParams.articleSlug} categorySlug={resolvedParams.categorySlug} />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 py-8 lg:px-12">
          <KBArticleClient slug={resolvedParams.articleSlug} categorySlug={resolvedParams.categorySlug} session={session} />
        </main>
      </div>
    </div>
  );
}
