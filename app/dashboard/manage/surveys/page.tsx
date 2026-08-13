import Link from "next/link";
import {
  Plus,
  ClipboardList,
  Users,
  Coins,
  BarChart3,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import clientPromise from "@/lib/mongodb"; // Pastikan path ini sesuai dengan file mongodb.ts kamu

export const metadata = {
  title: "Manage Surveys",
};



// Memaksa Next.js agar selalu mengambil data terbaru (tidak di-cache secara statis)
export const dynamic = "force-dynamic";

export default async function SurveysDashboardPage() {
  // 1. Koneksi ke MongoDB
  const client = await clientPromise;
  const db = client.db();

  // 2. Ambil data semua survey (diurutkan dari yang paling baru dibuat)
  const rawSurveys = await db
    .collection("surveys")
    .find({})
    .sort({ _id: -1 })
    .toArray();

  // 3. Mapping dan kalkulasi data
  const surveys = await Promise.all(
    rawSurveys.map(async (survey) => {
      // Hitung jumlah driver yang sudah merespons survey ini
      // (Berdasarkan koleksi survey_responses yang akan kita buat nanti)
      const participantsCount = await db
        .collection("survey_responses")
        .countDocuments({ surveyUri: survey.uri });

      // Cek apakah survey masih aktif berdasarkan toggle active DAN belum melewati expiresAt
      const now = new Date();
      const expiresAt = survey.expiresAt
        ? new Date(survey.expiresAt)
        : new Date();
      const isActive = survey.active && expiresAt > now;

      return {
        id: survey._id.toString(),
        uri: survey.uri,
        title: survey.title,
        active: isActive,
        participants: participantsCount,
        reward: survey.rewardNC || 0,
      };
    }),
  );

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Manajemen Survey
          </h1>
          <p className="text-muted-foreground mt-1">
            Kelola kuesioner dan voting untuk driver Nismara Transport.
          </p>
        </div>
        <Link href="/dashboard/manage/surveys/create">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Buat Survey Baru
          </Button>
        </Link>
      </div>

      {/* SURVEYS GRID */}
      {surveys.length === 0 ? (
        <Card className="border-border bg-card text-center py-16 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center">
            <ClipboardList className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-xl font-medium text-foreground">
              Belum ada survey
            </h3>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              Anda belum menerbitkan survey apapun. Buat survey pertama Anda
              untuk mulai mengumpulkan feedback dari driver.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {surveys.map((survey) => (
            <Card
              key={survey.id}
              className="border-border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all flex flex-col"
            >
              <CardHeader className="pb-3 flex-none">
                <div className="flex justify-between items-start gap-4">
                  <CardTitle className="text-lg font-semibold line-clamp-2 leading-tight">
                    {survey.title}
                  </CardTitle>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider whitespace-nowrap ${
                      survey.active
                        ? "bg-accent-sky/10 text-accent-sky"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {survey.active ? "Aktif" : "Ditutup"}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="pb-4 flex-1">
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-foreground/70" />
                    <span>
                      <strong>{survey.participants}</strong> Partisipan
                    </span>
                  </div>
                  {survey.reward > 0 && (
                    <div className="flex items-center gap-2 text-accent-lilac">
                      <Coins className="w-4 h-4" />
                      <span className="font-medium">{survey.reward} NC</span>
                    </div>
                  )}
                </div>
              </CardContent>

              {/* TOMBOL ACTION (FOOTER) */}
              <CardFooter className="pt-4 border-t border-border gap-2">
                <Link
                  href={`/dashboard/manage/surveys/${survey.uri}/results`}
                  className="flex-1"
                >
                  <Button
                    variant="default"
                    className="w-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Hasil
                  </Button>
                </Link>
                <Link
                  href={`/dashboard/manage/surveys/${survey.uri}/edit`}
                  className="flex-none"
                >
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-border bg-background hover:bg-muted text-foreground"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
