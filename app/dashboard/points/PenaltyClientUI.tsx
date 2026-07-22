"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Coins,
  History,
  ShieldAlert,
  CheckCircle2,
  Zap,
  ChevronLeft,
  ChevronRight,
  Wallet,
  X,
  Info,
} from "lucide-react";
import { payPenaltyPoints, validateJobPoints } from "./actions";
import { createPenaltyPayment } from "@/app/actions/payment";

interface HistoryItem {
  _id: string;
  points: number;
  reason: string;
  type: "add" | "remove";
  createdAt: string | Date;
}

interface PenaltyClientUIProps {
  initialPoints: number;
  totalNC: number;
  pointPrice: number;
  discountBooster: number; // Tambahan prop discount
  history: HistoryItem[];
  eligibleJobs: any[];
}

export default function PenaltyClientUI({
  initialPoints,
  totalNC,
  pointPrice,
  discountBooster,
  history,
  eligibleJobs,
}: PenaltyClientUIProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pointsToPay, setPointsToPay] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isRupiahModalOpen, setIsRupiahModalOpen] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const totalItems = eligibleJobs.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentJobs = eligibleJobs.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  const PRICE_PER_POINT = 3000;
  const ADMIN_FEE = 4000;
  const subtotal = pointsToPay * PRICE_PER_POINT;
  const totalRupiah = subtotal + ADMIN_FEE;

  // Kalkulasi Harga Akhir NC
  const finalPointPrice = Math.max(0, pointPrice - discountBooster);
  const totalCost = pointsToPay * finalPointPrice;
  const totalSavedDiscount = pointsToPay * discountBooster;
  const MAX_POINTS = 50;

  // Kalkulasi persentase bar
  const progressPercentage = Math.min((initialPoints / MAX_POINTS) * 100, 100);

  // Tentukan status bahaya
  let statusColor = "bg-green-500";
  let statusText = "Aman";
  if (initialPoints >= 50) {
    statusColor = "bg-red-600";
    statusText = "Penalty 3 (Kritis)";
  } else if (initialPoints >= 25) {
    statusColor = "bg-orange-500";
    statusText = "Penalty 2 (Peringatan Keras)";
  } else if (initialPoints >= 10) {
    statusColor = "bg-yellow-500";
    statusText = "Penalty 1 (Peringatan)";
  }

  const handlePayment = async () => {
    setIsLoading(true);
    setMessage(null);

    const result = await payPenaltyPoints(pointsToPay);

    if (result.success) {
      setMessage({ text: result.message, type: "success" });
      setTimeout(() => setIsModalOpen(false), 2000);
    } else {
      setMessage({ text: result.message, type: "error" });
    }

    setIsLoading(false);
  };

  const handleValidation = async (jobId: string) => {
    if (!confirm("Validasi job ini untuk pengurangan poin penalti?")) return;
    setIsLoading(true);
    const res = await validateJobPoints(jobId);
    if (res.success) {
      alert(res.message);
      if (currentJobs.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } else {
      alert(res.message);
    }
    setIsLoading(false);
  };

  const handleRupiahPayment = async () => {
    setIsLoading(true);
    try {
      const res = await createPenaltyPayment(pointsToPay);

      if (res.token) {
        (window as any).snap.pay(res.token, {
          onSuccess: (result: any) => {
            alert("Pembayaran Berhasil!");
            setIsRupiahModalOpen(false);
          },
          onPending: (result: any) => {
            alert("Menunggu pembayaran...");
          },
          onError: (result: any) => {
            alert("Pembayaran gagal!");
          },
          onClose: () => {
            setIsLoading(false);
          },
        });
      }
    } catch (error) {
      alert("Terjadi kesalahan sistem.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Kartu Status Utama */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between pb-2 space-y-0">
            <h3 className="tracking-tight text-sm font-medium">
              Total Poin Penalti
            </h3>
            <ShieldAlert
              className={`h-4 w-4 ${initialPoints >= 25 ? "text-red-500" : "text-muted-foreground"}`}
            />
          </div>
          <div className="text-4xl font-bold">
            {initialPoints}{" "}
            <span className="text-lg text-muted-foreground font-normal">
              / 50
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Status saat ini:{" "}
            <strong className={statusColor.replace("bg-", "text-")}>
              {statusText}
            </strong>
          </p>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between pb-2 space-y-0">
            <h3 className="tracking-tight text-sm font-medium">
              Saldo Nismara Coin (NC)
            </h3>
            <Coins className="h-4 w-4 text-yellow-500" />
          </div>
          <div className="text-4xl font-bold">
            {totalNC.toLocaleString("id-ID")}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Harga penebusan: {pointPrice.toLocaleString("id-ID")} NC / Poin
          </p>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow p-6 flex flex-col justify-center items-center">
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={initialPoints === 0}
            className="w-full h-full min-h-[80px] bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Coins className="h-5 w-5" />
            {initialPoints === 0 ? "Poin Penalti Bersih" : "Bayar Penalti"}
          </button>
        </div>
      </div>

      {/* Progress Bar Batas Penalty */}
      <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
        <h3 className="font-semibold mb-4">Batas Maksimal Penalti</h3>
        <div className="relative w-full h-6 bg-secondary rounded-full overflow-hidden">
          <div
            className={`absolute top-0 left-0 h-full transition-all duration-500 ease-in-out ${statusColor}`}
            style={{ width: `${progressPercentage}%` }}
          />
          {/* Markers */}
          <div className="absolute top-0 left-[20%] h-full border-l-2 border-background/50 z-10"></div>{" "}
          {/* 10 Poin */}
          <div className="absolute top-0 left-[50%] h-full border-l-2 border-background/50 z-10"></div>{" "}
          {/* 25 Poin */}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2 relative">
          <span>0</span>
          <span className="absolute left-[20%] -translate-x-1/2">
            10 (Pen. 1)
          </span>
          <span className="absolute left-[50%] -translate-x-1/2">
            25 (Pen. 2)
          </span>
          <span>50 (Pen. 3)</span>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="font-bold">Validasi Job Hardcore</h3>
            <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-full">
              TOTAL: {totalItems} JOBS
            </span>
          </div>

          {/* Kontrol Navigasi Atas (Opsional/Mobile Friendly) */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border hover:bg-secondary disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border hover:bg-secondary disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {totalItems === 0 ? (
          <div className="p-8 text-center border-2 border-dashed rounded-xl text-muted-foreground bg-foreground/[0.01]">
            Tidak ada job hardcore ({">"}4 HC) yang tersedia untuk divalidasi.
          </div>
        ) : (
          <div className="space-y-3">
            {currentJobs.map((job) => (
              <div
                key={job._id}
                className="flex items-center justify-between p-4 border rounded-xl bg-foreground/[0.02] hover:border-primary/30 transition-colors group"
              >
                <div>
                  <p className="font-bold text-sm group-hover:text-primary transition-colors">
                    #{job.jobId} - {job.sourceCity} ke {job.destinationCity}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {job.distance} km • {job.hardcorePoints} HC Points
                  </p>
                </div>
                <button
                  onClick={() => handleValidation(job._id)}
                  disabled={isLoading}
                  className="px-4 py-2 bg-primary text-white md:bg-primary/10 md:text-primary md:hover:bg-primary md:hover:text-white rounded-lg text-xs font-black transition-all"
                >
                  VALIDASI (-{job.potentialReduction})
                </button>
              </div>
            ))}

            {/* Footer Informasi & Navigasi Bawah */}
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-dashed">
              <p className="text-[10px] text-muted-foreground italic">
                * Menampilkan {startIndex + 1}-
                {Math.min(startIndex + ITEMS_PER_PAGE, totalItems)} dari{" "}
                {totalItems} job.
              </p>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  {/* Tombol halaman nomor bisa ditambahkan di sini jika perlu */}
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold border rounded-lg hover:bg-secondary disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold border rounded-lg hover:bg-secondary disabled:opacity-30 transition-colors"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabel Riwayat */}
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-6 pb-4 border-b flex items-center gap-2">
          <History className="w-5 h-5" />
          <h3 className="font-semibold text-lg">Riwayat Poin</h3>
        </div>
        <div className="p-0">
          {history.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Belum ada riwayat poin.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-secondary/50 uppercase">
                  <tr>
                    <th className="px-6 py-3">Tanggal</th>
                    <th className="px-6 py-3">Tipe</th>
                    <th className="px-6 py-3">Jumlah</th>
                    <th className="px-6 py-3">Alasan</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr
                      key={item._id}
                      className="border-b last:border-0 hover:bg-muted/50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4">
                        {item.type === "add" ? (
                          <span className="inline-flex items-center gap-1 text-red-500 bg-red-500/10 px-2 py-1 rounded text-xs font-medium">
                            <AlertTriangle className="w-3 h-3" /> Penalti
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-green-500 bg-green-500/10 px-2 py-1 rounded text-xs font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Pengurangan
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold">
                        {item.type === "add" ? "+" : "-"}
                        {item.points}
                      </td>
                      <td
                        className="px-6 py-4 max-w-md truncate"
                        title={item.reason}
                      >
                        {item.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Pembayaran */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border shadow-xl rounded-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <h2 className="text-xl font-bold mb-4">Bayar Poin Penalti</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Pilih jumlah poin yang ingin dibayar. Pembayaran akan langsung
              memotong Nismara Coin (NC) Anda.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Jumlah Poin
                </label>
                <input
                  type="number"
                  min="1"
                  max={initialPoints}
                  value={pointsToPay}
                  onChange={(e) =>
                    setPointsToPay(
                      Math.min(
                        initialPoints,
                        Math.max(1, parseInt(e.target.value) || 1),
                      ),
                    )
                  }
                  className="w-full border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Tampilan UI Diskon Detail */}
              <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Harga Normal (per poin):
                  </span>
                  <span>{pointPrice.toLocaleString("id-ID")} NC</span>
                </div>

                {discountBooster > 0 && (
                  <div className="flex justify-between text-sm text-green-500 font-medium">
                    <span>💎 Diskon Booster:</span>
                    <span>-{discountBooster.toLocaleString("id-ID")} NC</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-3 border-t border-border/50">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">Total Biaya:</span>

                    {/* Badge Total Penghematan */}
                    {totalSavedDiscount > 0 && (
                      <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-2.5 py-1 rounded-md mt-1 w-fit flex items-center gap-1 border border-green-500/20">
                        ✨ Hemat {totalSavedDiscount.toLocaleString("id-ID")} NC
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-2xl font-black flex items-center gap-1.5 ${totalNC < totalCost ? "text-red-500" : "text-primary"}`}
                  >
                    {totalCost.toLocaleString("id-ID")}{" "}
                    <Coins className="w-5 h-5" />
                  </span>
                </div>
              </div>

              {totalNC < totalCost && (
                <p className="text-xs text-red-500 font-medium">
                  * Saldo NC Anda tidak mencukupi.
                </p>
              )}

              {message && (
                <div
                  className={`p-3 rounded-md text-sm ${message.type === "success" ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}
                >
                  {message.text}
                </div>
              )}

              <div className="flex gap-2 justify-end mt-6">
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-md hover:bg-secondary text-sm font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handlePayment}
                  disabled={
                    totalNC < totalCost || isLoading || pointsToPay <= 0
                  }
                  className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Memproses..." : "Konfirmasi Bayar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isRupiahModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-[2.5rem] border shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            {/* Header */}
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-black flex items-center gap-2">
                <Wallet className="text-blue-500" /> Tebus Poin IDR
              </h2>
              <button
                onClick={() => setIsRupiahModalOpen(false)}
                className="text-foreground/40 hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">
                  Jumlah Poin yang Ditebus
                </label>
                <div className="flex items-center gap-4 mt-2">
                  <input
                    type="number"
                    min="1"
                    max={initialPoints}
                    value={pointsToPay}
                    onChange={(e) => setPointsToPay(Number(e.target.value))}
                    className="flex-1 p-4 bg-foreground/5 rounded-2xl border-0 focus:ring-2 ring-blue-500 font-bold"
                  />
                  <span className="font-bold text-sm text-foreground/60">
                    Poin
                  </span>
                </div>
              </div>

              {/* Rincian Biaya */}
              <div className="space-y-3 bg-foreground/[0.03] p-5 rounded-3xl border border-dashed">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground/50 font-medium">
                    Harga Poin ({pointsToPay} x 5rb)
                  </span>
                  <span className="font-bold">
                    Rp {subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-blue-500">
                  <span className="font-medium flex items-center gap-1">
                    Biaya Admin <Info size={12} />
                  </span>
                  <span className="font-bold">
                    Rp {ADMIN_FEE.toLocaleString()}
                  </span>
                </div>
                <div className="pt-3 border-t flex justify-between items-center">
                  <span className="font-black text-xs uppercase">
                    Total Bayar
                  </span>
                  <span className="text-2xl font-black text-blue-600">
                    Rp {totalRupiah.toLocaleString()}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-center text-foreground/40 leading-relaxed px-4">
                Pembayaran menggunakan Midtrans. Poin akan berkurang secara
                otomatis setelah status pembayaran menjadi{" "}
                <span className="font-bold italic">Settlement</span>.
              </p>

              <button
                onClick={handleRupiahPayment}
                disabled={
                  isLoading || pointsToPay <= 0 || pointsToPay > initialPoints
                }
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20"
              >
                {isLoading ? "Menghubungkan..." : "Lanjutkan Pembayaran"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
