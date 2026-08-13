import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import MarketManagerClient from "./MarketManagerClient";

export const metadata = {
  title: "Kelola Market Mod",
};

export default async function ManageMarketPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Hanya izinkan Manager & Admin
  if (session.user.role !== "admin" && session.user.role !== "manager") {
    redirect("/dashboard");
  }

  return <MarketManagerClient />;
}
