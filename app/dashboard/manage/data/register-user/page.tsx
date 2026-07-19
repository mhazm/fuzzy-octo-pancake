import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { redirect } from "next/navigation";
import RegisterManagerUI from "./RegisterManagerUI";

export default async function ManageRegistrationPage() {
  const session = await getServerSession(authOptions);

  // Proteksi: Hanya Manager/Admin yang bisa masuk
  if (!session || session.user.role !== "manager") redirect("/dashboard");

  const client = await clientPromise;
  const db = client.db();

  // Ambil semua pendaftaran yang masih PENDING
  const registrations = await db
    .collection("registrations")
    .find({ status: "pending" })
    .sort({ createdAt: -1 })
    .toArray();

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-700">
      <div className="space-y-1">
        <h1 className="text-4xl font-black text-(-primary-foreground) tracking-tighter uppercase italic">
          Registration <span className="text-primary">Manager</span>
        </h1>
        <p className="text-foreground/40 font-bold uppercase text-[10px] tracking-[0.3em]">
          Review, Edit, and Onboard New Drivers
        </p>
      </div>

      <RegisterManagerUI
        initialData={JSON.parse(JSON.stringify(registrations))}
        guildId={process.env.DISCORD_GUILD_ID}
      />
    </div>
  );
}
