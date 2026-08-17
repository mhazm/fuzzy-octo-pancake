"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitSurveyAction } from "./actions";
import { showAlert } from "@/lib/dialog";
import TurnstileWidget from "@/components/ui/TurnstileWidget";

export default function DriverSurveyForm({ survey }: { survey: any }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // State untuk menampung jawaban driver: { [questionText]: value }
  const [answersState, setAnswersState] = useState<{ [key: string]: any }>({});

  const handleInputChange = (questionText: string, value: any) => {
    setAnswersState((prev) => ({
      ...prev,
      [questionText]: value,
    }));
  };

  const handleCheckboxChange = (
    questionText: string,
    option: string,
    checked: boolean
  ) => {
    setAnswersState((prev) => {
      const currentList = prev[questionText] || [];
      if (checked) {
        return { ...prev, [questionText]: [...currentList, option] };
      } else {
        return {
          ...prev,
          [questionText]: currentList.filter((item: string) => item !== option),
        };
      }
    });
  };

  // Fungsi untuk mengevaluasi apakah pertanyaan harus ditampilkan
  const evaluateCondition = (q: any) => {
    if (!q.conditions || q.conditions.length === 0) return true;

    const conditionResults = q.conditions.map((cond: any) => {
      const depQ = survey.questions.find(
        (sq: any) => sq.id === cond.dependentQuestionId
      );
      if (!depQ) return false;

      const userAns = answersState[depQ.questionText];
      if (userAns === undefined) return false;

      const isArray = Array.isArray(userAns);
      const strUserAns = String(userAns || "").toLowerCase();
      const strCondVal = String(cond.value || "").toLowerCase();

      switch (cond.operator) {
        case "equals":
          return isArray
            ? userAns.includes(cond.value)
            : strUserAns === strCondVal;
        case "not_equals":
          return isArray
            ? !userAns.includes(cond.value)
            : strUserAns !== strCondVal;
        case "contains":
          return isArray
            ? userAns.some((v: string) =>
                String(v).toLowerCase().includes(strCondVal)
              )
            : strUserAns.includes(strCondVal);
        default:
          return false;
      }
    });

    if (q.conditionLogic === "OR") {
      return conditionResults.some((res: boolean) => res === true);
    }
    // Default is AND
    return conditionResults.every((res: boolean) => res === true);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validasi Turnstile
    if (!turnstileToken) {
      await showAlert("⚠️ Selesaikan verifikasi keamanan terlebih dahulu sebelum mengirim jawaban.");
      return;
    }

    // Hanya validasi pertanyaan yang TERTAMPIL di layar
    const visibleQuestions = survey.questions.filter((q: any) =>
      evaluateCondition(q)
    );

    for (const q of visibleQuestions) {
      if (q.required) {
        const val = answersState[q.questionText];
        if (
          val === undefined ||
          val === "" ||
          (Array.isArray(val) && val.length === 0)
        ) {
          await showAlert(`❌ Pertanyaan "${q.questionText}" wajib diisi!`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const formattedAnswers = visibleQuestions.map((q: any) => ({
        questionText: q.questionText,
        answer: answersState[q.questionText],
      }));

      const response = await submitSurveyAction({
        surveyUri: survey.uri,
        turnstileToken,
        answers: formattedAnswers,
      });

      if (response.success) {
        await showAlert(`✅ ${response.message}`);
        router.push("/surveys");
        router.refresh();
      } else {
        // If Turnstile failed, reset widget so user can re-solve
        if (response.error?.includes("Turnstile") || response.error?.includes("verifikasi")) {
          setTurnstileToken(null);
        }
        await showAlert(`❌ Gagal: ${response.error}`);
      }
    } catch (error) {
      await showAlert("Terjadi kesalahan jaringan saat mengirim jawaban.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {survey.questions.map((q: any, index: number) => {
        if (!evaluateCondition(q)) return null;

        return (
          <div
            key={index}
            className="space-y-3 p-4 rounded-lg border border-border bg-background"
          >
            <label className="block font-medium text-foreground text-base">
              {index + 1}. {q.questionText}{" "}
              {q.required && <span className="text-destructive">*</span>}
            </label>

            {/* RENDER JIKA TEKS BEBAS */}
            {q.type === "text" && (
              <Textarea
                className="bg-card border-border text-foreground resize-none h-24"
                placeholder="Ketik jawabanmu di sini..."
                onChange={(e) =>
                  handleInputChange(q.questionText, e.target.value)
                }
                required={q.required}
              />
            )}

            {/* RENDER JIKA PILIHAN GANDA (RADIO) */}
            {q.type === "radio" && (
              <div className="space-y-2 pt-1">
                {q.options.map((opt: string, optIdx: number) => (
                  <label
                    key={optIdx}
                    className="flex items-center gap-3 text-sm text-foreground cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                  >
                    <input
                      type="radio"
                      name={`question-${index}`}
                      value={opt}
                      onChange={(e) =>
                        handleInputChange(q.questionText, e.target.value)
                      }
                      className="accent-primary w-4 h-4"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {/* RENDER JIKA KOTAK CENTANG (CHECKBOX) */}
            {q.type === "checkbox" && (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-muted-foreground italic">
                  Bisa pilih lebih dari satu
                </p>
                {q.options.map((opt: string, optIdx: number) => (
                  <label
                    key={optIdx}
                    className="flex items-center gap-3 text-sm text-foreground cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      value={opt}
                      onChange={(e) =>
                        handleCheckboxChange(
                          q.questionText,
                          opt,
                          e.target.checked
                        )
                      }
                      className="accent-primary w-4 h-4 rounded"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* ── Turnstile Verification ── */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Selesaikan verifikasi keamanan sebelum mengirim jawaban:
        </p>
        <TurnstileWidget
          onVerify={(token) => setTurnstileToken(token)}
          onExpire={() => setTurnstileToken(null)}
          onError={() => setTurnstileToken(null)}
          theme="auto"
        />
        {turnstileToken && (
          <p className="text-xs text-green-500 flex items-center gap-1">
            ✅ Verifikasi berhasil
          </p>
        )}
      </div>

      <div className="flex justify-end pt-4 border-t border-border">
        <Button
          type="submit"
          disabled={isSubmitting || !turnstileToken}
          className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Mengirim Jawaban...
            </span>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Kirim Jawaban Survey
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
