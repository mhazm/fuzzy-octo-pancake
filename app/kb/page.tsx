import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import KBPortalClient from "@/components/kb/KBPortalClient";
import NavbarClient from "@/components/NavbarClient";

export const metadata = {
  title: "Knowledge Base",
  description: "Pusat informasi dan panduan Nismara Transport.",
};

export default async function KBPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <NavbarClient session={session} />
      <div className="pt-24 pb-12">
        <KBPortalClient session={session} />
      </div>
    </div>
  );
}
