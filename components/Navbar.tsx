import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import NavbarClient from "@/components/NavbarClient";
import { getSeasonPassFeatureStatus } from "@/lib/seasonPass";

export default async function Navbar() {
  const session = await getServerSession(authOptions);
  const featureStatus = await getSeasonPassFeatureStatus();

  return (
    <NavbarClient
      session={session}
      isSeasonPassEnabled={featureStatus.isEnabled}
    />
  );
}
