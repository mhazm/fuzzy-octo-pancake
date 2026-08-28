import { MetadataRoute } from "next";
import clientPromise from "@/lib/mongodb";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://transport.nismara.web.id";

  const client = await clientPromise;
  const db = client.db();

  // 1. Ambil Data Dinamis dari MongoDB
  const [
    jobs,
    teams,
    contracts,
    convoylobby,
    galleryPosts,
    users,
    surveys,
    marketItems,
    achievements,
    ncEvents,
    coupons,
    communitygoals,
    kbCategories,
    kbArticles,
  ] = await Promise.all([
    db
      .collection("jobs")
      .find({}, { projection: { jobId: 1, updatedAt: 1 } })
      .toArray(),
    db
      .collection("teams")
      .find({}, { projection: { uri: 1, updatedAt: 1 } })
      .toArray(),
    db
      .collection("contracts")
      .find({}, { projection: { contractName: 1, updatedAt: 1 } })
      .toArray(),
    db
      .collection("convoylobby")
      .find({}, { projection: { convoyUri: 1, updatedAt: 1 } })
      .toArray(),
    db
      .collection("gallery_posts")
      .find({}, { projection: { _id: 1, updatedAt: 1 } })
      .toArray(),
    db
      .collection("users")
      .find({}, { projection: { truckyId: 1, updatedAt: 1 } })
      .toArray(),
    db
      .collection("surveys")
      .find({}, { projection: { uri: 1, updatedAt: 1 } })
      .toArray(),
    // Data MarketItem dari Mongoose secara native menggunakan nama koleksi 'marketitems'
    db
      .collection("marketitems")
      .find(
        { isPublished: true },
        { projection: { _id: 1, slug: 1, updatedAt: 1 } },
      )
      .toArray(),
    db
      .collection("achievements")
      .find({}, { projection: { slug: 1, updatedAt: 1 } })
      .toArray(),
    db
      .collection("ncevents")
      .find({}, { projection: { slug: 1, updatedAt: 1 } })
      .toArray(),
    db
      .collection("coupons")
      .find({}, { projection: { codeCoupon: 1, updatedAt: 1 } })
      .toArray(),
    db
      .collection("communitygoals")
      .find({}, { projection: { slug: 1, updatedAt: 1 } })
      .toArray(),
    db
      .collection("kb_categories")
      .find({}, { projection: { slug: 1, updatedAt: 1, createdAt: 1 } })
      .toArray(),
    db
      .collection("kb_articles")
      .find({ accessLevel: "public" }, { projection: { slug: 1, categorySlug: 1, updatedAt: 1, createdAt: 1 } })
      .toArray(),
  ]);

  // 2. Map Jobs (/jobs/[jobId])
  const jobEntries = jobs
    .filter((job) => job.jobId)
    .map((job) => ({
      url: `${baseUrl}/jobs/${job.jobId}`,
      lastModified: job.updatedAt || new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  // 3. Map Teams (/teams/[uri])
  const teamEntries = teams
    .filter((team) => team.uri)
    .map((team) => ({
      url: `${baseUrl}/teams/${team.uri}`,
      lastModified: team.updatedAt || new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  // 4. Map Special Contracts (/contracts/[slug])
  const contractEntries = contracts
    .filter((contract) => contract.contractName)
    .map((contract) => {
      const slug = contract.contractName.toLowerCase().replace(/ /g, "-");
      return {
        url: `${baseUrl}/special-contracts/${slug}`,
        lastModified: contract.updatedAt || new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      };
    });

  // 5. Map Convoy (/convoy/[uri])
  const convoyEntries = convoylobby
    .filter((convoy) => convoy.convoyUri)
    .map((convoy) => ({
      url: `${baseUrl}/convoy/${convoy.convoyUri}`,
      lastModified: convoy.updatedAt || new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  // 6. Map Gallery Posts (/p/[postId])
  const postEntries = galleryPosts
    .filter((post) => post._id)
    .map((post) => ({
      url: `${baseUrl}/p/${post._id}`,
      lastModified: post.updatedAt || new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  // 7. Map Driver Profiles (/profile/[truckyId])
  const profileEntries = users
    .filter((user) => user.truckyId)
    .map((user) => ({
      url: `${baseUrl}/profile/${user.truckyId}`,
      lastModified: user.updatedAt || new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  // 8. Map Surveys (/surveys/[uri])
  const surveyEntries = surveys
    .filter((survey) => survey.uri)
    .map((survey) => ({
      url: `${baseUrl}/surveys/${survey.uri}`,
      lastModified: survey.updatedAt || new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  // 9. Map Market Items (/market/[id] atau slug)
  const marketEntries = marketItems
    .filter((item) => item.slug || item._id)
    .map((item) => ({
      url: `${baseUrl}/market/${item.slug || item._id}`,
      lastModified: item.updatedAt || new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  // 10. Map Achievements (/achievements/[slug])
  const achievementEntries = achievements
    .filter((ach) => ach.slug)
    .map((ach) => ({
      url: `${baseUrl}/achievements/${ach.slug}`,
      lastModified: ach.updatedAt || new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  // 11. Map Currency Boost Events (/currency-boost/[slug])
  const ncEventEntries = ncEvents
    .filter((event) => event.slug)
    .map((event) => ({
      url: `${baseUrl}/currency-boost/${event.slug}`,
      lastModified: event.updatedAt || new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  // 12. Map Coupons (/coupons/[codeCoupon])
  const couponEntries = coupons
    .filter((coupon) => coupon.codeCoupon)
    .map((coupon) => ({
      url: `${baseUrl}/coupons/${coupon.codeCoupon}`,
      lastModified: coupon.updatedAt || new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  // 13. Map Community Goals (/community-goals/[slug])
  const communityGoalEntries = communitygoals
    .filter((goal) => goal.slug || goal._id)
    .map((goal) => ({
      url: `${baseUrl}/community-goals/${goal.slug || goal._id}`,
      lastModified: goal.updatedAt || new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  // Map KB Categories
  const kbCategoryEntries = kbCategories
    .filter((cat) => cat.slug)
    .map((cat) => ({
      url: `${baseUrl}/kb/${cat.slug}`,
      lastModified: cat.updatedAt || cat.createdAt || new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  // Map KB Articles
  const kbArticleEntries = kbArticles
    .filter((art) => art.slug && art.categorySlug)
    .map((art) => ({
      url: `${baseUrl}/kb/${art.categorySlug}/${art.slug}`,
      lastModified: art.updatedAt || art.createdAt || new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  // 14. Rute Statis Lengkap
  const routePaths = [
    "",
    "/jobs",
    "/teams",
    "/events",
    "/convoy",
    "/special-contracts",
    "/leaderboard",
    "/terms",
    "/privacy",
    "/cookies",
    "/faq",
    "/onboarding",

    "/gallery",
    "/drivers",
    "/racing",
    "/feeds",
    "/lotto",
    "/scratchers",
    "/timezone",
    "/support-us",
    "/coupons",
    "/currency-boost",
    "/market",
    "/surveys",
    "/achievements",
    "/community-goals",
    "/kb",
  ];

  const staticRoutes = routePaths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  return [
    ...staticRoutes,
    ...jobEntries,
    ...teamEntries,
    ...contractEntries,
    ...convoyEntries,
    ...postEntries,
    ...profileEntries,
    ...surveyEntries,
    ...marketEntries,
    ...achievementEntries,
    ...ncEventEntries,
    ...couponEntries,
    ...communityGoalEntries,
    ...kbCategoryEntries,
    ...kbArticleEntries,
  ];
}
