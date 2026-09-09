import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import dbConnect from "@/lib/mongoose";
import { ensureStarterTemplates } from "@/lib/nplusWeeklyQuest";
import {
  getQuestTemplatesAction,
  getActiveAndNextWeekPreviewAction,
} from "@/app/actions/nplusQuestManageActions";
import QuestManageClient from "./QuestManageClient";

export const metadata = {
  title: "Kelola Template Quest Nismara+ - Manager Portal",
  description:
    "Pusat manajemen dan konfigurasi bank template quest mingguan Nismara Plus.",
};

export const dynamic = "force-dynamic";

export default async function ManageNplusQuestsPage() {
  const session = await getServerSession(authOptions);

  const role =
    (session?.user as any)?.role || (session?.user as any)?.discordRole;
  const isManager = role === "manager" || role === "admin";

  if (!session || !isManager) {
    redirect("/dashboard");
  }

  await dbConnect();
  await ensureStarterTemplates();

  const [templatesRes, previewRes] = await Promise.all([
    getQuestTemplatesAction(),
    getActiveAndNextWeekPreviewAction(),
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <QuestManageClient
        initialTemplates={
          templatesRes.success
            ? JSON.parse(JSON.stringify(templatesRes.templates))
            : []
        }
        initialPreview={
          previewRes.success ? JSON.parse(JSON.stringify(previewRes)) : null
        }
      />
    </div>
  );
}
