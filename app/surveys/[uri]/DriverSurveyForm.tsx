"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitSurveyAction } from "./actions";

export default function DriverSurveyForm({ survey }: { survey: any }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    checked: boolean,
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validasi pertanyaan wajib (required) di sisi klien
    for (const q of survey.questions) {
      if (q.required) {
        const val = answersState[q.questionText];
        if (
          val === undefined ||
          val === "" ||
          (Array.isArray(val) && val.length === 0)
        ) {
          alert(`❌ Pertanyaan "${q.questionText}" wajib diisi!`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      // Format data agar sesuai dengan skema Server Action
      const formattedAnswers = Object.keys(answersState).map((qText) => ({
        questionText: qText,
        answer: answersState[qText],
      }));

      const response = await submitSurveyAction({
        surveyUri: survey.uri,
        answers: formattedAnswers,
      });

      if (response.success) {
        alert(`✅ ${response.message}`);
        router.push("/surveys");
        router.refresh();
      } else {
        alert(`❌ Gagal: ${response.error}`);
      }
    } catch (error) {
      alert("Terjadi kesalahan jaringan saat mengirim jawaban.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {survey.questions.map((q: any, index: number) => (
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
                        e.target.checked,
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
      ))}

      <div className="flex justify-end pt-4 border-t border-border">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isSubmitting ? (
            "Mengirim Jawaban..."
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" /> Kirim Jawaban Survey
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
