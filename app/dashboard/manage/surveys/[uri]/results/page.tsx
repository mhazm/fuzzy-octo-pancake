import clientPromise from "@/lib/mongodb";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ResultsClient from "./ResultsClient";

export const metadata = {
  title: "Manage Results",
};

export const dynamic = "force-dynamic";

export default async function SurveyResultPage({ params }: any) {
  const resolvedParams = await params;
  const currentUri = resolvedParams.uri;
  const client = await clientPromise;
  const db = client.db();

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

  const responses = await db
    .collection("survey_responses")
    .find({ surveyUri: currentUri })
    .toArray();
    
  const totalResponses = responses.length;

  let totalEligibleUsers = 0;
  
  if (survey.targetSegment === "nismara_plus") {
    totalEligibleUsers = await db.collection("users").countDocuments({ 
      isDriver: true,
      "nismaraplus.status": true 
    });
  } else if (survey.targetSegment === "intern") {
    totalEligibleUsers = await db.collection("users").countDocuments({ 
      isDriver: true,
      truckyRole: "Magang" 
    });
  } else {
    // default: all
    totalEligibleUsers = await db.collection("users").countDocuments({ isDriver: true });
  }

  // Convert MongoDB ObjectIds to strings to avoid serialization errors when passing props
  const serializedSurvey = JSON.parse(JSON.stringify(survey));
  const serializedResponses = JSON.parse(JSON.stringify(responses));

  return (
    <ResultsClient
      survey={serializedSurvey}
      responses={serializedResponses}
      totalResponses={totalResponses}
      totalEligibleUsers={totalEligibleUsers}
    />
  );
}
