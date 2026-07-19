import { MetadataRoute } from "next";
import clientPromise from "@/lib/mongodb";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://transport.nismara.web.id";

  const client = await clientPromise;
  const db = client.db();

  // 1. Ambil Data Dinamis dari MongoDB
  const [jobs, teams, contracts, convoylobby] = await Promise.all([
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
  ]);

  // 2. Map Jobs (/jobs/[jobId])
  // Tambahkan filter untuk memastikan jobId ada
  const jobEntries = jobs
    .filter((job) => job.jobId)
    .map((job) => ({
      url: `${baseUrl}/jobs/${job.jobId}`,
      lastModified: job.updatedAt || new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  // 3. Map Teams (/teams/[uri])
  // Tambahkan filter untuk memastikan uri ada
  const teamEntries = teams
    .filter((team) => team.uri)
    .map((team) => ({
      url: `${baseUrl}/teams/${team.uri}`,
      lastModified: team.updatedAt || new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  // 4. Map Special Contracts (/contracts/[slug])
  // Ini letak perbaikan utamanya: pastikan contractName ada sebelum di-lowercase
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

  const convoyEntries = convoylobby
    .filter((convoy) => convoy.convoyUri)
    .map((convoy) => ({
      url: `${baseUrl}/convoy/${convoy.convoyUri}`,
      lastModified: convoy.updatedAt || new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  // 5. Rute Statis
  const staticRoutes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/jobs`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/teams`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/convoy`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/special-contracts`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/leaderboard`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/cookies`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
  ];

  return [
    ...staticRoutes,
    ...jobEntries,
    ...teamEntries,
    ...contractEntries,
    ...convoyEntries,
  ];
}
