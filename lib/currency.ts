import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const GUILD_ID = "863959415702028318";

export async function getCurrencyDataLogic() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) throw new Error("Unauthorized");

  const userId = session.user.discordId;
  const client = await clientPromise;
  const db = client.db();

  const [balanceData, historyData] = await Promise.all([
    db.collection("currencies").findOne({ userId, guildId: GUILD_ID }),
    db
      .collection("currencyhistories")
      .find({ userId, guildId: GUILD_ID })
      .sort({ createdAt: -1 })
      .toArray(),
  ]);

  return {
    balance: balanceData?.totalNC || 0,
    history: historyData.map((item) => ({
      _id: item._id.toString(),
      amount: item.amount,
      type: item.type, // 'earn' | 'spend'
      reason: item.reason,
      createdAt:
        item.createdAt instanceof Date
          ? item.createdAt.toISOString()
          : new Date(item.createdAt).toISOString(),
    })),
  };
}
