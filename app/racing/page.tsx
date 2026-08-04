import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DriverAccessBlocker from "@/components/DriverAccessBlocker";
import RacingClient from "./RacingClient";

export const metadata = {
  title: "Nismara Racing - Dashboard",
};

export default async function RacingPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return <DriverAccessBlocker session={session as any} />;
  }

  // Same logic as scratchers page: check isDriver
  const isDriver = !!session.user.isDriver;

  if (!isDriver) {
    return <DriverAccessBlocker session={session as any} />;
  }

  return <RacingClient isDriver={isDriver} />;
}
