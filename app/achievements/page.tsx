import clientPromise from "@/lib/mongodb";
import Link from "next/link";
import { Medal, Trophy, Calendar, Sparkles } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Galeri Achievement",
  description:
    "Daftar seluruh achievement dan lencana kebanggaan yang dapat diraih oleh driver Nismara Transport.",
};

const categoryLabels: Record<string, string> = {
  weekly: "Mingguan",
  monthly: "Bulanan",
  yearly: "Tahunan",
  event: "Event Spesial",
};

const categoryIcons: Record<string, React.ReactNode> = {
  weekly: <Medal className="w-5 h-5 text-blue-500" />,
  monthly: <Trophy className="w-5 h-5 text-purple-500" />,
  yearly: <Calendar className="w-5 h-5 text-emerald-500" />,
  event: <Sparkles className="w-5 h-5 text-amber-500" />,
};

export const revalidate = 3600; // Cache 1 jam

export default async function AchievementsIndexPage() {
  const client = await clientPromise;
  const db = client.db();

  const achievements = await db
    .collection("achievements")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  // Kelompokkan berdasarkan kategori
  const groupedAchievements = achievements.reduce(
    (acc, ach) => {
      const cat = ach.category || "lainnya";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(ach);
      return acc;
    },
    {} as Record<string, any[]>,
  );

  const categoriesOrder = ["event", "weekly", "monthly", "yearly"];

  return (
    <main className="min-h-screen pt-32 pb-20 relative bg-background overflow-x-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-96 bg-primary/5 blur-3xl rounded-b-[100%] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl text-primary mb-6 ring-1 ring-primary/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]">
            <Trophy className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-foreground uppercase tracking-tight mb-4">
            Galeri <span className="text-primary">Achievement</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Jelajahi seluruh daftar penghargaan dan lencana kehormatan yang
            menjadi bukti dedikasi para driver Nismara Transport.
          </p>
        </div>

        <div className="space-y-16">
          {categoriesOrder.map((catKey) => {
            const achList = groupedAchievements[catKey];
            if (!achList || achList.length === 0) return null;

            return (
              <section
                key={catKey}
                className="animate-in fade-in slide-in-from-bottom-4 duration-700"
              >
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border/50">
                  {categoryIcons[catKey]}
                  <h2 className="text-2xl font-black text-foreground uppercase tracking-widest">
                    {categoryLabels[catKey] || catKey}
                  </h2>
                  <span className="ml-auto bg-card px-3 py-1 rounded-full text-xs font-bold text-muted-foreground border border-border/50">
                    {achList.length} Lencana
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {achList.map((ach) => (
                    <Link
                      href={`/achievements/${ach.slug}`}
                      key={ach._id.toString()}
                      className="group flex flex-col items-center bg-card/40 backdrop-blur-sm border border-border/50 p-6 rounded-2xl hover:bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                    >
                      <div className="w-20 h-20 mb-4 bg-background/50 rounded-full border border-border/50 flex items-center justify-center shadow-inner relative group-hover:scale-110 transition-transform duration-300">
                        {ach.imageUrl ? (
                          <img
                            src={ach.imageUrl}
                            alt={ach.name}
                            className="w-14 h-14 object-contain drop-shadow-md"
                          />
                        ) : (
                          <Medal className="w-10 h-10 text-primary/50 group-hover:text-primary transition-colors" />
                        )}
                        <div className="absolute inset-0 rounded-full ring-2 ring-primary/0 group-hover:ring-primary/50 transition-all duration-300" />
                      </div>

                      <h3 className="text-sm font-bold text-foreground text-center mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {ach.name}
                      </h3>
                      <p className="text-[10px] text-muted-foreground text-center line-clamp-2 leading-relaxed">
                        {ach.description}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
