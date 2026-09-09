import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const MONGODB_URI = process.env.MONGODB_URI;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || "863959415702028318";
const DRIVER_ROLE_ID = process.env.DISCORD_DRIVER_ROLE_ID || "1405532668472590437";
const INTERN_ROLE_ID = process.env.DISCORD_INTERN_ROLE_ID || "1405533443651272804";

async function fetchAllDiscordMembers(guildId, botToken) {
  const members = new Map();
  let after = "0";
  let hasMore = true;

  console.log(`[1/3] Mengambil seluruh member dari server Discord (Guild: ${guildId})...`);

  while (hasMore) {
    const url = `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000${after !== "0" ? `&after=${after}` : ""}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    });

    if (!res.ok) {
      console.error(`❌ Gagal mengambil member Discord: ${res.status} ${res.statusText}`);
      break;
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      break;
    }

    for (const m of data) {
      if (m.user?.id) {
        members.set(m.user.id, {
          id: m.user.id,
          username: m.user.username,
          globalName: m.user.global_name || m.user.username,
          nick: m.nick || null,
          roles: m.roles || [],
          joinedAt: m.joined_at,
        });
      }
    }

    if (data.length < 1000) {
      hasMore = false;
    } else {
      after = data[data.length - 1].user.id;
    }
  }

  console.log(` -> Berhasil mengambil ${members.size} member Discord.`);
  return members;
}

async function runAudit() {
  if (!MONGODB_URI || !DISCORD_BOT_TOKEN) {
    console.error("❌ MONGODB_URI atau DISCORD_BOT_TOKEN tidak ditemukan!");
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();

    console.log("================================================================================");
    console.log("🔍 AUDIT STATUS DRIVER & INTERN: DISCORD ROLES vs DRIVERLINKS vs USERS DB");
    console.log("================================================================================\n");
    console.log(`Config:`);
    console.log(` - Guild ID        : ${DISCORD_GUILD_ID}`);
    console.log(` - Driver Role ID  : ${DRIVER_ROLE_ID}`);
    console.log(` - Intern Role ID  : ${INTERN_ROLE_ID}\n`);

    // 1. Fetch Discord Members
    const discordMembers = await fetchAllDiscordMembers(DISCORD_GUILD_ID, DISCORD_BOT_TOKEN);

    // 2. Fetch driverlinks
    console.log(`[2/3] Mengambil data driverlinks dari MongoDB...`);
    const driverLinks = await db
      .collection("driverlinks")
      .find({ guildId: DISCORD_GUILD_ID })
      .toArray();
    console.log(` -> Ditemukan ${driverLinks.length} record driverlinks resmi.`);

    const driverLinksByDiscordId = new Map();
    for (const dl of driverLinks) {
      if (dl.userId) {
        driverLinksByDiscordId.set(String(dl.userId), dl);
      }
    }

    // 3. Fetch users
    console.log(`[3/3] Mengambil data users dari MongoDB...`);
    const dbUsers = await db.collection("users").find({}).toArray();
    console.log(` -> Ditemukan ${dbUsers.length} user terdaftar di web.\n`);

    const usersByDiscordId = new Map();
    for (const u of dbUsers) {
      if (u.discordId) {
        usersByDiscordId.set(String(u.discordId), u);
      }
    }

    // ================================================================================
    // AUDIT 1: MEMBER DISCORD DENGAN ROLE DRIVER/INTERN TETAPI TIDAK ADA DI DRIVERLINKS
    // ================================================================================
    const discordWithRoleNotDriverLink = [];
    const discordDriversCount = { driver: 0, intern: 0, both: 0 };

    for (const [dId, member] of discordMembers.entries()) {
      const hasDriverRole = member.roles.includes(DRIVER_ROLE_ID);
      const hasInternRole = member.roles.includes(INTERN_ROLE_ID);

      if (hasDriverRole || hasInternRole) {
        if (hasDriverRole && hasInternRole) discordDriversCount.both++;
        else if (hasDriverRole) discordDriversCount.driver++;
        else discordDriversCount.intern++;

        const isLinked = driverLinksByDiscordId.has(dId);
        if (!isLinked) {
          const webUser = usersByDiscordId.get(dId);
          discordWithRoleNotDriverLink.push({
            discordId: dId,
            username: member.username,
            displayName: member.globalName || member.nick || member.username,
            roleType: hasDriverRole && hasInternRole ? "DRIVER + INTERN" : hasDriverRole ? "DRIVER" : "INTERN",
            joinedDiscord: member.joinedAt ? new Date(member.joinedAt).toLocaleDateString("id-ID") : "-",
            inWebDb: !!webUser,
            webName: webUser?.name || "-",
            webIsDriver: webUser?.isDriver ?? "-",
            webTruckyId: webUser?.truckyId || "-",
          });
        }
      }
    }

    // ================================================================================
    // AUDIT 2: USERS DI DATABASE DENGAN isDriver: true TETAPI TIDAK ADA DI DRIVERLINKS
    // ================================================================================
    const usersIsDriverNotDriverLink = [];

    for (const u of dbUsers) {
      if (u.isDriver === true) {
        const dId = String(u.discordId);
        const isLinked = driverLinksByDiscordId.has(dId);
        if (!isLinked) {
          const discordMember = discordMembers.get(dId);
          const hasDriverRole = discordMember?.roles?.includes(DRIVER_ROLE_ID);
          const hasInternRole = discordMember?.roles?.includes(INTERN_ROLE_ID);

          usersIsDriverNotDriverLink.push({
            name: u.name || "(No Name)",
            discordId: dId,
            truckyId: u.truckyId || "-",
            inDiscord: !!discordMember,
            discordRoleType: discordMember ? (hasDriverRole && hasInternRole ? "DRIVER + INTERN" : hasDriverRole ? "DRIVER" : hasInternRole ? "INTERN" : "TIDAK ADA ROLE DRIVER") : "SUDAH KELUAR SERVER",
            discordRole: u.discordRole || u.role || "-",
            lastSeen: u.lastSeen ? new Date(u.lastSeen).toLocaleDateString("id-ID") : "-",
          });
        }
      }
    }

    // ================================================================================
    // AUDIT 3 (BONUS INSIGHT): DRIVERLINK YANG TIDAK MEMILIKI ROLE DRIVER / KELUAR SERVER
    // ================================================================================
    const driverLinksMissingRole = [];
    const driverLinksLeftDiscord = [];

    for (const dl of driverLinks) {
      const dId = String(dl.userId);
      const discordMember = discordMembers.get(dId);
      if (!discordMember) {
        driverLinksLeftDiscord.push(dl);
      } else {
        const hasDriverRole = discordMember.roles.includes(DRIVER_ROLE_ID);
        const hasInternRole = discordMember.roles.includes(INTERN_ROLE_ID);
        if (!hasDriverRole && !hasInternRole) {
          driverLinksMissingRole.push({
            truckyName: dl.truckyName,
            truckyId: dl.truckyId,
            discordId: dId,
            discordUsername: discordMember.username,
          });
        }
      }
    }

    // ================================================================================
    // CETAK LAPORAN LENGKAP
    // ================================================================================
    console.log("================================================================================");
    console.log("📋 RINGKASAN STATISTIK AUDIT");
    console.log("================================================================================");
    console.log(`- Total Member di Server Discord      : ${discordMembers.size} Orang`);
    console.log(`- Member Discord Ber-role Driver      : ${discordDriversCount.driver + discordDriversCount.both} Orang`);
    console.log(`- Member Discord Ber-role Intern      : ${discordDriversCount.intern + discordDriversCount.both} Orang`);
    console.log(`- Total DriverLinks di Database       : ${driverLinks.length} Driver`);
    console.log(`- Total Users di Database Web         : ${dbUsers.length} User`);
    console.log(`- Users dengan isDriver: true         : ${dbUsers.filter(u => u.isDriver === true).length} User\n`);

    console.log("--------------------------------------------------------------------------------");
    console.log(`🚨 HASIL 1: Member Discord dengan Role Driver/Intern tetapi BUKAN DriverLinks: ${discordWithRoleNotDriverLink.length} Orang`);
    console.log("--------------------------------------------------------------------------------");
    if (discordWithRoleNotDriverLink.length > 0) {
      console.table(discordWithRoleNotDriverLink);
    } else {
      console.log("✅ Bersih! Semua pemilik role Driver dan Intern di Discord sudah terdaftar di driverlinks.\n");
    }

    console.log("\n--------------------------------------------------------------------------------");
    console.log(`🚨 HASIL 2: User di DB (isDriver: true) tetapi TIDAK ADA di driverlinks: ${usersIsDriverNotDriverLink.length} User`);
    console.log("--------------------------------------------------------------------------------");
    if (usersIsDriverNotDriverLink.length > 0) {
      console.table(usersIsDriverNotDriverLink);
    } else {
      console.log("✅ Bersih! Semua user berstatus isDriver: true di database sudah memiliki record driverlinks.\n");
    }

    console.log("\n--------------------------------------------------------------------------------");
    console.log(`⚠️ INSIGHT TAMBAHAN: DriverLinks yang SUDAH KELUAR dari Discord: ${driverLinksLeftDiscord.length} Orang`);
    console.log("--------------------------------------------------------------------------------");
    if (driverLinksLeftDiscord.length > 0) {
      console.table(driverLinksLeftDiscord.map(dl => ({
        TruckyName: dl.truckyName,
        TruckyID: dl.truckyId,
        DiscordID: dl.userId,
        CreatedAt: dl.createdAt ? new Date(dl.createdAt).toLocaleDateString("id-ID") : "-",
      })));
    }

    console.log("\n--------------------------------------------------------------------------------");
    console.log(`⚠️ INSIGHT TAMBAHAN: DriverLinks di Discord tetapi TIDAK MEMILIKI Role Driver/Intern: ${driverLinksMissingRole.length} Orang`);
    console.log("--------------------------------------------------------------------------------");
    if (driverLinksMissingRole.length > 0) {
      console.table(driverLinksMissingRole);
    }

  } catch (err) {
    console.error("❌ Error running audit:", err);
  } finally {
    await client.close();
  }
}

runAudit();
