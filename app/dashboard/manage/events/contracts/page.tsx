import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import ContractManageUI from "./ContractManageUI";

export default async function ManageContractPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "manager") redirect("/dashboard");

  const client = await clientPromise;
  const db = client.db();

  // Ambil Kontrak Berjalan dan Riwayat
  const [ongoingContracts, contractHistory] = await Promise.all([
    db.collection("contracts").find({}).toArray(),
    db
      .collection("contracthistories")
      .find({})
      .sort({ closedAt: -1 })
      .toArray(),
  ]);

  const serialize = (data: any) => JSON.parse(JSON.stringify(data));

  return (
    <ContractManageUI
      ongoing={serialize(ongoingContracts)}
      history={serialize(contractHistory)}
      manager={session.user}
    />
  );
}
