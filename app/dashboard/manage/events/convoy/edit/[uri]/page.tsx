import clientPromise from "@/lib/mongodb";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import EditConvoyForm from "./EditConvoyForm";

export const metadata = {
  title: "Manage Edit Detail",
};



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

  // Fetch participant users to show in Road Captain dropdown
  let participantUsers: any[] = [];
  if (convoy.partisipan && convoy.partisipan.length > 0) {
    const participantDiscordIds = convoy.partisipan.map((p: any) => p.discordId).filter(Boolean);
    if (participantDiscordIds.length > 0) {
      participantUsers = await db
        .collection("users")
        .find({ discordId: { $in: participantDiscordIds } })
        .project({ discordId: 1, name: 1, _id: 0 })
        .toArray();
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-black mb-8">
        Edit Convoy: {convoy.convoyName}
      </h1>
      <EditConvoyForm 
        convoy={JSON.parse(JSON.stringify(convoy))} 
        participantUsers={JSON.parse(JSON.stringify(participantUsers))}
      />
    </div>
  );
}
