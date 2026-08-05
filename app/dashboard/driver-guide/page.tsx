import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import DriverAccessBlocker from "@/components/DriverAccessBlocker";
import DriverGuideClient from "./DriverGuideClient";
import { ShieldAlert, ArrowRight, Lock } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Driver Guide",
};



export default async function DriverGuidePage() {
  const session = await getServerSession(authOptions);

  // 1. Proteksi Login
  if (!session) {
    redirect("/login");
  }

  // 2. Proteksi Akses Driver
  if (!session.user?.isDriver || !session.user.driverData) {
    return <DriverAccessBlocker session={session} />;
  }

  // 3. Jika Driver, tampilkan panduan
  return <DriverGuideClient />;
}
