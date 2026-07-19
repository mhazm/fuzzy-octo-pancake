import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import { getCompanyMembersMap } from "@/lib/trucky";
import CurrencyDataUI from "./CurrencyDataUI";
import { WalletCards } from "lucide-react";

export default async function CurrencyDataPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "manager") redirect("/dashboard");

  const client = await clientPromise;
  const db = client.db();
  const guildId = process.env.DISCORD_GUILD_ID;

  // 1. Ambil data saldo, link, dan profil web
  const [allCurrencies, driverLinks, webUsers] = await Promise.all([
    db.collection("currencies").find({ guildId }).toArray(),
    db.collection("driverlinks").find({ guildId }).toArray(),
    db.collection("users").find({}).toArray(),
  ]);

  const membersMap = await getCompanyMembersMap(35643);

  // 2. Gabungkan data berdasarkan koleksi CURRENCIES
  const combinedCurrencyData = allCurrencies.map((cur) => {
    const link = driverLinks.find((l) => l.userId === cur.userId);
    const webData = webUsers.find((wu) => wu.discordId === cur.userId);
    const truckyData = link ? membersMap[link.truckyId] : null;

    return {
      id: cur._id.toString(),
      discordId: cur.userId,
      truckyId: link?.truckyId || null,
      name:
        webData?.name ||
        link?.truckyName ||
        truckyData?.username ||
        "Unknown (Ex-Member)",
      image: webData?.image || truckyData?.avatar_url || null,
      totalNC: cur.totalNC || 0,
      isOrphaned: !link, // Jika tidak ada di driverlinks, berarti data "yatim"
    };
  });

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-accent-lilac/10 rounded-2xl text-accent-lilac shadow-lg shadow-accent-lilac/5">
          <WalletCards size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-black text-(-primary-foreground) tracking-tighter uppercase italic leading-none">
            Economy Audit
          </h1>
          <p className="text-(-primary-foreground)/40 font-bold uppercase text-[10px] tracking-[0.2em] mt-2 ml-1">
            Nismara Transport • Currency Integrity Management
          </p>
        </div>
      </div>

      <CurrencyDataUI initialData={combinedCurrencyData} />
    </main>
  );
}
