import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import ContractManageUI from "./ContractManageUI";

export const metadata = {
  title: "Manage Contracts",
};



export default async function ManageContractPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "manager") redirect("/dashboard");

  const client = await clientPromise;
  const db = client.db();
  const guildId = process.env.DISCORD_GUILD_ID;
  const now = new Date();

  // Ambil Kontrak Berjalan, Terjadwal, dan Riwayat
  const [ongoingContracts, scheduledContracts, contractHistory] = await Promise.all([
    db.collection("contracts").find({ guildId, isActive: true }).toArray(),
    db
      .collection("contracts")
      .find({
        guildId,
        isActive: false,
        isScheduled: true,
        startDate: { $gt: now },
      })
      .sort({ startDate: 1 })
      .toArray(),
    db
      .collection("contracts")
      .find({
        guildId,
        isActive: false,
        $or: [
          { isScheduled: { $ne: true } },
          { startDate: { $lte: now } },
        ],
      })
      .sort({ endAt: -1 })
      .toArray(),
  ]);

  const serialize = (data: any) => JSON.parse(JSON.stringify(data));

  return (
    <ContractManageUI
      ongoing={serialize(ongoingContracts)}
      scheduled={serialize(scheduledContracts)}
      history={serialize(contractHistory)}
      manager={session.user}
    />
  );
}
