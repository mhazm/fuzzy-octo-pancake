import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import QuizManagerClient from "./QuizManagerClient";

export const metadata = {
  title: "Manage Quiz",
};



export default async function QuizManagerPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user?.role !== "manager" && session.user?.role !== "admin") {
    redirect("/dashboard");
  }

  return <QuizManagerClient />;
}
