import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import ConvoyManageUI from "./ConvoyManageUI";

export const metadata = {
  title: "Manage Convoy",
};

async function getConvoyData() {
  const client = await clientPromise;
  const db = client.db();
  const convoys = await db
    .collection("convoylobby")
    .find({})
    .sort({ meetupDate: -1 })
    .toArray();

  return JSON.parse(JSON.stringify(convoys));
}

export default async function ManageConvoyPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || session.user.role === "user") {
    redirect("/dashboard");
  }

  const convoys = await getConvoyData();

  return <ConvoyManageUI initialConvoys={convoys} />;
}
