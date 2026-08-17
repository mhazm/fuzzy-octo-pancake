import clientPromise from "@/lib/mongodb";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import EditSurveyForm from "./EditSurveyForm";

export const metadata = {
  title: "Manage Edit",
};



export const dynamic = "force-dynamic";

// Menggunakan tipe "any" sementara untuk params agar aman dari perubahan versi Next.js
export default async function EditSurveyPage({ params }: any) {
  // 1. Await params (Mencegah error di Next.js versi terbaru)
  const resolvedParams = await params;
  const currentUri = resolvedParams.uri;

  // 2. CEK TERMINAL KAMU: Lihat apa isi dari currentUri ini
  console.log("🔍 MENCARI SURVEY DENGAN URI:", currentUri);

  const client = await clientPromise;
  const db = client.db();

  // 3. Cari di database
  const survey = await db.collection("surveys").findOne({ uri: currentUri });

  if (!survey) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4 opacity-80" />
        <h1 className="text-2xl font-bold text-foreground">
          Survey Tidak Ditemukan
        </h1>
        <p className="text-muted-foreground mt-2">
          Sistem mencoba mencari URI:{" "}
          <strong>{currentUri || "UNDEFINED"}</strong>
        </p>
        <Link href="/dashboard/manage/surveys">
          <Button
            className="mt-6 border-border bg-background text-foreground hover:bg-muted"
            variant="outline"
          >
            Kembali ke Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  // Transformasi data agar sesuai dengan skema React Hook Form / useFieldArray
  const initialData = {
    id: survey._id.toString(),
    title: survey.title,
    uri: survey.uri,
    description: survey.description,
    imageUrl: survey.imageUrl || "",
    targetSegment: survey.targetSegment || "all",
    rewardType: survey.rewardType || (survey.rewardNC > 0 ? "NC" : "NONE"),
    rewardAmount: survey.rewardAmount !== undefined ? survey.rewardAmount : (survey.rewardNC || 0),
    active: survey.active !== undefined ? survey.active : true,
    questions: survey.questions.map((q: any) => ({
      id: q.id || crypto.randomUUID(),
      questionText: q.questionText,
      type: q.type,
      required: q.required !== undefined ? q.required : true,
      conditionLogic: q.conditionLogic || "AND",
      conditions: q.conditions || [],
      // MongoDB menyimpan ["Opsi 1", "Opsi 2"], ubah menjadi [{value: "Opsi 1"}, {value: "Opsi 2"}]
      options: Array.isArray(q.options)
        ? q.options.map((opt: string) => ({ value: opt }))
        : [],
    })),
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <EditSurveyForm initialData={initialData} />
    </div>
  );
}
