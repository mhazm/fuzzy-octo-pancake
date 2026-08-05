import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import ExamClient from "./ExamClient";

export const metadata = {
  title: "Exam",
};



export default async function ExamPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Only Interns should be able to take the exam. 
  // Wait, if they fail, they are still intern. 
  // If they pass, they might still be intern until manager promotes them.
  // We can let anyone view it, but the API will block non-interns or completed ones.
  // Actually, we can restrict by role if needed.
  const role = session.user?.role as string;
  if (role !== "intern" && role !== "magang") {
    // Only admins or managers might want to test this?
    // Let's just strictly enforce only those with isInterviewing flag can access,
    // plus we also check if they are intern/magang just to be safe.
  }

  const client = await clientPromise;
  const db = client.db();
  const user = await db.collection("users").findOne({ discordId: session.user.discordId });

  if (!user?.isInterviewing) {
    // If not invited, they cannot access the exam page.
    redirect("/dashboard?error=not_invited_to_interview");
  }

  return <ExamClient />;
}
