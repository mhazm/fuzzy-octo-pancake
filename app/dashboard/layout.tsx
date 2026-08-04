import DashboardSidebar from "@/components/DashboardSidebar";
import DriverAccessBlocker from "@/components/DriverAccessBlocker";
import Script from "next/script";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

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
        <Script
          src="https://app.sandbox.midtrans.com/snap/snap.js"
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          strategy="afterInteractive"
        />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col lg:flex-row max-w-7xl mx-auto w-full min-h-[calc(100vh-4rem)]">
        {/* Sidebar Navigation */}
        <DashboardSidebar />

        {/* Main Content Area */}
        <div className="flex-1 w-full overflow-x-hidden">{children}</div>
      </div>

      <Script
        src="https://app.sandbox.midtrans.com/snap/snap.js"
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="afterInteractive"
      />
    </>
  );
}