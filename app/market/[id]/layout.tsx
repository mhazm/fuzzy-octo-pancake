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

    return {
      title: `${item.title} - Nismara Transport`,
      description:
        item.description ||
        `Item market ${item.title} tersedia di Nismara Transport.`,
      openGraph: {
        images: item.image_url
          ? [item.image_url]
          : ["https://images.nismara.my.id/227300_188.jpg"],
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
