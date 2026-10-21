import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import HaulMPManageClient from "./HaulMPManageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata = {
  title: "Kelola Driver HaulMP",
  robots: { index: false, follow: false },
};

export default async function HaulMPManagePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = session.user?.role;
  if (role !== "manager" && role !== "admin") {
    redirect("/dashboard");
  }

  const client = await clientPromise;
  const db = client.db();

  // 1. Ambil driver aktif HaulMP
  const activeDriversDocs = await db
    .collection("users")
    .find(
      { isHaulmpDriver: true },
      {
        projection: {
          name: 1,
          discordId: 1,
          truckyId: 1,
          image: 1,
          haulmpId: 1,
          isHaulmpDriver: 1,
          isDriver: 1,
          updatedAt: 1,
        },
      }
    )
    .sort({ updatedAt: -1 })
    .toArray();

  const seenActiveDiscord = new Set<string>();
  const uniqueActiveDrivers = activeDriversDocs.filter((d: any) => {
    const id = String(d.discordId || "");
    if (!id || seenActiveDiscord.has(id)) return false;
    seenActiveDiscord.add(id);
    return true;
  });

  // 2. Ambil semua riwayat pengajuan HaulMP
  const applicationsDocs = await db
    .collection("haulmp_applications")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  // Populate reviewerName jika belum ada di dokumen aplikasi
  const missingReviewerDiscordIds = applicationsDocs
    .filter((a: any) => !a.reviewerName && a.reviewedBy)
    .map((a: any) => a.reviewedBy);

  if (missingReviewerDiscordIds.length > 0) {
    const reviewers = await db
      .collection("users")
      .find({ discordId: { $in: missingReviewerDiscordIds } })
      .project({ discordId: 1, name: 1 })
      .toArray();
    const reviewerMap = new Map(reviewers.map((r: any) => [r.discordId, r.name]));
    for (const app of applicationsDocs) {
      if (!app.reviewerName && app.reviewedBy) {
        const resolvedName = reviewerMap.get(app.reviewedBy) || "Manager";
        app.reviewerName = resolvedName;
        // Simpan permanen ke database agar konsisten
        db.collection("haulmp_applications")
          .updateOne({ _id: app._id }, { $set: { reviewerName: resolvedName } })
          .catch(() => {});
      }
    }
  }

  // 3. Ambil daftar semua driver terverifikasi untuk dropdown tambah manual (Deduplikasi discordId)
  const allVerifiedDriversDocs = await db
    .collection("users")
    .find(
      { isDriver: true },
      {
        projection: {
          name: 1,
          discordId: 1,
          truckyId: 1,
          image: 1,
          isHaulmpDriver: 1,
          updatedAt: 1,
        },
      }
    )
    .sort({ updatedAt: -1 })
    .toArray();

  const seenVerifiedDiscord = new Set<string>();
  const uniqueVerifiedDrivers = allVerifiedDriversDocs.filter((d: any) => {
    const id = String(d.discordId || "");
    if (!id || seenVerifiedDiscord.has(id)) return false;
    seenVerifiedDiscord.add(id);
    return true;
  });

  const initialActiveDrivers = JSON.parse(JSON.stringify(uniqueActiveDrivers));
  const initialApplications = JSON.parse(JSON.stringify(applicationsDocs));
  const allVerifiedDrivers = JSON.parse(JSON.stringify(uniqueVerifiedDrivers));

  return (
    <HaulMPManageClient
      initialActiveDrivers={initialActiveDrivers}
      initialApplications={initialApplications}
      allVerifiedDrivers={allVerifiedDrivers}
    />
  );
}
