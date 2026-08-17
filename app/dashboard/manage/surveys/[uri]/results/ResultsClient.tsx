"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users, CheckCircle, BarChart3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";


export default function ResultsClient({ 
  survey, 
  responses, 
  totalResponses, 
  totalEligibleUsers 
}: { 
  survey: any; 
  responses: any[]; 
  totalResponses: number; 
  totalEligibleUsers: number; 
}) {
  const [activeTab, setActiveTab] = useState<"summary" | "individual">("summary");

  const participationRate = totalEligibleUsers > 0 
    ? Math.round((totalResponses / totalEligibleUsers) * 100) 
    : 0;

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
              {totalResponses} / {totalEligibleUsers} Responden ({participationRate}%)
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex gap-2 border-b border-border pb-px">
        <button
          onClick={() => setActiveTab("summary")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "summary"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Ringkasan Statistik
        </button>
        <button
          onClick={() => setActiveTab("individual")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "individual"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <List className="w-4 h-4" />
          Respons Individu
        </button>
      </div>

      {activeTab === "summary" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                  <CardTitle className="text-lg text-foreground leading-snug flex items-center justify-between">
                    <span>{index + 1}. {q.questionText}</span>
                    {q.conditions && q.conditions.length > 0 && (
                      <div className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-[10px] font-normal transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-border text-foreground">
                        Ada Logika Kondisional
                      </div>
                    )}
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
      )}
      
      {activeTab === "individual" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {responses.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-lg shadow-sm">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-20" />
              <p className="text-muted-foreground">Belum ada respons individu untuk ditampilkan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {responses.map((res, i) => (
                <Card key={res._id || i} className="border-border bg-card shadow-sm">
                  <CardHeader className="pb-3 border-b border-border bg-muted/10">
                    <CardTitle className="text-sm text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        Responden {i + 1}
                      </span>
                      <span className="text-xs text-muted-foreground font-normal">
                        {new Date(res.submittedAt).toLocaleString("id-ID", { timeZone: 'Asia/Jakarta' })} WIB
                      </span>
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-1">
                      Discord ID: {res.discordId}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-4">
                    {res.answers?.map((ans: any, idx: number) => (
                      <div key={idx} className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{ans.questionText}</p>
                        <div className="text-sm text-foreground bg-background p-2 rounded border border-border inline-block min-w-[200px]">
                          {Array.isArray(ans.answer) ? ans.answer.join(", ") : ans.answer || <span className="italic text-muted-foreground">Tidak dijawab</span>}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
