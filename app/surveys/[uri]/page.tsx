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
  Star,
  Users,
  Ticket,
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
import Image from "next/image";
import { Metadata } from "next";

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const resolvedParams = await params;
  const client = await clientPromise;
  const db = client.db();
  const survey = await db
    .collection("surveys")
    .findOne({ uri: resolvedParams.uri });
  if (!survey) return { title: "Survey Not Found" };

  const metadata: Metadata = {
    title: survey.title,
    description: survey.description,
  };

  if (survey.imageUrl) {
    metadata.openGraph = {
      images: [survey.imageUrl],
    };
    metadata.twitter = {
      card: "summary_large_image",
      images: [survey.imageUrl],
    };
  }

  return metadata;
}

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

  const { ObjectId } = require("mongodb");
  const userInDb = await db
    .collection("users")
    .findOne({ _id: new ObjectId((session.user as any)._id) });

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

  // CEK ELIGIBILITY SEGMENT
  let isNotEligible = false;
  let eligibilityMessage = "";
  if (survey.targetSegment === "nismara_plus") {
    if (!userInDb?.nismaraplus?.status) {
      isNotEligible = true;
      eligibilityMessage = "Survey ini khusus untuk pengguna Nismara+ aktif.";
    }
  } else if (survey.targetSegment === "intern") {
    if (userInDb?.truckyRole !== "Magang") {
      isNotEligible = true;
      eligibilityMessage = "Survey ini khusus untuk Driver Intern (Magang).";
    }
  }

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
      ) : isNotEligible ? (
        /* KONDISI 2: JIKA USER TIDAK ELIGIBLE */
        <Card className="border-border bg-card text-center py-12 shadow-sm">
          <CardContent className="space-y-4 flex flex-col items-center">
            <AlertCircle className="w-14 h-14 text-destructive mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">
              Akses Ditolak
            </h2>
            <p className="text-muted-foreground max-w-md">
              {eligibilityMessage}
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
        <Card className="border-border bg-card text-card-foreground shadow-sm overflow-hidden">
          {survey.imageUrl && (
            <div className="relative w-full h-48 md:h-64 lg:h-72">
              <Image
                src={survey.imageUrl}
                alt={survey.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}
          <CardHeader className="space-y-3 pb-6 border-b border-border relative">
            <div className="flex flex-col items-start gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {survey.targetSegment === "nismara_plus" && (
                  <span className="flex items-center gap-1 text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-sm uppercase tracking-wider bg-accent-amber/15 text-accent-amber border border-accent-amber/20">
                    <Star className="w-3.5 h-3.5" />
                    Nismara+
                  </span>
                )}
                {survey.targetSegment === "intern" && (
                  <span className="flex items-center gap-1 text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-sm uppercase tracking-wider bg-muted text-muted-foreground border border-border">
                    <Users className="w-3.5 h-3.5" />
                    Driver Intern
                  </span>
                )}

                {(() => {
                  const rewardType = survey.rewardType || "NC";
                  const rewardAmount =
                    survey.rewardAmount !== undefined
                      ? survey.rewardAmount
                      : survey.rewardNC || 0;

                  if (rewardAmount > 0 && rewardType !== "NONE") {
                    return (
                      <div
                        className={`flex items-center gap-1 text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-sm uppercase tracking-wider border ${
                          rewardType === "NC"
                            ? "bg-accent-lilac/15 text-accent-lilac border-accent-lilac/20"
                            : "bg-accent-emerald/15 text-accent-emerald border-accent-emerald/20"
                        }`}
                      >
                        {rewardType === "NC" ? (
                          <Coins className="w-3.5 h-3.5" />
                        ) : (
                          <Ticket className="w-3.5 h-3.5" />
                        )}
                        <span>
                          +{rewardAmount}{" "}
                          {rewardType === "NC" ? "NC" : "Penalti"}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
              <CardTitle className="text-2xl md:text-3xl text-foreground font-black tracking-tight leading-tight">
                {survey.title}
              </CardTitle>
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
