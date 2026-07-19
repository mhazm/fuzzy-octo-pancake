import clientPromise from "@/lib/mongodb";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import EditConvoyForm from "./EditConvoyForm";

export default async function EditConvoyPage({
  params,
}: {
  params: Promise<{ uri: string }>;
}) {
  const { uri } = await params;
  const client = await clientPromise;
  const db = client.db();

  const convoy = await db.collection("convoylobby").findOne({ convoyUri: uri });

  if (!convoy) notFound();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-black mb-8">
        Edit Convoy: {convoy.convoyName}
      </h1>
      <EditConvoyForm convoy={JSON.parse(JSON.stringify(convoy))} />
    </div>
  );
}
