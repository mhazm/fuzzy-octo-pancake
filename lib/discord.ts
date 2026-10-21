const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID || process.env.GUILD_ID || "863959415702028318";
const MANAGER_ROLE_ID = process.env.DISCORD_MANAGER_ROLE_ID || "863968603681325066";

/**
 * Membuat text channel baru di Discord di bawah kategori tertentu
 */
export async function createDiscordTicketChannel({
  guildId = GUILD_ID,
  categoryId,
  channelName,
  userDiscordId,
  managerRoleId = MANAGER_ROLE_ID,
}: {
  guildId?: string;
  categoryId: string;
  channelName: string;
  userDiscordId: string;
  managerRoleId?: string;
}): Promise<{ id: string } | null> {
  if (!DISCORD_BOT_TOKEN) {
    console.error("DISCORD_BOT_TOKEN is missing in environment variables");
    return null;
  }

  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: channelName.substring(0, 100),
        type: 0, // GUILD_TEXT
        parent_id: categoryId,
        permission_overwrites: [
          {
            id: guildId, // @everyone role
            type: 0,
            deny: "1024", // VIEW_CHANNEL
          },
          {
            id: userDiscordId,
            type: 1, // member
            allow: "68608", // VIEW_CHANNEL + SEND_MESSAGES + READ_MESSAGE_HISTORY
          },
          ...(managerRoleId
            ? [
                {
                  id: managerRoleId,
                  type: 0, // role
                  allow: "68608",
                },
              ]
            : []),
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Failed to create Discord ticket channel:", err);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error("Error creating Discord ticket channel:", error);
    return null;
  }
}

/**
 * Mengirim pesan / embed ke channel Discord
 */
export async function sendDiscordMessage(channelId: string, content: string, embeds?: any[]) {
  if (!DISCORD_BOT_TOKEN || !channelId) return false;
  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
        embeds: embeds || [],
      }),
    });
    return res.ok;
  } catch (error) {
    console.error("Error sending Discord message:", error);
    return false;
  }
}

/**
 * Mengirim pesan DM ke pengguna Discord
 */
export async function sendDiscordDM(discordId: string, content: string, embeds?: any[]) {
  if (!DISCORD_BOT_TOKEN || !discordId) return false;
  try {
    const dmRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
      method: "POST",
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipient_id: discordId }),
    });

    if (!dmRes.ok) {
      console.error("Failed to open Discord DM channel:", await dmRes.text());
      return false;
    }

    const dmChannel = await dmRes.json();
    return await sendDiscordMessage(dmChannel.id, content, embeds);
  } catch (error) {
    console.error("Error sending Discord DM:", error);
    return false;
  }
}

/**
 * Menghapus channel Discord
 */
export async function deleteDiscordChannel(channelId: string) {
  if (!DISCORD_BOT_TOKEN || !channelId) return false;
  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      },
    });
    return res.ok;
  } catch (error) {
    console.error("Error deleting Discord channel:", error);
    return false;
  }
}
