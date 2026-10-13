import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const MONGODB_URI = process.env.MONGODB_URI;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || "863959415702028318";
const TRUCKY_API_KEY = process.env.TRUCKY_API_KEY;
const TRUCKY_COMPANY_ID = process.env.TRUCKY_COMPANY_ID || 35643;

async function fetchAllDiscordMembers(guildId: string, botToken: string) {
  const members = new Map<string, { id: string; username: string; globalName: string; roles: string[]; joinedAt: string }>();
  let after = "0";
  let hasMore = true;

  console.log(`[1/3] Fetching Discord guild members (Guild ID: ${guildId})...`);

  while (hasMore) {
    const url = `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000${after !== "0" ? `&after=${after}` : ""}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    });

    if (!res.ok) {
      console.error(`Failed to fetch Discord members: ${res.status} ${res.statusText}`);
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

  console.log(` -> Found ${members.size} Discord members in guild.`);
  return members;
}

async function fetchAllTruckyMembers(companyId: string | number, apiKey: string) {
  const members = new Map<number, { id: number; username: string; role: string; steamId?: string }>();
  let page = 1;
  let lastPage = 1;

  console.log(`[2/3] Fetching Trucky VTC members (Company ID: ${companyId})...`);

  do {
    const res = await fetch(`https://e.truckyapp.com/api/v1/company/${companyId}/members?page=${page}`, {
      headers: {
        "x-access-token": apiKey,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      console.error(`Failed to fetch Trucky members page ${page}: ${res.status}`);
      break;
    }

    const json = await res.json();
    lastPage = json.last_page || 1;

    if (Array.isArray(json.data)) {
      for (const m of json.data) {
        members.set(m.id, {
          id: m.id,
          username: m.username,
          role: m.role?.name || (typeof m.role === "string" ? m.role : "Driver"),
          steamId: m.steam_id,
        });
      }
    }
    page++;
  } while (page <= lastPage);

  console.log(` -> Found ${members.size} Trucky VTC drivers.`);
  return members;
}

async function runAudit() {
  if (!MONGODB_URI) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
  }
  if (!DISCORD_BOT_TOKEN) {
    console.error("Missing DISCORD_BOT_TOKEN");
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();

    console.log("================================================================================");
    console.log("🔍 NISMARA AUDIT: DATABASE USERS vs TRUCKY VTC vs DISCORD GUILD MEMBERS");
    console.log("================================================================================\n");

    // 1. Discord Members
    const discordMembers = await fetchAllDiscordMembers(DISCORD_GUILD_ID, DISCORD_BOT_TOKEN);

    // 2. Trucky Members
    let truckyMembers = new Map<number, any>();
    if (TRUCKY_API_KEY) {
      truckyMembers = await fetchAllTruckyMembers(TRUCKY_COMPANY_ID, TRUCKY_API_KEY);
    } else {
      console.warn("⚠️ TRUCKY_API_KEY is not set. Skipping live Trucky API fetch.");
    }

    // 3. Database Users
    console.log(`[3/3] Fetching users from MongoDB...`);
    const dbUsers = await db.collection("users").find({}).toArray();
    console.log(` -> Found ${dbUsers.length} total users registered in Database.\n`);

    const dbUsersByDiscordId = new Map<string, any>();
    const dbUsersByTruckyId = new Map<number, any>();

    for (const u of dbUsers) {
      if (u.discordId) {
        dbUsersByDiscordId.set(String(u.discordId), u);
      }
      if (u.truckyId) {
        dbUsersByTruckyId.set(Number(u.truckyId), u);
      }
    }

    console.log("================================================================================");
    console.log("📊 HASIL ANALISIS ANOMALI");
    console.log("================================================================================\n");

    // ANOMALI 1: DRIVER RESMI (isDriver: true) DI DATABASE YANG SUDAH TIDAK ADA DI DISCORD
    const officialDriversNotInDiscord: any[] = [];
    const allUsersNotInDiscord: any[] = [];

    for (const u of dbUsers) {
      const dId = String(u.discordId);
      if (!discordMembers.has(dId)) {
        allUsersNotInDiscord.push(u);
        if (u.isDriver) {
          officialDriversNotInDiscord.push(u);
        }
      }
    }

    console.log(`🚨 [ANOMALI 1] Driver Resmi (isDriver: true di Web) yang TIDAK ADA di Discord Server: ${officialDriversNotInDiscord.length} User`);
    if (officialDriversNotInDiscord.length > 0) {
      console.table(
        officialDriversNotInDiscord.map((u, i) => ({
          No: i + 1,
          Name: u.name || "(No Name)",
          DiscordID: u.discordId,
          TruckyID: u.truckyId || "-",
          Role: u.discordRole || u.role || "-",
          LastSeen: u.lastSeen ? new Date(u.lastSeen).toLocaleDateString("id-ID") : "-",
        }))
      );
    } else {
      console.log(" ✅ Semua driver resmi berstatus aktif di Discord server.\n");
    }

    // ANOMALI 2: MEMBER TRUCKY VTC YANG TIDAK ADA DI DISCORD SERVER (atau belum link akun)
    const truckyNotInDiscord: any[] = [];
    const truckyNotLinkedToDb: any[] = [];

    for (const [tId, tMember] of truckyMembers.entries()) {
      const linkedUser = dbUsersByTruckyId.get(tId);
      if (!linkedUser) {
        truckyNotLinkedToDb.push(tMember);
      } else {
        const dId = String(linkedUser.discordId);
        if (!discordMembers.has(dId)) {
          truckyNotInDiscord.push({
            ...tMember,
            linkedDiscordId: dId,
            linkedDbName: linkedUser.name,
          });
        }
      }
    }

    console.log(`\n🚨 [ANOMALI 2] Member Trucky VTC yang Discord-nya SUDAH KELUAR dari Server: ${truckyNotInDiscord.length} Driver`);
    if (truckyNotInDiscord.length > 0) {
      console.table(
        truckyNotInDiscord.map((t, i) => ({
          No: i + 1,
          TruckyUsername: t.username,
          TruckyID: t.id,
          Role: t.role,
          LinkedDiscordID: t.linkedDiscordId,
          DBName: t.linkedDbName,
        }))
      );
    } else {
      console.log(" ✅ Semua member Trucky yang terhubung masih ada di Discord server.\n");
    }

    console.log(`\n⚠️ [ANOMALI 3] Member Trucky VTC yang BELUM LINK / Tidak Terdaftar di Website: ${truckyNotLinkedToDb.length} Driver`);
    if (truckyNotLinkedToDb.length > 0) {
      console.table(
        truckyNotLinkedToDb.map((t, i) => ({
          No: i + 1,
          TruckyUsername: t.username,
          TruckyID: t.id,
          Role: t.role,
          SteamID: t.steamId || "-",
        }))
      );
    } else {
      console.log(" ✅ Semua driver Trucky sudah terhubung ke website.\n");
    }

    // ANOMALI 4: TOTAL USER WEBSITE YANG TIDAK ADA DI DISCORD SERVER (Driver + Non-Driver)
    console.log(`\nℹ️ [ANOMALI 4] Total Semua Pengguna Website yang TIDAK ADA di Discord Server: ${allUsersNotInDiscord.length} User`);
    if (allUsersNotInDiscord.length > 0) {
      console.log(` (Menampilkan ${Math.min(allUsersNotInDiscord.length, 15)} pertama dari ${allUsersNotInDiscord.length} user non-member)`);
      console.table(
        allUsersNotInDiscord.slice(0, 15).map((u, i) => ({
          No: i + 1,
          Name: u.name || "(No Name)",
          DiscordID: u.discordId,
          isDriver: u.isDriver ? "YES" : "NO",
          TruckyID: u.truckyId || "-",
        }))
      );
    }

    console.log("\n================================================================================");
    console.log("🎯 REKOMENDASI TINDAKAN:");
    console.log("1. Driver yang keluar dari Discord Server (Anomali 1 & 2) dapat dinonaktifkan status drivernya (isDriver: false) atau dikeluarkan dari Trucky VTC jika sudah resain.");
    console.log("2. Member Trucky yang belum link (Anomali 3) dapat diminta login ke website menggunakan Discord yang terhubung dengan Trucky.");
    console.log("================================================================================\n");

  } catch (error) {
    console.error("Audit Execution Error:", error);
  } finally {
    await client.close();
  }
}

runAudit();
