import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";
import {
  ClipboardList,
  Coins,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {

  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";

export const metadata = {
  title: "Surveys",
};



export const dynamic = "force-dynamic";

export default async function SurveysIndexPage() {
  const session = await getServerSession(authOptions);

  // Ambil discordId user saat ini untuk mengecek status partisipasi
  const discordId = session?.user
    ? (session.user as any).id || (session.user as any).discordId
    : null;

  const client = await clientPromise;
  const db = client.db();
  const now = new Date();

  // Ambil hanya survey yang masih aktif dan belum kedaluwarsa
  const surveys = await db
    .collection("surveys")
    .find({
      active: true,
      expiresAt: { $gt: now },
    })
    .sort({ _id: -1 })
    .toArray();

  // Jika user login, ambil data respons mereka untuk menandai survey yang sudah diisi
  let userResponses: string[] = [];
  if (discordId) {
    const responses = await db
      .collection("survey_responses")
      .find({ discordId })
      .project({ surveyUri: 1 })
      .toArray();
    userResponses = responses.map((r) => r.surveyUri);
  }

  return (
    <main className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent-sky/10 rounded-full blur-[120px] -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-12">
        {/* HEADER */}
        <header className="text-center max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4 tracking-tight">
            Survey & Polling <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-accent-sky">Nismara</span>
          </h1>
          <p className="text-lg text-foreground/60 leading-relaxed">
            Suara Anda sangat berarti bagi perkembangan Nismara Transport. Ikuti survey yang tersedia, berikan tanggapan Anda, dan dapatkan hadiah Nismara Coin!
          </p>
        </header>

      {/* JIKA BELUM LOGIN - PERINGATAN KECIL */}
      {!session && (
        <div className="bg-card/30 backdrop-blur-sm border border-dashed border-primary/30 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center border border-border shrink-0 mx-auto sm:mx-0">
              <AlertCircle className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm md:text-base text-foreground/80 font-medium">
              Anda belum login. Silakan login untuk dapat mengisi survey yang tersedia.
            </p>
          </div>
          <Link href="/login" className="w-full sm:w-auto shrink-0">
            <Button
              className="w-full sm:w-auto font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
            >
              Login Sekarang
            </Button>
          </Link>
        </div>
      )}

      {/* DAFTAR SURVEY */}
      {surveys.length === 0 ? (
        <div className="bg-card/30 backdrop-blur-sm rounded-2xl p-16 text-center border border-border border-dashed shadow-sm">
          <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center mx-auto mb-6 border border-border">
            <ClipboardList className="w-8 h-8 text-foreground/40" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-3">
            Tidak ada survey aktif
          </h3>
          <p className="text-foreground/50 max-w-md mx-auto text-lg">
            Saat ini tidak ada survey yang sedang berjalan. Silakan cek kembali nanti!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {surveys.map((survey) => {
            const hasAnswered = userResponses.includes(survey.uri);
            const isReward = survey.rewardNC > 0;

            return (
              <Card
                key={survey._id.toString()}
                className={`bg-card/50 backdrop-blur-md rounded-2xl shadow-xl border overflow-hidden flex flex-col transition-all duration-300 group ${
                  hasAnswered
                    ? "opacity-60 border-border"
                    : "border-border hover:scale-[1.02] hover:shadow-primary/20 hover:border-primary/50"
                }`}
              >
                <CardHeader className="pb-4 flex-none bg-muted/30 border-b border-border/50">
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="text-xl font-bold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                      {survey.title}
                    </CardTitle>
                    {isReward && !hasAnswered && (
                      <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider whitespace-nowrap bg-accent-lilac/15 text-accent-lilac border border-accent-lilac/20">
                        <Coins className="w-3.5 h-3.5" />
                        +{survey.rewardNC} NC
                      </span>
                    )}
                    {hasAnswered && (
                      <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider whitespace-nowrap bg-green-500/10 text-green-500 border border-green-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Selesai
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-6 pb-6 flex-1 flex flex-col">
                  <CardDescription className="text-sm line-clamp-3 text-foreground/70 mb-6 flex-1">
                    {survey.description}
                  </CardDescription>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50 text-xs font-medium">
                    <span className="text-foreground/60 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> Ditutup
                    </span>
                    <span className="text-foreground font-bold">
                      {new Date(survey.expiresAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="pt-0 pb-6 px-6">
                  <Link href={`/surveys/${survey.uri}`} className="w-full">
                    <Button
                      className={`w-full font-bold rounded-xl h-12 transition-all ${
                        hasAnswered 
                          ? "bg-muted text-foreground/50 border border-border" 
                          : "shadow-lg shadow-primary/20 group-hover:shadow-primary/40"
                      }`}
                      variant={hasAnswered ? "secondary" : "default"}
                      disabled={hasAnswered}
                    >
                      {hasAnswered ? "Telah Diisi" : "Isi Survey Sekarang"}
                      {!hasAnswered && (
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      )}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
      </div>
    </main>
  );
}
