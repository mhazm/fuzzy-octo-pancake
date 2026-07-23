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
          scope: "guilds email identify",
        },
      },
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      const client = await clientPromise;
      const db = client.db();

      // 1. Ambil data akun Discord dari koleksi 'accounts'
      const account = await db.collection("accounts").findOne({
        userId: new ObjectId(user.id),
        provider: "discord",
      });

      let isDriver = false;
      let driverData = null;
      let userRole: "user" | "manager" | "admin" = "user";

      if (account) {
        const discordId = account.providerAccountId;

        // 2. PERBAIKAN: Gunakan $set untuk discordId dan lastSeen (Bukan $cache)
        await db.collection("users").updateOne(
          { _id: new ObjectId(user.id) },
          {
            $set: {
              discordId: discordId,
              lastSeen: new Date(),
            },
          },
        );

        // 3. Inisialisasi XP dan Level hanya jika belum ada
        await db
          .collection("users")
          .updateOne(
            { _id: new ObjectId(user.id), xp: { $exists: false } },
            { $set: { xp: 0, level: 1 } },
          );

        // --- VERIFIKASI ROLE DISCORD ---[cite: 16]
        const guildId = "863959415702028318";
        const managerRoleId = "1406574228794507354";

        try {
          const response = await fetch(
            `https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`,
            {
              headers: {
                Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
              },
              next: { revalidate: 600 },
            },
          );

          if (response.ok) {
            const memberData = await response.json();
            if (memberData.roles.includes(managerRoleId)) {
              userRole = "manager";
            }
          }
        } catch (error) {
          console.error("Gagal verifikasi role Discord:", error);
        }

        // --- SYNC TRUCKY ID ---[cite: 16]
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

          // Update/Sync truckyId ke dokumen user agar bisa dibuat profile public
          await db.collection("users").updateOne(
            { _id: new ObjectId(user.id) },
            {
              $set: {
                truckyId: driverLink.truckyId,
                isDriver: true,
              },
            },
          );
        }

        session.user.discordId = discordId;
      }

      // 4. Ambil data terbaru untuk session[cite: 16, 17]
      const dbUser = await db
        .collection("users")
        .findOne({ _id: new ObjectId(user.id) });

      session.user.isDriver = isDriver;
      session.user.driverData = driverData;
      session.user.role = userRole;
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
