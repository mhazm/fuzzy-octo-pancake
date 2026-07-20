import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import EditContractForm from "./EditContractForm";
import { FileEdit } from "lucide-react";

export default async function EditContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Verifikasi Manager
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "manager") redirect("/dashboard");

  const resolvedParams = await params;
  const contractId = resolvedParams.id;

  const client = await clientPromise;
  const db = client.db();

  let contractData;
  try {
    contractData = await db.collection("contracts").findOne({
      _id: new ObjectId(contractId),
    });
  } catch (error) {
    redirect("/dashboard/manage/events/contracts"); // Redirect jika ID tidak valid
  }

  if (!contractData) {
    redirect("/dashboard/manage/events/contracts");
  }

  // Serialize agar tidak terjadi error passing object ID ke Client Component
  const serializedContract = JSON.parse(JSON.stringify(contractData));

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-sky/10 border border-accent-sky/20 text-accent-sky text-xs font-bold uppercase tracking-widest w-fit">
          <FileEdit className="w-4 h-4" /> Edit Mode
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tighter uppercase italic">
          Edit Contract
        </h1>
        <p className="text-foreground/50 font-bold uppercase text-[10px] tracking-[0.2em]">
          Modify Operational Parameters
        </p>
      </div>

      <EditContractForm contract={serializedContract} />
    </div>
  );
}
