import NextAuth, { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  session: {
    strategy: "database",
    maxAge: 7 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "email identify",
        },
      },
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      const client = await clientPromise;
      const db = client.db();

      const account = await db.collection("accounts").findOne({
        userId: new ObjectId(user.id),
        provider: "discord",
      });

      // Default value
      let isDriver = false;
      let driverData = null;
      let userRole: "user" | "manager" | "admin" = "user";
      let isBooster = false;
      const guildId = "863959415702028318";
      const managerRoleId = "1406574228794507354";

      // 1. Ambil data User dari DB terlebih dahulu
      const dbUser = await db
        .collection("users")
        .findOne({ _id: new ObjectId(user.id) });

      if (account) {
        const discordId = account.providerAccountId;

        // Cek kapan terakhir kali kita menembak API Discord untuk user ini
        const lastDiscordSync = dbUser?.lastDiscordSync
          ? new Date(dbUser.lastDiscordSync).getTime()
          : 0;
        const now = Date.now();
        const tenMinutes = 10 * 60 * 1000;

        // 2. Jika data sudah kedaluwarsa (lebih dari 10 menit) ATAU belum pernah sync, fetch ke Discord
        if (now - lastDiscordSync > tenMinutes) {
          try {
            const response = await fetch(
              `https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`,
              {
                headers: {
                  Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                },
              },
            );

            if (response.ok) {
              const memberData = await response.json();

              if (memberData.roles.includes(managerRoleId))
                userRole = "manager";
              if (memberData.premium_since) isBooster = true;

              // SIMPAN HASIL KE DATABASE AGAR TIDAK PERLU FETCH LAGI DALAM WAKTU DEKAT
              await db.collection("users").updateOne(
                { _id: new ObjectId(user.id) },
                {
                  $set: {
                    discordRole: userRole,
                    isBooster: isBooster,
                    lastDiscordSync: new Date(),
                  },
                },
              );
            } else {
              console.error("❌ [API DISCORD] Error Status:", response.status);
            }
          } catch (error) {
            console.error("❌ [FETCH] Gagal menghubungi Discord API:", error);
          }
        } else {
          // 3. JIKA BELUM 10 MENIT, GUNAKAN DATA DARI DATABASE (TIDAK SPAM API)
          userRole = dbUser?.discordRole || "user";
          isBooster = dbUser?.isBooster || false;
        }

        // --- UPDATE DISCORD ID & XP JIKA KOSONG ---
        await db.collection("users").updateOne(
          { _id: new ObjectId(user.id) },
          {
            $set: { discordId: discordId, lastSeen: new Date() },
          },
        );

        if (dbUser && dbUser.xp === undefined) {
          await db
            .collection("users")
            .updateOne(
              { _id: new ObjectId(user.id) },
              { $set: { xp: 0, level: 1 } },
            );
        }

        // --- SYNC TRUCKY ID ---
        const driverLink = await db.collection("driverlinks").findOne({
          userId: discordId,
          guildId,
        });

        if (driverLink) {
          isDriver = true;
          driverData = {
            truckyId: driverLink.truckyId,
            truckyName: driverLink.truckyName,
          };

          await db
            .collection("users")
            .updateOne(
              { _id: new ObjectId(user.id) },
              { $set: { truckyId: driverLink.truckyId, isDriver: true } },
            );
        }

        session.user.discordId = discordId;
      }

      // 4. MASUKKAN DATA KE SESSION
      session.user.isDriver = isDriver;
      session.user.driverData = driverData;
      session.user.role = userRole;
      session.user.isBooster = isBooster;
      session.user.xp = dbUser?.xp || 0;
      session.user.level = dbUser?.level || 1;
      session.user.teamId = dbUser?.teamId ? dbUser.teamId.toString() : null;
      session.user.truckyId = dbUser?.truckyId;

      return session;
    },
  },
  pages: { signIn: "/dashboard/" },
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
