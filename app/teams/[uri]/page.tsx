import clientPromise from "@/lib/mongodb";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth"; // Wajib untuk cek session
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Sesuaikan path ini
import TeamProfileUI from "./TeamProfileUI";





interface PageProps {
  params: Promise<{
    uri: string;
  }>;
}

export const revalidate = 60;

export default async function TeamDetailPage({ params }: PageProps) {
  try {
    const resolvedParams = await params;
    const uri = decodeURIComponent(resolvedParams.uri).toLowerCase();

    const client = await clientPromise;
    const db = client.db();
    const session = await getServerSession(authOptions); // Ambil session visitor

    // 1. Cari tim berdasarkan URI
    const teamRaw = await db.collection("teams").findOne({ uri: uri });

    if (!teamRaw) {
      return notFound();
    }

    // 2. Ambil data User yang sedang login (untuk identifikasi Join/Owner)
    const currentUser = session?.user?.email
      ? await db.collection("users").findOne({ email: session.user.email })
      : null;
    const currentUserId = currentUser?._id.toString();

    // 3. Ekstraksi ID Member Aman
    const rawMembers = teamRaw.members || [];
    const validMemberIdsObj: ObjectId[] = [];
    const validMemberIdsStr: string[] = [];

    rawMembers.forEach((id: any) => {
      let strId = "";
      if (typeof id === "string") strId = id;
      else if (id && typeof id === "object") {
        strId = id.$oid || id.toString();
      }

      if (strId) {
        validMemberIdsStr.push(strId);
        try {
          validMemberIdsObj.push(new ObjectId(strId));
        } catch (e) {}
      }
    });

    // Buat filter dengan tipe Filter<any> untuk fleksibilitas
    const memberFilter: any = {
      $or: [
        { _id: { $in: validMemberIdsObj } },
        { _id: { $in: validMemberIdsStr } },
      ],
    };

    const membersRaw = await db
      .collection("users")
      .find(memberFilter)
      .toArray();

    const teamTotalXp = membersRaw.reduce(
      (acc, curr) => acc + (curr.xp || 0),
      0,
    );
    const XP_PER_LEVEL = 10000; // Ambang batas XP per level tim
    const teamLevel = Math.floor(teamTotalXp / XP_PER_LEVEL) + 1;
    const progressToNextLevel =
      (teamTotalXp % XP_PER_LEVEL) / (XP_PER_LEVEL / 100);

    // 5. Logic Recent Jobs Tangguh
    // Memberikan tipe data eksplisit agar build tidak error
    const validTruckyIds: (string | number)[] = [];
    const validDiscordIds: string[] = [];

    membersRaw.forEach((user) => {
      if (user.truckyId) {
        validTruckyIds.push(String(user.truckyId));
        if (!isNaN(Number(user.truckyId)))
          validTruckyIds.push(Number(user.truckyId));
      }
      if (user.discordId) validDiscordIds.push(String(user.discordId));
      if (user.driverId) validDiscordIds.push(String(user.driverId));
    });

    // Berikan tipe any[] agar fleksibel menerima data dari MongoDB
    let recentJobsRaw: any[] = [];
    if (membersRaw.length > 0) {
      recentJobsRaw = await db
        .collection("jobhistories")
        .find({
          jobStatus: { $regex: /^completed$/i },
          $or: [
            { truckyId: { $in: validTruckyIds as any } }, // Gunakan as any jika TS masih protes
            { driverId: { $in: validDiscordIds as any } },
          ],
        })
        .sort({ completedAt: -1 })
        .limit(20)
        .toArray();
    }

    // 6. Serialisasi Akhir & Penentuan Role
    const isOwner = teamRaw.owner?.toString() === currentUserId;

    const team = {
      ...teamRaw,
      _id: teamRaw._id.toString(),
      owner: teamRaw.owner?.toString() || null,
      totalXp: teamTotalXp,
      level: teamLevel,
      progress: progressToNextLevel,
      members: undefined, // Bersihkan agar tidak double payload
      createdAt: teamRaw.createdAt?.toISOString() || null,
      updatedAt: teamRaw.updatedAt?.toISOString() || null,
    };

    const members = membersRaw.map((m) => ({
      ...m,
      _id: m._id.toString(),
      // PERBAIKAN: teamId harus diubah menjadi string
      teamId: m.teamId ? m.teamId.toString() : null,
      // Pastikan tanggal juga aman jika ada
      updatedAt: m.updatedAt instanceof Date ? m.updatedAt.toISOString() : null,
      lastSeen: m.lastSeen instanceof Date ? m.lastSeen.toISOString() : null,
    }));

    const recentJobs = recentJobsRaw.map((job) => {
      const driver = membersRaw.find(
        (m) =>
          String(m.truckyId) === String(job.truckyId) ||
          String(m.discordId) === String(job.driverId),
      );
      return {
        ...job,
        _id: job._id.toString(),
        driverName: driver?.name || "Unknown Driver",
        driverImage: driver?.image || null,
        completedAt: job.completedAt ? job.completedAt.toISOString() : null,
      };
    });

    return (
      <TeamProfileUI
        team={team}
        members={members}
        recentJobs={recentJobs}
        isOwner={isOwner}
        currentUserId={currentUserId}
      />
    );
  } catch (error) {
    console.error("Gagal mengambil data tim:", error);
    return <div className="p-10 text-center">Error loading team data.</div>;
  }
}
