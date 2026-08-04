"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle, AlertTriangle, ArrowRight, ArrowLeft, Clock, ShieldCheck, Flag } from "lucide-react";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

export default function ExamClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60); // 15 mins
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<any>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (started && !result) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleSubmit(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started, result]);

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quiz/start");
      const data = await res.json();
      if (data.success) {
        setAttemptId(data.attemptId);
        setQuestions(data.questions);
        
        // Cek jika ini re-start dan ada sisa waktu sebelumnya (kita simple aja reset ke 15m 
        // tapi di backend divalidasi startedAt. Kalau refresh page timer reset ke 15m tapi pas disubmit 
        // backend akan ukur dari startedAt)
        const diffSecs = Math.floor((new Date().getTime() - new Date(data.startedAt).getTime()) / 1000);
        const remaining = (15 * 60) - diffSecs;
        
        if (remaining <= 0) {
          Swal.fire({ icon: "error", title: "Waktu Habis", text: "Waktu pengerjaan ujian Anda sebelumnya sudah habis." });
          return;
        }
        
        setTimeLeft(remaining);
        setStarted(true);
      } else {
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: data.error,
          background: "#1e1e2d",
          color: "#ffffff"
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId: string, originalIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: originalIndex
    }));
  };

  const handleSubmit = async (isTimeout = false) => {
    if (!isTimeout) {
      const confirm = await Swal.fire({
        title: "Kirim Ujian?",
        text: "Anda tidak dapat mengubah jawaban setelah disubmit.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#10b981",
        confirmButtonText: "Ya, Kirim",
        cancelButtonText: "Batal",
        background: "#1e1e2d",
        color: "#ffffff"
      });
      if (!confirm.isConfirmed) return;
    }

    setLoading(true);
    try {
      const formattedAnswers = Object.entries(answers).map(([qId, sIdx]) => ({
        questionId: qId,
        selectedOptionIndex: sIdx
      }));

      // Kalau belum dijawab semua, sisanya tidak ada di array, di backend dihitung salah
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          answers: formattedAnswers
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setResult(data);
      } else {
        Swal.fire({ icon: "error", title: "Gagal", text: data.error, background: "#1e1e2d", color: "#ffffff" });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 border-4 shadow-[0_0_50px_rgba(0,0,0,0.5)] ${result.passed ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-red-500/20 border-red-500 text-red-400'}`}>
          {result.passed ? <CheckCircle className="w-12 h-12" /> : <AlertTriangle className="w-12 h-12" />}
        </div>
        <h1 className="text-4xl font-black text-white mb-2">
          {result.passed ? "LULUS!" : "TIDAK LULUS"}
        </h1>
        <p className="text-gray-400 text-lg max-w-md mb-8">
          Skor Anda adalah <span className="font-bold text-white">{result.score}</span>/100.
          <br/>
          {result.message}
        </p>
        <button 
          onClick={() => router.push("/dashboard")}
          className="bg-accent-lilac hover:bg-accent-lilac/80 px-8 py-3 rounded-xl font-bold text-white"
        >
          Kembali ke Dashboard
        </button>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="p-6 max-w-3xl mx-auto w-full pt-12">
        <div className="bg-card/50 border border-border/50 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-accent-lilac/20 text-accent-lilac rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-white mb-4">Ujian Kelayakan Promosi</h1>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto leading-relaxed">
            Sebagai bagian dari tahap akhir masa uji coba (intern), Anda diwajibkan untuk mengikuti kuis ini.
            Ujian ini akan menguji pemahaman Anda mengenai tata tertib dan SOP Nismara Transport.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 text-left">
            <div className="bg-black/30 p-4 rounded-xl border border-border/30">
              <Clock className="w-6 h-6 text-blue-400 mb-2" />
              <div className="font-bold text-white mb-1">Durasi 15 Menit</div>
              <div className="text-xs text-gray-500">Timer tidak akan berhenti meskipun Anda mereload halaman.</div>
            </div>
            <div className="bg-black/30 p-4 rounded-xl border border-border/30">
              <Flag className="w-6 h-6 text-emerald-400 mb-2" />
              <div className="font-bold text-white mb-1">20 Soal Pilihan</div>
              <div className="text-xs text-gray-500">Pastikan menjawab semua soal sebelum waktu habis.</div>
            </div>
            <div className="bg-black/30 p-4 rounded-xl border border-border/30">
              <CheckCircle className="w-6 h-6 text-yellow-400 mb-2" />
              <div className="font-bold text-white mb-1">KKM 80 Point</div>
              <div className="text-xs text-gray-500">Minimal 16 jawaban benar untuk lulus dan dipromosikan.</div>
            </div>
          </div>

          <button 
            onClick={handleStart}
            disabled={loading}
            className="w-full sm:w-auto bg-accent-lilac hover:bg-accent-lilac/80 px-10 py-4 rounded-xl font-black text-white text-lg transition-transform hover:scale-105"
          >
            {loading ? "Memproses..." : "Mulai Ujian Sekarang"}
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-card/80 backdrop-blur-md border border-border/50 p-4 rounded-2xl mb-6">
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <div className="bg-black/50 px-4 py-2 rounded-xl text-sm font-bold text-gray-300">
            Soal <span className="text-white text-lg">{currentIdx + 1}</span> / {questions.length}
          </div>
          <div className="text-sm font-bold text-gray-400">
            Terjawab: <span className="text-accent-lilac">{Object.keys(answers).length}</span>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xl font-mono ${timeLeft < 300 ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' : 'bg-black/50 text-white'}`}>
          <Clock className="w-5 h-5" />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Main Question Card */}
      <div className="bg-card border border-border/50 rounded-2xl p-6 md:p-8 mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-white leading-relaxed mb-8">
          {currentQ.question}
        </h2>
        
        <div className="space-y-3">
          {currentQ.options.map((opt: any, index: number) => {
            const isSelected = answers[currentQ._id] === opt.originalIndex;
            return (
              <button
                key={index}
                onClick={() => handleSelectOption(currentQ._id, opt.originalIndex)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200 border-2 ${
                  isSelected 
                    ? 'bg-accent-lilac/10 border-accent-lilac shadow-[0_0_20px_rgba(110,86,207,0.2)]' 
                    : 'bg-black/30 border-transparent hover:border-gray-600 hover:bg-black/50'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${isSelected ? 'border-accent-lilac bg-accent-lilac text-white' : 'border-gray-500'}`}>
                  {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                </div>
                <span className={`text-base md:text-lg ${isSelected ? 'text-white font-medium' : 'text-gray-300'}`}>
                  {opt.text}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
          disabled={currentIdx === 0}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-black/50 hover:bg-black transition-colors disabled:opacity-30"
        >
          <ArrowLeft className="w-4 h-4" /> Prev
        </button>
        
        {currentIdx === questions.length - 1 ? (
          <button
            onClick={() => handleSubmit(false)}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white bg-green-500 hover:bg-green-600 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105"
          >
            {loading ? "Mengirim..." : "Kirim Jawaban"} <CheckCircle className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-accent-lilac hover:bg-accent-lilac/80 transition-colors"
          >
            Next <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Mini map (Optional, for quick navigation) */}
      <div className="mt-12 flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
        {questions.map((q, idx) => {
          const isAns = answers[q._id] !== undefined;
          const isCur = idx === currentIdx;
          return (
            <button
              key={q._id}
              onClick={() => setCurrentIdx(idx)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                isCur ? 'bg-white text-black scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' 
                : isAns ? 'bg-accent-lilac text-white' 
                : 'bg-black/50 text-gray-500 border border-border/50 hover:border-gray-400'
              }`}
            >
              {idx + 1}
            </button>
          )
        })}
      </div>
    </div>
  );
}
