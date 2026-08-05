import clientPromise from "@/lib/mongodb";

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const CATEGORY_ID = process.env.DISCORD_REGISTRATION_CATEGORY_ID;

export async function POST(req: Request) {
  const data = await req.json();
  const client = await clientPromise;
  const db = client.db();

  // Create channel name
  const safeUsername = data.username.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const channelName = `📄|pendaftaran-${safeUsername}`.substring(0, 100);

  let discordChannelId = null;

  if (DISCORD_BOT_TOKEN && GUILD_ID && CATEGORY_ID) {
    try {
      // 1. Create Discord Channel
      const createChannelRes = await fetch(
        `https://discord.com/api/v10/guilds/${GUILD_ID}/channels`,
        {
          method: "POST",
          headers: {
            Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: channelName,
            type: 0, // GUILD_TEXT
            parent_id: CATEGORY_ID,
            permission_overwrites: [
              {
                id: GUILD_ID, // @everyone role
                type: 0,
                deny: "1024", // Deny VIEW_CHANNEL
              },
              {
                id: data.userId, // User role/id
                type: 1, // member
                allow: "3072", // Allow VIEW_CHANNEL and SEND_MESSAGES
              },
            ],
          }),
        },
      );

      if (createChannelRes.ok) {
        const channelData = await createChannelRes.json();
        discordChannelId = channelData.id;

        // 2. Send initial message
        const managerRoleId = process.env.DISCORD_MANAGER_ROLE_ID;

        await fetch(
          `https://discord.com/api/v10/channels/${discordChannelId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: `Halo <@${data.userId}>! Pendaftaran Anda sedang diproses. <@&${managerRoleId}>, mohon segera ditinjau.`,
              embeds: [
                {
                  title: "📝 Data Pendaftaran VTC Nismara",
                  description:
                    "Terima kasih telah mendaftar di VTC Nismara Transport. Silakan tunggu Staff HR kami untuk mengambil alih pendaftaran ini.",
                  color: 3447003, // Biru
                  fields: [
                    { name: "Username", value: data.username, inline: true },
                    {
                      name: "Trucky ID",
                      value: data.truckyId || "Belum diisi",
                      inline: true,
                    },
                    {
                      name: "Game Utama",
                      value: data.game || "-",
                      inline: true,
                    },
                    {
                      name: "Pengalaman VTC",
                      value: data.experience || "-",
                      inline: false,
                    },
                    {
                      name: "Alasan Bergabung",
                      value: data.reason || "-",
                      inline: false,
                    },
                    {
                      name: "Sumber Info",
                      value: data.sumber || "-",
                      inline: false,
                    },
                  ],
                  footer: { text: "Sistem Pendaftaran Nismara Transport" },
                  timestamp: new Date().toISOString(),
                },
              ],
            }),
          },
        );
      } else {
        console.error(
          "Failed to create registration discord channel:",
          await createChannelRes.text(),
        );
      }
    } catch (error) {
      console.error("Error creating discord channel for registration:", error);
    }
  }

  // Save to DB
  await db.collection("registrations").insertOne({
    guildId: GUILD_ID,
    userId: data.userId, // ID dari session Discord
    username: data.username,
    truckyId: data.truckyId,
    reason: data.reason,
    experience: data.experience,
    game: data.game,
    sumber: data.sumber,
    status: "pending",
    discordChannelId: discordChannelId,
    managerId: null, // belum ada yang claim
    createdAt: new Date(),
  });

  return Response.json({ success: true });
}
