import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import AuditClient from "./AuditClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata = {
  title: "Audit Center & Data Integrity",
};

async function fetchAllDiscordMembers(guildId: string, botToken: string) {
  const members = new Map<string, { id: string; username: string; displayName: string; roles: string[]; joinedAt: string | null }>();
  let after = "0";
  let hasMore = true;

  try {
    while (hasMore) {
      const url = `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000${after !== "0" ? `&after=${after}` : ""}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
        cache: "no-store",
      });

      if (!res.ok) {
        console.error(`Gagal fetch Discord members: ${res.status}`);
        break;
      }

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) break;

      for (const m of data) {
        if (m.user?.id) {
          members.set(m.user.id, {
            id: m.user.id,
            username: m.user.username,
            displayName: m.user.global_name || m.nick || m.user.username,
            roles: m.roles || [],
            joinedAt: m.joined_at || null,
          });
        }
      }

      if (data.length < 1000) {
        hasMore = false;
      } else {
        after = data[data.length - 1].user.id;
      }
    }
  } catch (err) {
    console.error("Error fetching discord members for audit:", err);
  }

  return members;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "manager" && session.user.role !== "admin")) {
    redirect("/dashboard");
  }

  const resolvedParams = searchParams ? await searchParams : undefined;
  const requestedMonth = typeof resolvedParams?.month === "string" ? resolvedParams.month : undefined;

  const client = await clientPromise;
  const db = client.db();

  const GUILD_ID = process.env.DISCORD_GUILD_ID || "863959415702028318";
  const DRIVER_ROLE_ID = process.env.DISCORD_DRIVER_ROLE_ID || "1405532668472590437";
  const INTERN_ROLE_ID = process.env.DISCORD_INTERN_ROLE_ID || "1405533443651272804";
  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

  // 1. Fetch data dari Discord & MongoDB secara paralel
  const [discordMembers, driverLinks, allUsers] = await Promise.all([
    BOT_TOKEN ? fetchAllDiscordMembers(GUILD_ID, BOT_TOKEN) : Promise.resolve(new Map()),
    db.collection("driverlinks").find({ guildId: GUILD_ID }).toArray(),
    db.collection("users").find({}).toArray(),
  ]);

  const validDriverUserIds = new Set(driverLinks.map((dl) => String(dl.userId)));
  const validDriverTruckyIds = new Set(driverLinks.map((dl) => Number(dl.truckyId)));
  const validIdsArray = Array.from(validDriverUserIds);

  const usersByDiscordId = new Map<string, any>();
  for (const u of allUsers) {
    if (u.discordId) usersByDiscordId.set(String(u.discordId), u);
  }

  // 2. Deteksi Anomali Discord Roles
  const discordWithRoleNotDriverLink: any[] = [];
  let discordDriverCount = 0;
  let discordInternCount = 0;

  for (const [dId, member] of discordMembers.entries()) {
    const hasDriverRole = member.roles.includes(DRIVER_ROLE_ID);
    const hasInternRole = member.roles.includes(INTERN_ROLE_ID);

    if (hasDriverRole) discordDriverCount++;
    if (hasInternRole) discordInternCount++;

    if (hasDriverRole || hasInternRole) {
      if (!validDriverUserIds.has(dId)) {
        const webUser = usersByDiscordId.get(dId);
        discordWithRoleNotDriverLink.push({
          discordId: dId,
          username: member.username,
          displayName: member.displayName,
          roleType: hasDriverRole && hasInternRole ? "both" : hasDriverRole ? "driver" : "intern",
          roleLabel: hasDriverRole && hasInternRole ? "DRIVER + INTERN" : hasDriverRole ? "DRIVER" : "INTERN",
          joinedDiscord: member.joinedAt ? new Date(member.joinedAt).toISOString() : null,
          inWebDb: !!webUser,
          webName: webUser?.name || null,
          webIsDriver: webUser?.isDriver ?? null,
          webTruckyId: webUser?.truckyId || null,
        });
      }
    }
  }

  // 3. Deteksi User Web dengan isDriver: true tapi bukan driverlink
  const usersWithDriverFlagNotDriverLink: any[] = [];
  for (const u of allUsers) {
    if (u.isDriver === true && !validDriverUserIds.has(String(u.discordId))) {
      const dMember = discordMembers.get(String(u.discordId));
      usersWithDriverFlagNotDriverLink.push({
        _id: u._id.toString(),
        name: u.name || "Unknown",
        discordId: u.discordId,
        truckyId: u.truckyId || null,
        inDiscord: !!dMember,
        discordRoles: dMember ? dMember.roles : [],
        lastSeen: u.lastSeen ? new Date(u.lastSeen).toISOString() : null,
      });
    }
  }

  // 4. Deteksi DriverLinks yang keluar Discord atau kehilangan role
  const driverLinksMissingDiscord: any[] = [];
  const driverLinksMissingRole: any[] = [];

  for (const dl of driverLinks) {
    const dId = String(dl.userId);
    const dMember = discordMembers.get(dId);
    if (!dMember) {
      driverLinksMissingDiscord.push({
        truckyName: dl.truckyName,
        truckyId: dl.truckyId,
        discordId: dId,
        createdAt: dl.createdAt ? new Date(dl.createdAt).toISOString() : null,
      });
    } else {
      const hasDriver = dMember.roles.includes(DRIVER_ROLE_ID);
      const hasIntern = dMember.roles.includes(INTERN_ROLE_ID);
      if (!hasDriver && !hasIntern) {
        driverLinksMissingRole.push({
          truckyName: dl.truckyName,
          truckyId: dl.truckyId,
          discordId: dId,
          username: dMember.username,
          displayName: dMember.displayName,
        });
      }
    }
  }

  // 5. Agregasi Orphaned Histories & Balances (Data dari user yang sudah bukan driverlinks)
  const [chAgg, phAgg, currOrphans, ptsOrphans] = await Promise.all([
    db.collection("currencyhistories").aggregate([
      { $match: { guildId: GUILD_ID, userId: { $nin: validIdsArray } } },
      { $group: { _id: "$userId", count: { $sum: 1 }, lastDate: { $max: "$createdAt" } } },
    ]).toArray(),
    db.collection("pointhistories").aggregate([
      { $match: { guildId: GUILD_ID, userId: { $nin: validIdsArray } } },
      { $group: { _id: "$userId", count: { $sum: 1 }, lastDate: { $max: "$createdAt" } } },
    ]).toArray(),
    db.collection("currencies").find({ guildId: GUILD_ID, userId: { $nin: validIdsArray } }).toArray(),
    db.collection("points").find({ guildId: GUILD_ID, userId: { $nin: validIdsArray } }).toArray(),
  ]);

  // Gabungkan seluruh orphaned userId menjadi map
  const orphanMap = new Map<string, {
    discordId: string;
    userName: string | null;
    inDiscord: boolean;
    currencyHistoriesCount: number;
    pointHistoriesCount: number;
    ncBalance: number;
    pointBalance: number;
    lastDate: string | null;
  }>();

  for (const item of chAgg) {
    const id = String(item._id);
    if (!orphanMap.has(id)) {
      const webU = usersByDiscordId.get(id);
      const dMem = discordMembers.get(id);
      orphanMap.set(id, {
        discordId: id,
        userName: webU?.name || dMem?.displayName || dMem?.username || null,
        inDiscord: !!dMem,
        currencyHistoriesCount: 0,
        pointHistoriesCount: 0,
        ncBalance: 0,
        pointBalance: 0,
        lastDate: null,
      });
    }
    const rec = orphanMap.get(id)!;
    rec.currencyHistoriesCount = item.count;
    if (item.lastDate) {
      rec.lastDate = new Date(item.lastDate).toISOString();
    }
  }

  for (const item of phAgg) {
    const id = String(item._id);
    if (!orphanMap.has(id)) {
      const webU = usersByDiscordId.get(id);
      const dMem = discordMembers.get(id);
      orphanMap.set(id, {
        discordId: id,
        userName: webU?.name || dMem?.displayName || dMem?.username || null,
        inDiscord: !!dMem,
        currencyHistoriesCount: 0,
        pointHistoriesCount: 0,
        ncBalance: 0,
        pointBalance: 0,
        lastDate: null,
      });
    }
    const rec = orphanMap.get(id)!;
    rec.pointHistoriesCount = item.count;
    if (item.lastDate && (!rec.lastDate || new Date(item.lastDate) > new Date(rec.lastDate))) {
      rec.lastDate = new Date(item.lastDate).toISOString();
    }
  }

  for (const c of currOrphans) {
    const id = String(c.userId);
    if (!orphanMap.has(id)) {
      const webU = usersByDiscordId.get(id);
      const dMem = discordMembers.get(id);
      orphanMap.set(id, {
        discordId: id,
        userName: webU?.name || dMem?.displayName || dMem?.username || null,
        inDiscord: !!dMem,
        currencyHistoriesCount: 0,
        pointHistoriesCount: 0,
        ncBalance: 0,
        pointBalance: 0,
        lastDate: null,
      });
    }
    orphanMap.get(id)!.ncBalance = c.totalNC || 0;
  }

  for (const p of ptsOrphans) {
    const id = String(p.userId);
    if (!orphanMap.has(id)) {
      const webU = usersByDiscordId.get(id);
      const dMem = discordMembers.get(id);
      orphanMap.set(id, {
        discordId: id,
        userName: webU?.name || dMem?.displayName || dMem?.username || null,
        inDiscord: !!dMem,
        currencyHistoriesCount: 0,
        pointHistoriesCount: 0,
        ncBalance: 0,
        pointBalance: 0,
        lastDate: null,
      });
    }
    orphanMap.get(id)!.pointBalance = p.totalPoints || 0;
  }

  const orphanedDataList = Array.from(orphanMap.values()).sort((a, b) => {
    // Sort by largest activity first
    const aTotal = a.currencyHistoriesCount + a.pointHistoriesCount;
    const bTotal = b.currencyHistoriesCount + b.pointHistoriesCount;
    return bTotal - aTotal;
  });

  const totalOrphanedNCLogs = orphanedDataList.reduce((acc, o) => acc + o.currencyHistoriesCount, 0);
  const totalOrphanedPointLogs = orphanedDataList.reduce((acc, o) => acc + o.pointHistoriesCount, 0);
  const totalOrphanedCurrAccounts = currOrphans.length;
  const totalOrphanedPointAccounts = ptsOrphans.length;

  const totalCurrencyCount = await db.collection("currencies").countDocuments({ guildId: GUILD_ID });
  const totalPointsCount = await db.collection("points").countDocuments({ guildId: GUILD_ID });

  // 6. Tracker Kepatuhan Minimum KM (2.500 KM / Bulan)
  const MONTH_NAMES: Record<string, string> = {
    "01": "Januari",
    "02": "Februari",
    "03": "Maret",
    "04": "April",
    "05": "Mei",
    "06": "Juni",
    "07": "Juli",
    "08": "Agustus",
    "09": "September",
    "10": "Oktober",
    "11": "November",
    "12": "Desember",
  };

  function getMonthLabel(key: string) {
    const parts = key.split("-");
    const name = MONTH_NAMES[parts[1]] || parts[1];
    return `${name} ${parts[0]}`;
  }

  // Agregasi seluruh bulan yang tersedia di jobhistories (hanya job COMPLETED yang valid)
  const rawMonths = await db
    .collection("jobhistories")
    .aggregate([
      {
        $match: {
          jobStatus: "COMPLETED",
          cancelPenaltyApplied: { $ne: true },
        },
      },
      {
        $project: {
          date: { $ifNull: ["$completedAt", "$createdAt"] },
        },
      },
      {
        $project: {
          monthKey: {
            $dateToString: {
              format: "%Y-%m",
              date: "$date",
              timezone: "Asia/Jakarta",
            },
          },
        },
      },
      {
        $group: { _id: "$monthKey", count: { $sum: 1 } },
      },
      { $sort: { _id: -1 } },
    ])
    .toArray();

  const availableMonths = rawMonths
    .filter((rm) => rm._id && typeof rm._id === "string" && rm._id.includes("-"))
    .map((rm) => ({
      monthKey: rm._id as string,
      label: getMonthLabel(rm._id as string),
      jobCount: Number(rm.count) || 0,
    }));

  let selectedMonth = "2026-08";
  if (requestedMonth && availableMonths.some((m) => m.monthKey === requestedMonth)) {
    selectedMonth = requestedMonth;
  } else if (availableMonths.some((m) => m.monthKey === "2026-08")) {
    selectedMonth = "2026-08";
  } else if (availableMonths.length > 0) {
    selectedMonth = availableMonths[0].monthKey;
  }

  const selectedMonthLabel = getMonthLabel(selectedMonth);

  const [sYear, sMonth] = selectedMonth.split("-").map(Number);
  const startWib = new Date(`${sYear}-${String(sMonth).padStart(2, "0")}-01T00:00:00+07:00`);
  const eYear = sMonth === 12 ? sYear + 1 : sYear;
  const eMonth = sMonth === 12 ? 1 : sMonth + 1;
  const endWib = new Date(`${eYear}-${String(eMonth).padStart(2, "0")}-01T00:00:00+07:00`);

  const [monthlyJobStats, leavesInPeriod, existingKmPenalties] = await Promise.all([
    db
      .collection("jobhistories")
      .aggregate([
        {
          $match: {
            jobStatus: "COMPLETED",
            cancelPenaltyApplied: { $ne: true },
            $or: [
              { completedAt: { $gte: startWib, $lt: endWib } },
              { completedAt: { $exists: false }, createdAt: { $gte: startWib, $lt: endWib } },
              { completedAt: null, createdAt: { $gte: startWib, $lt: endWib } },
            ],
          },
        },
        {
          $group: {
            _id: { $ifNull: ["$driverId", "$truckyId"] },
            totalKm: { $sum: { $ifNull: ["$distanceKm", 0] } },
            totalJobs: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    db
      .collection("leavehistories")
      .find({
        startDate: { $lt: endWib },
        endDate: { $gte: startWib },
      })
      .toArray(),
    db
      .collection("pointhistories")
      .find({
        guildId: GUILD_ID,
        $or: [
          { monthKey: selectedMonth, penaltyCode: "MIN_KM_VIOLATION" },
          { reason: { $regex: selectedMonth, $options: "i" }, type: "add" },
          { reason: { $regex: selectedMonthLabel, $options: "i" }, type: "add" },
        ],
      })
      .toArray(),
  ]);

  const jobStatsMap = new Map<string, { totalKm: number; totalJobs: number }>();
  for (const s of monthlyJobStats) {
    if (s._id) {
      jobStatsMap.set(String(s._id), {
        totalKm: Math.round(Number(s.totalKm) || 0),
        totalJobs: Number(s.totalJobs) || 0,
      });
    }
  }

  const leaveByUserId = new Map<string, any>();
  for (const lh of leavesInPeriod) {
    if (lh.userId) leaveByUserId.set(String(lh.userId), lh);
    if (lh.truckyId) leaveByUserId.set(String(lh.truckyId), lh);
  }

  const penaltyByUserId = new Map<string, any>();
  for (const p of existingKmPenalties) {
    if (p.userId) penaltyByUserId.set(String(p.userId), p);
  }

  const kmDriverRows = driverLinks.map((dl) => {
    const discordId = String(dl.userId);
    const truckyIdStr = String(dl.truckyId);
    const webUser = usersByDiscordId.get(discordId);
    const discordMember = discordMembers.get(discordId);
    const jobInfo = jobStatsMap.get(discordId) || jobStatsMap.get(truckyIdStr) || { totalKm: 0, totalJobs: 0 };
    const totalKm = jobInfo.totalKm;
    const isCompliant = totalKm >= 2500;

    const leaveRecord = leaveByUserId.get(discordId) || leaveByUserId.get(truckyIdStr);
    const isOnLeave = Boolean(webUser?.isOnLeave || leaveRecord);

    const penalty = penaltyByUserId.get(discordId);
    const isAlreadyPenalized = Boolean(penalty);

    let joinedAtDate: Date | null = null;
    if (dl.createdAt) {
      joinedAtDate = new Date(dl.createdAt);
    } else if (webUser?.createdAt) {
      joinedAtDate = new Date(webUser.createdAt);
    }
    const joinedInAuditMonth = joinedAtDate ? joinedAtDate >= startWib && joinedAtDate < endWib : false;

    let leaveDateRange: string | null = null;
    if (leaveRecord?.startDate && leaveRecord?.endDate) {
      const sStr = new Date(leaveRecord.startDate).toLocaleDateString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "numeric",
        month: "short",
      });
      const eStr = new Date(leaveRecord.endDate).toLocaleDateString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      leaveDateRange = `${sStr} - ${eStr}`;
    }

    return {
      userId: discordId,
      truckyId: dl.truckyId,
      driverName: dl.truckyName || webUser?.name || discordMember?.displayName || "Driver",
      avatarUrl: webUser?.image || null,
      totalKm,
      totalJobs: jobInfo.totalJobs,
      isCompliant,
      isOnLeave,
      leaveReason: leaveRecord?.reason || (webUser?.isOnLeave ? "Sedang dalam status cuti resmi" : null),
      leaveDateRange,
      isAlreadyPenalized,
      penaltyRecord: penalty
        ? {
            points: penalty.points || 5,
            createdAt: penalty.createdAt ? new Date(penalty.createdAt).toISOString() : new Date().toISOString(),
            reason: penalty.reason || "",
          }
        : null,
      joinedAt: joinedAtDate ? joinedAtDate.toISOString() : null,
      joinedInAuditMonth,
    };
  });

  // Sort rows: pending penalty first, then on-leave, then already penalized, then compliant (highest KM first)
  kmDriverRows.sort((a, b) => {
    // 1. Pending penalty (violating, not on leave, not penalized)
    const aPending = !a.isCompliant && !a.isOnLeave && !a.isAlreadyPenalized;
    const bPending = !b.isCompliant && !b.isOnLeave && !b.isAlreadyPenalized;
    if (aPending && !bPending) return -1;
    if (!aPending && bPending) return 1;

    // 2. Already penalized
    const aPenalized = !a.isCompliant && a.isAlreadyPenalized;
    const bPenalized = !b.isCompliant && b.isAlreadyPenalized;
    if (aPenalized && !bPenalized) return -1;
    if (!aPenalized && bPenalized) return 1;

    // 3. On leave
    if (a.isOnLeave && !b.isOnLeave) return -1;
    if (!a.isOnLeave && b.isOnLeave) return 1;

    // 4. By distance descending
    return b.totalKm - a.totalKm;
  });

  const compliantDrivers = kmDriverRows.filter((r) => r.isCompliant).length;
  const violatingDrivers = kmDriverRows.filter((r) => !r.isCompliant).length;
  const onLeaveDrivers = kmDriverRows.filter((r) => !r.isCompliant && r.isOnLeave).length;
  const alreadyPenalizedDrivers = kmDriverRows.filter((r) => !r.isCompliant && !r.isOnLeave && r.isAlreadyPenalized).length;
  const pendingPenaltyDrivers = kmDriverRows.filter((r) => !r.isCompliant && !r.isOnLeave && !r.isAlreadyPenalized).length;
  const totalAuditJobs = kmDriverRows.reduce((acc, r) => acc + r.totalJobs, 0);
  const totalAuditKm = kmDriverRows.reduce((acc, r) => acc + r.totalKm, 0);

  const kmAuditData = {
    selectedMonth,
    selectedMonthLabel,
    targetKm: 2500,
    availableMonths,
    summary: {
      totalDrivers: kmDriverRows.length,
      compliantDrivers,
      violatingDrivers,
      onLeaveDrivers,
      alreadyPenalizedDrivers,
      pendingPenaltyDrivers,
      totalAuditJobs,
      totalAuditKm,
    },
    drivers: kmDriverRows,
  };

  return (
    <AuditClient
      stats={{
        totalDiscordMembers: discordMembers.size,
        totalDriverLinks: driverLinks.length,
        totalWebUsers: allUsers.length,
        discordDriverCount,
        discordInternCount,
        totalCurrencyRecords: totalCurrencyCount,
        totalPointsRecords: totalPointsCount,
        totalOrphanedAccounts: orphanedDataList.length,
        totalOrphanedNCLogs,
        totalOrphanedPointLogs,
        totalOrphanedCurrAccounts,
        totalOrphanedPointAccounts,
      }}
      discordRoleAnomalies={discordWithRoleNotDriverLink}
      usersIsDriverAnomalies={usersWithDriverFlagNotDriverLink}
      driverLinksMissingDiscord={driverLinksMissingDiscord}
      driverLinksMissingRole={driverLinksMissingRole}
      orphanedDataList={orphanedDataList}
      kmAuditData={kmAuditData}
    />
  );
}
