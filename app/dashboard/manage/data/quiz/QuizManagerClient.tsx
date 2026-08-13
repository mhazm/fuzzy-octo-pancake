"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import Swal from "sweetalert2";

export default function QuizManagerClient() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/manage/quiz/questions");
      const data = await res.json();
      if (data.success) {
        setQuestions(data.questions);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setQuestion("");
    setOptions(["", ""]);
    setCorrectOptionIndex(0);
    setExplanation("");
    setIsActive(true);
    setEditingId(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (q: any) => {
    setQuestion(q.question);
    setOptions(q.options);
    setCorrectOptionIndex(q.correctOptionIndex);
    setExplanation(q.explanation || "");
    setIsActive(q.isActive);
    setEditingId(q._id);
    setIsModalOpen(true);
  };

  const addOption = () => {
    setOptions([...options, ""]);
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    const newOptions = options.filter((_, i) => i !== idx);
    setOptions(newOptions);
    if (correctOptionIndex >= newOptions.length) {
      setCorrectOptionIndex(0);
    } else if (correctOptionIndex === idx) {
      setCorrectOptionIndex(0);
    } else if (correctOptionIndex > idx) {
      setCorrectOptionIndex(correctOptionIndex - 1);
    }
  };

  const handleOptionChange = (idx: number, val: string) => {
    const newOptions = [...options];
    newOptions[idx] = val;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (options.some(opt => !opt.trim())) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Semua opsi jawaban harus diisi.",
        background: "#1e1e2d",
        color: "#ffffff"
      });
      return;
    }

    try {
      const url = editingId 
        ? `/api/manage/quiz/questions/${editingId}`
        : `/api/manage/quiz/questions`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, options, correctOptionIndex, explanation, isActive }),
      });

      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: `Soal berhasil ${editingId ? "diperbarui" : "ditambahkan"}.`,
          background: "#1e1e2d",
          color: "#ffffff"
        });
        setIsModalOpen(false);
        fetchQuestions();
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
    }
  };

  const handleDelete = async (id: string) => {
    const confirm = await Swal.fire({
      title: "Hapus Soal?",
      text: "Soal yang dihapus tidak dapat dikembalikan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#3b82f6",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      background: "#1e1e2d",
      color: "#ffffff"
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/api/manage/quiz/questions/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        fetchQuestions();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const filtered = questions.filter((q) =>
    search === "" || q.question.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white mb-2">Manajemen Kuis Intern</h1>
          <p className="text-gray-400 text-sm">
            Kelola daftar soal ujian kelayakan bagi sopir magang (Intern).
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-accent-lilac hover:bg-accent-lilac/80 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Soal
        </button>
      </div>

      {/* Search & Stats */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pertanyaan..."
            className="pl-10 pr-4 py-3 bg-black/50 border border-border/50 rounded-xl text-white text-sm focus:outline-none focus:border-accent-lilac w-full"
          />
        </div>
        <div className="bg-card/30 border border-border/30 px-4 py-3 rounded-xl flex items-center gap-2">
          <span className="text-gray-400 text-sm font-bold">Total Soal:</span>
          <span className="text-accent-lilac font-black text-lg">{questions.length}</span>
        </div>
      </div>

      {/* List Soal */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-accent-lilac/20 border-t-accent-lilac rounded-full"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card/30 border border-border/50 rounded-2xl">
          <h3 className="text-xl font-bold text-gray-300">Belum ada soal</h3>
          <p className="text-gray-500 mt-2">Tambahkan soal baru untuk memulai ujian kelayakan intern.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((q, index) => (
            <div key={q._id} className="bg-card/50 border border-border/50 rounded-2xl overflow-hidden">
              <div className="p-4 flex items-start gap-4">
                <div className="bg-black/50 w-10 h-10 rounded-xl flex items-center justify-center font-black text-gray-400 flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-base font-bold text-white mb-2 leading-tight">
                      {q.question}
                    </h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => openEditModal(q)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(q._id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setExpandedId(expandedId === q._id ? null : q._id)} className="p-2 text-gray-400 hover:bg-white/5 rounded-lg transition-colors">
                        {expandedId === q._id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  {expandedId === q._id && (
                    <div className="mt-4 space-y-2 border-t border-border/30 pt-4">
                      {q.options.map((opt: string, i: number) => (
                        <div key={i} className={`p-3 rounded-lg flex items-center gap-3 border ${i === q.correctOptionIndex ? 'bg-green-500/10 border-green-500/30' : 'bg-black/30 border-transparent'}`}>
                          {i === q.correctOptionIndex ? (
                            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          )}
                          <span className={i === q.correctOptionIndex ? 'text-green-100' : 'text-gray-400'}>{opt}</span>
                        </div>
                      ))}
                      {q.explanation && (
                        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                          <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Penjelasan Singkat</div>
                          <p className="text-sm text-blue-100 leading-relaxed">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-card border border-border/50 rounded-2xl w-full max-w-2xl overflow-hidden my-8">
            <div className="p-6 border-b border-border/50 flex justify-between items-center bg-black/20">
              <h2 className="text-xl font-bold text-white">
                {editingId ? "Edit Soal" : "Tambah Soal Baru"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Pertanyaan</label>
                <textarea
                  required
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full bg-black/50 border border-border/50 rounded-xl p-3 text-white focus:outline-none focus:border-accent-lilac min-h-[100px]"
                  placeholder="Tulis pertanyaan di sini..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-gray-300">Pilihan Jawaban</label>
                  <button type="button" onClick={addOption} className="text-xs text-accent-lilac hover:text-accent-lilac/80 font-bold flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Tambah Opsi
                  </button>
                </div>
                <div className="space-y-3">
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={correctOptionIndex === idx}
                        onChange={() => setCorrectOptionIndex(idx)}
                        className="w-4 h-4 text-accent-lilac bg-black border-gray-600 focus:ring-accent-lilac"
                        title="Tandai sebagai jawaban benar"
                      />
                      <input
                        type="text"
                        required
                        value={opt}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        className={`flex-1 bg-black/50 border ${correctOptionIndex === idx ? 'border-green-500/50' : 'border-border/50'} rounded-xl p-3 text-white focus:outline-none focus:border-accent-lilac`}
                        placeholder={`Opsi ${idx + 1}`}
                      />
                      {options.length > 2 && (
                        <button type="button" onClick={() => removeOption(idx)} className="p-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">Pilih radio button di sebelah kiri untuk menentukan jawaban yang benar.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Penjelasan (Opsional)</label>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  className="w-full bg-black/50 border border-border/50 rounded-xl p-3 text-white focus:outline-none focus:border-accent-lilac min-h-[80px]"
                  placeholder="Penjelasan mengapa jawaban tersebut benar..."
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-lilac"></div>
                  <span className="ml-3 text-sm font-bold text-gray-300">Status Aktif</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-white transition-colors">
                  Batal
                </button>
                <button type="submit" className="bg-accent-lilac hover:bg-accent-lilac/80 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors">
                  Simpan Soal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
