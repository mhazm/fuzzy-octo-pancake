import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../api/auth/[...nextauth]/route";
import NavbarClient from "@/components/NavbarClient";
import KBArticleClient from "@/components/kb/KBArticleClient";
import KBSidebarClient from "@/components/kb/KBSidebarClient";
import clientPromise from "@/lib/mongodb";

export async function generateMetadata({
  params,
}: {
  params: { categorySlug: string, articleSlug: string };
}) {
  const resolvedParams = await params;

  let articleTitle = resolvedParams.articleSlug;
  let articleDescription = "Panduan dan informasi seputar Nismara Logistics";
  
  try {
    const client = await clientPromise;
    const db = client.db();
    const articleDoc = await db.collection("kb_articles").findOne({ slug: resolvedParams.articleSlug });
    if (articleDoc) {
      if (articleDoc.title) articleTitle = articleDoc.title;
      if (articleDoc.description) articleDescription = articleDoc.description;
    }
  } catch (error) {
    console.error("Error fetching article metadata:", error);
  }

  return {
    title: `${articleTitle} - Knowledge Base`,
    description: articleDescription,
  };
}

export default async function KBArticlePage({
  params,
}: {
  params: { categorySlug: string, articleSlug: string };
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
