import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import CreateGoalClient from "./CreateGoalClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Usulkan Community Goal",
};

export default async function CreateGoalPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  return <CreateGoalClient />;
}
