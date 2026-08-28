import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { getPopupConfig } from "@/app/actions/popupActions";
import PopupManageClient from "./PopupManageClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kelola Global Popup",
};

export default async function ManagePopupPage() {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    (session.user.role !== "admin" && session.user.role !== "manager")
  ) {
    redirect("/dashboard");
  }

  const popupConfig = await getPopupConfig();

  return (
    <div className="min-h-screen bg-background">
      <PopupManageClient initialConfig={popupConfig} />
    </div>
  );
}
