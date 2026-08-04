import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Coins,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import DriverSurveyForm from "./DriverSurveyForm";

export const dynamic = "force-dynamic";

export default async function DriverSurveyDetailPage({
  params,
}: {
  params: Promise<{ uri: string }>;
}) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto opacity-80" />
        <h1 className="text-2xl font-bold text-foreground">Akses Ditolak</h1>
        <p className="text-muted-foreground">
          Kamu harus login menggunakan akun Discord terlebih dahulu untuk
          mengisi survey.
        </p>
        <Link href="/login">
          <Button className="bg-primary text-primary-foreground">
            Login dengan Discord
          </Button>
        </Link>
      </div>
    );
  }

  const discordId = (session.user as any).id || (session.user as any).discordId;

  const client = await clientPromise;
  const db = client.db();

  // Ambil data survey
  const survey = await db
    .collection("surveys")
    .findOne({ uri: resolvedParams.uri });

  if (!survey) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto opacity-80" />
        <h1 className="text-2xl font-bold text-foreground">
          Survey Tidak Ditemukan
        </h1>
        <p className="text-muted-foreground">
          Kuesioner yang kamu cari tidak tersedia atau sudah dihapus.
        </p>
        <Link href="/surveys">
          <Button
            variant="outline"
            className="border-border bg-background text-foreground"
          >
            Kembali
          </Button>
        </Link>
      </div>
    );
  }

  // Cek masa aktif (Expired / Ditutup)
  const now = new Date();
  const expiresAt = survey.expiresAt ? new Date(survey.expiresAt) : new Date();
  const isExpired = expiresAt < now || !survey.active;

  // CEK APAKAH USER SUDAH PERNAH MENGISI SURVEY INI
  const existingResponse = await db.collection("survey_responses").findOne({
    surveyUri: resolvedParams.uri,
    discordId: discordId,
  });

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* Tombol Kembali */}
      <div className="flex items-center gap-4">
        <Link href="/surveys">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 border-border bg-background hover:bg-muted text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-foreground">
          Partisipasi Survey
        </h1>
      </div>

      {/* KONDISI 1: JIKA SURVEY SUDAH DITUTUP / EXPIRED */}
      {isExpired ? (
        <Card className="border-border bg-card text-center py-12">
          <CardContent className="space-y-4">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
            <h2 className="text-xl font-semibold text-foreground">
              Survey Telah Ditutup
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Maaf, periode pengisian untuk survey{" "}
              <strong>{survey.title}</strong> telah berakhir atau ditutup oleh
              manajer.
            </p>
          </CardContent>
        </Card>
      ) : existingResponse ? (
        /* KONDISI 2: JIKA USER SUDAH MENGISI SEBELUMNYA */
        <Card className="border-border bg-card text-center py-12 shadow-sm">
          <CardContent className="space-y-4 flex flex-col items-center">
            <CheckCircle2 className="w-14 h-14 text-accent-sky mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">
              Terima Kasih!
            </h2>
            <p className="text-muted-foreground max-w-md">
              Kamu sudah mengisi survey <strong>{survey.title}</strong>{" "}
              sebelumnya. Setiap driver hanya diperbolehkan berpartisipasi 1
              kali.
            </p>
            <div className="pt-2">
              <Link href="/dashboard">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Kembali ke Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* KONDISI 3: TAMPILKAN FORMULIR SURVEY UNTUK DIISI */
        <Card className="border-border bg-card text-card-foreground shadow-sm">
          <CardHeader className="space-y-3 pb-6 border-b border-border">
            <div className="flex justify-between items-start gap-4">
              <CardTitle className="text-2xl text-foreground">
                {survey.title}
              </CardTitle>
              {survey.rewardNC > 0 && (
                <div className="flex items-center gap-1.5 bg-accent-lilac/10 text-accent-lilac px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                  <Coins className="w-4 h-4" />
                  <span>+{survey.rewardNC} NC</span>
                </div>
              )}
            </div>
            <CardDescription className="text-muted-foreground whitespace-pre-line leading-relaxed">
              {survey.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <DriverSurveyForm survey={JSON.parse(JSON.stringify(survey))} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
