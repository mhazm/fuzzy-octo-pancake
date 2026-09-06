import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { getSeasonPassFeatureStatus } from "@/lib/seasonPass";
import SeasonPassSettingClient from "./SeasonPassSettingClient";

export const metadata = {
  title: "Pengaturan Season Pass - Manager Portal",
  description: "Pengaturan enable/disable dan ketersediaan publik fitur Season Pass.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function SeasonPassSettingPage() {
  const session = await getServerSession(authOptions);

  const isManager =
    session?.user?.role === "manager" || session?.user?.role === "admin";

  if (!session || !isManager) {
    redirect("/dashboard");
  }

  const featureStatusDoc = await getSeasonPassFeatureStatus();
  const initialFeatureStatus = JSON.parse(JSON.stringify(featureStatusDoc));

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto">
      <SeasonPassSettingClient initialFeatureStatus={initialFeatureStatus} />
    </div>
  );
}
