import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import CreateTeamForm from "./CreateTeamForm";

export const metadata = {
  title: "Create",
};



export default async function CreateTeamPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const client = await clientPromise;
  const db = client.db();

  const currentUser = await db.collection("users").findOne({
    email: session.user.email,
  });

  if (currentUser?.teamId) {
    const existingTeam = await db.collection("teams").findOne({
      _id: currentUser.teamId,
    });

    if (existingTeam) {
      redirect(`/teams/${existingTeam.uri}`);
    }
  }

  return <CreateTeamForm isNismaraPlus={currentUser?.nismaraplus?.status === true} />;
}
