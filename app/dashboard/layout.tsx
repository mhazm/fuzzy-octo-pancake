import DashboardSidebar from "@/components/DashboardSidebar";
import DriverAccessBlocker from "@/components/DriverAccessBlocker";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Jika bukan driver dan bukan manager/admin, blokir akses total dari layout
  if (!session.user?.isDriver && session.user?.role !== "manager" && session.user?.role !== "admin") {
    return (
      <>
        <DriverAccessBlocker session={session as any} />

      </>
    );
  }

  return (
    <>
      <div className="flex flex-col xl:flex-row w-full min-h-[calc(100vh-5rem)]">
        {/* Sidebar Navigation */}
        <DashboardSidebar userRole={session.user?.role} />

        {/* Main Content Area */}
        <div className="flex-1 w-full overflow-x-hidden bg-background p-4 md:p-6 lg:p-8 pb-24 xl:pb-8">
          {children}
        </div>
      </div>
    </>
  );
}