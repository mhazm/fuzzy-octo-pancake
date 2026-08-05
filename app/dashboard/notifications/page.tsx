import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import NotificationsClient from "./NotificationsClient";

export const metadata: Metadata = {
  title: "Notifikasi",
  description: "Lihat semua riwayat notifikasi dan pemberitahuan sistem Anda.",
};

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <NotificationsClient />
    </div>
  );
}
