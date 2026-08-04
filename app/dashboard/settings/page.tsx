// app/dashboard/settings/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import DriverAccessBlocker from "@/components/DriverAccessBlocker";
import SettingsClient from "./SettingsClient"; // Kita pindahkan logic form ke sini
import { ShieldAlert, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  // 1. Cek apakah sudah login
  if (!session) {
    redirect("/login");
  }

  // 2. Cek apakah sudah jadi Driver (isDriver)
  // Kita gunakan isDriver sebagai gate utama
  if (!session.user?.isDriver || !session.user.driverData) {
    return <DriverAccessBlocker session={session} />;
  }

  // 3. Jika lolos validasi, tampilkan Client Component (Form)
  return <SettingsClient />;
}
