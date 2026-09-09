import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import DriverAccessBlocker from "@/components/DriverAccessBlocker";
import TicketClient from "./TicketClient";

export const metadata = {
  title: "Ticket",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";



export default async function TicketPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  if (!session.user?.isDriver || !session.user.driverData) {
    return <DriverAccessBlocker session={session} />;
  }

  return <TicketClient />;
}
