import clientPromise from "@/lib/mongodb";
import Link from "next/link";
import { ArrowLeft, Users, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {

  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export const metadata = {
  title: "Manage Results",
};



// Memaksa Next.js agar selalu mengambil data hasil survey terbaru (tanpa cache)
export const dynamic = "force-dynamic";

export default async function SurveyResultPage({ params }: any) {
  // 1. Await params (Mencegah error di Next.js versi terbaru)
  const resolvedParams = await params;
  const currentUri = resolvedParams.uri;
  const client = await clientPromise;
  const db = client.db();

  // 1. Ambil data master survey berdasarkan URI di URL
  const survey = await db.collection("surveys").findOne({ uri: currentUri });

  if (!survey) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4 opacity-80" />
        <h1 className="text-2xl font-bold text-foreground">
          Survey Tidak Ditemukan
        </h1>
        <p className="text-muted-foreground mt-2">
          URL slug mungkin salah atau survey telah dihapus oleh manajer lain.
        </p>
        <Link href="/dashboard/manage/surveys">
          <Button
            className="mt-6 bg-background border-border text-foreground hover:bg-muted"
            variant="outline"
          >
            Kembali ke Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  // 2. Ambil semua jawaban driver untuk survey ini
  // (Koleksi ini akan kita isi nanti saat driver submit form)
  const responses = await db
    .collection("survey_responses")
    .find({ surveyUri: currentUri })
    .toArray();
  const totalResponses = responses.length;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/manage/surveys">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 border-border bg-background hover:bg-muted"
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Hasil Survey</h1>
            <p className="text-sm text-muted-foreground">{survey.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-card px-4 py-2 rounded-lg border border-border shadow-sm">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {totalResponses} Responden
            </span>
          </div>
        </div>
      </div>

      {/* PERTANYAAN & JAWABAN (ANALYTICS) */}
      <div className="space-y-6">
        {survey.questions.map((q: any, index: number) => {
          const isChoice = q.type === "radio" || q.type === "checkbox";

          // Ambil semua jawaban teks bebas jika tipenya 'text'
          const textAnswers = !isChoice
            ? responses
                .map(
                  (r) =>
                    r.answers?.find(
                      (a: any) => a.questionText === q.questionText,
                    )?.answer,
                )
                .filter(Boolean) // Buang yang kosong/tidak diisi
            : [];

          return (
            <Card key={index} className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3 border-b border-border bg-muted/20">
                <CardTitle className="text-lg text-foreground leading-snug">
                  {index + 1}. {q.questionText}
                </CardTitle>
                <CardDescription className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mt-1">
                  Tipe:{" "}
                  {q.type === "text"
                    ? "Teks Bebas"
                    : q.type === "radio"
                      ? "Pilihan Ganda"
                      : "Kotak Centang"}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-5">
                {isChoice ? (
                  /* RENDER UNTUK PILIHAN GANDA / CHECKBOX (PROGRESS BAR) */
                  <div className="space-y-5">
                    {q.options.map((opt: string, i: number) => {
                      // Hitung berapa orang yang memilih opsi ini
                      let count = 0;
                      responses.forEach((res) => {
                        const ans = res.answers?.find(
                          (a: any) => a.questionText === q.questionText,
                        )?.answer;
                        if (Array.isArray(ans) && ans.includes(opt))
                          count++; // Untuk checkbox
                        else if (ans === opt) count++; // Untuk radio
                      });

                      const percentage =
                        totalResponses > 0
                          ? Math.round((count / totalResponses) * 100)
                          : 0;

                      return (
                        <div key={i} className="space-y-2">
                          <div className="flex justify-between text-sm text-foreground">
                            <span className="font-medium">{opt}</span>
                            <span className="text-muted-foreground">
                              {count} suara ({percentage}%)
                            </span>
                          </div>
                          {/* Progress Bar */}
                          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-in-out"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* RENDER UNTUK TEKS BEBAS (LIST JAWABAN) */
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                    {textAnswers.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        Belum ada responden yang menjawab.
                      </p>
                    ) : (
                      textAnswers.map((ans, i) => (
                        <div
                          key={i}
                          className="bg-background border border-border p-3 rounded-md text-sm text-foreground"
                        >
                          {ans}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
