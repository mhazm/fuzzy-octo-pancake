import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DriverAccessBlocker from "@/components/DriverAccessBlocker";
import ScratcherClient from "./ScratcherClient";

export const metadata = {
  title: "Scratch & Win",
};

export default async function ScratchersPage() {
  const session = await getServerSession(authOptions);

  // Jika belum login atau bukan driver, tampilkan blocker
  if (!session || !session.user?.isDriver || !session.user.driverData) {
    return <DriverAccessBlocker session={session} />;
  }

  return (
    <main className="min-h-screen bg-background py-12 px-4 md:px-8">
      <ScratcherClient isDriver={session.user.isDriver} />
    </main>
  );
}
