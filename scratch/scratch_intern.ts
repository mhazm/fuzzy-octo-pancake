import "dotenv/config";
import clientPromise from "../lib/mongodb";
import { getCompanyMembersMap } from "../lib/trucky";
import mongoose from "mongoose";

async function run() {
  try {
    const client = await clientPromise;
    const db = client.db();

    const NISMARA_COMPANY_ID = process.env.TRUCKY_COMPANY_ID || "4138";
    const membersMap = await getCompanyMembersMap(Number(NISMARA_COMPANY_ID));

    const driverLinks = await db.collection("driverlinks").find({}).toArray();
    const discordIdsFromLinks = driverLinks.map((d) => d.userId);

    const webUsers = await db
      .collection("users")
      .find({
        discordId: { $in: discordIdsFromLinks },
      })
      .toArray();

    const internUsers: any[] = [];
    const internDiscordIds: string[] = [];

    driverLinks.forEach((link) => {
      const webUser = webUsers.find((u) => u.discordId === link.userId);
      const truckyData = membersMap[link.truckyId] || {};

      const truckyRoleName = truckyData.role
        ? typeof truckyData.role === "object"
          ? truckyData.role.name
          : truckyData.role
        : null;

      const finalRole = truckyRoleName || webUser?.truckyRole || "";

      if (
        finalRole.toLowerCase().includes("intern") ||
        finalRole.toLowerCase().includes("magang")
      ) {
        internUsers.push({
          _id: webUser?._id || new mongoose.Types.ObjectId(),
          discordId: link.userId,
          name:
            webUser?.name ||
            link.truckyName ||
            truckyData.username ||
            "Unknown Driver",
        });
        internDiscordIds.push(link.userId);
      }
    });

    const discordIds = internDiscordIds;

    // Test the fleet query which failed before
    const validUserIds = internUsers.filter((u) => u._id).map((u) => u._id);
    const fleets =
      validUserIds.length > 0
        ? await db
            .collection("fleets")
            .find({ owner: { $in: validUserIds } })
            .toArray()
        : [];

    console.log("fleets length:", fleets.length);
    console.log("Success!");

    process.exit(0);
  } catch (err) {
    console.error("ERROR:");
    console.error(err);
    process.exit(1);
  }
}

run();
