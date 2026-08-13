// src/app/dashboard/manage/layout.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // PROTEKSI: Tetap jaga akses hanya untuk manager
  if (!session || session.user.role !== "manager") {
    redirect("/dashboard");
  }

  // Cukup return children saja, biarkan Sidebar Utama yang menghandle navigasi
  return <div className="w-full">{children}</div>;
}
