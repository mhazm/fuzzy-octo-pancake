import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import DriverAccessBlocker from "@/components/DriverAccessBlocker";
import MyMarketClient from "./MyMarketClient";

export const metadata = {
  title: "My Market",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";



export default async function MyMarketPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  if (!session.user?.isDriver || !session.user.driverData) {
    return <DriverAccessBlocker session={session} />;
  }

  return <MyMarketClient />;
}
