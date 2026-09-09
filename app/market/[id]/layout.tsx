import { Metadata } from "next";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const idOrSlug = resolvedParams.id;

  try {
    const client = await clientPromise;
    const db = client.db();

    // Cek apakah parameternya ObjectId atau slug
    let query: any = { slug: idOrSlug };
    if (ObjectId.isValid(idOrSlug)) {
      query = { $or: [{ slug: idOrSlug }, { _id: new ObjectId(idOrSlug) }] };
    }

    const item = await db.collection("marketitems").findOne(query);

    if (!item) {
      return {
        title: "Item Tidak Ditemukan",
      };
    }

    const title = `${item.title}`;
    const description = item.description || `Dapatkan mod ${item.title} di Mod Market Nismara Transport.`;
    const image = item.image_url || "https://images.nismara.my.id/227300_188.jpg";
    const pageUrl = `https://transport.nismara.web.id/market/${idOrSlug}`;

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
            url: image,
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
        images: [image],
      },
    };
  } catch (error) {
    console.error("Error generating market item metadata:", error);
    return {
      title: "Market Detail",
    };
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
