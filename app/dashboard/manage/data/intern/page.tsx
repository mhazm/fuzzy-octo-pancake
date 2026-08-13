import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import InternMonitorClient from "./InternMonitorClient";

export const metadata = {
  title: "Manage Intern",
};



export default async function InternMonitorPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user?.role !== "manager" && session.user?.role !== "admin") {
    redirect("/dashboard");
  }

  return <InternMonitorClient />;
}
