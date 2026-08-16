"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Download, ShoppingCart, ArrowLeft, Box, CheckCircle2, ShieldAlert, User, Star, Flag } from "lucide-react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import UserBadges from "@/components/icons/UserBadges";
import { Modal } from "@/components/ui/Modal";

export default function MarketItemDetail() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { data: session } = useSession();
  
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPurchased, setIsPurchased] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showFullImage, setShowFullImage] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [totalBuyers, setTotalBuyers] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState("");
  const [reviewSubmitLoading, setReviewSubmitLoading] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [takedownLoading, setTakedownLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  // Custom Modal State for Alerts/Confirms
  const [modalData, setModalData] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "alert" | "confirm";
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "alert"
  });

  const showAlert = (title: string, message: string) => {
    setModalData({ isOpen: true, title, message, type: "alert" });
  };

  const showConfirm = (title: string, message: string, onConfirmAction: () => void) => {
    setModalData({ isOpen: true, title, message, type: "confirm", onConfirm: onConfirmAction });
  };

  useEffect(() => {
    if (id) {
      fetchItemDetail();
      fetchReviews();
    }
    if (session) {
      checkIfPurchased();
    }
  }, [id, session]);

  const fetchItemDetail = async () => {
    try {
      const res = await fetch(`/api/market/${id}`);
      if (!res.ok) {
        setError("Barang tidak ditemukan");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setItem(data);
    } catch (err) {
      setError("Gagal memuat detail barang");
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/market/${id}/reviews`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        setTotalBuyers(data.totalBuyers || 0);
        setAverageRating(Number(data.averageRating) || 0);

        // Pre-fill if current user already has a review
        if (session?.user?.discordId) {
          const myReview = data.reviews?.find((r: any) => r.user?.discordId === session.user.discordId);
          if (myReview) {
            setRatingInput(myReview.rating);
            setCommentInput(myReview.comment);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const checkIfPurchased = async () => {
    try {
      const res = await fetch("/api/market/library");
      const library = await res.json();
      if (Array.isArray(library)) {
        const owned = library.some((p: any) => p.marketItemId && (p.marketItemId._id === id || p.marketItemId.slug === id));
        setIsPurchased(owned);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBuy = async () => {
    if (!session) {
      router.push("/login");
      return;
    }
    
    setBuyLoading(true);
    setError("");
    
    try {
      const res = await fetch(`/api/market/${id}/buy`, {
        method: "POST",
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "Gagal membeli barang");
      } else {
        setIsPurchased(true);
        setShowBuyModal(false);
      }
    } catch (err) {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setBuyLoading(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewSubmitLoading(true);
    try {
      const res = await fetch(`/api/market/${id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: ratingInput, comment: commentInput }),
      });
      if (res.ok) {
        await fetchReviews();
        // Option to show success toast here
      } else {
        const data = await res.json();
        showAlert("Ulasan Gagal", data.error || "Gagal mengirim ulasan");
      }
    } catch (err) {
      showAlert("Error", "Terjadi kesalahan jaringan");
    } finally {
      setReviewSubmitLoading(false);
    }
  };

  const handleTakedown = () => {
    showConfirm(
      "Konfirmasi Takedown",
      "Takedown Mod ini secara permanen? Notifikasi pelanggaran akan dikirim ke creator dan seluruh pembeli.",
      async () => {
        setTakedownLoading(true);
        try {
          const res = await fetch(`/api/market/${id}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (res.ok) {
            setModalData(prev => ({ ...prev, isOpen: false }));
            router.push("/market");
          } else {
            showAlert("Gagal Takedown", data.error || "Gagal melakukan takedown");
          }
        } catch (err) {
          showAlert("Error", "Terjadi kesalahan jaringan");
        } finally {
          setTakedownLoading(false);
        }
      }
    );
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason.trim()) return;
    
    setReportLoading(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: "report_mod",
          categoryName: "Report Mod",
          subject: `Laporan: ${item.title}`,
          description: `Melaporkan mod: ${window.location.href}\n\nAlasan:\n${reportReason}`
        })
      });
      
      if (res.ok) {
        setShowReportModal(false);
        setReportReason("");
        showAlert("Berhasil", "Laporan berhasil dikirim dan tiket telah dibuat. Silakan cek Discord Anda.");
      } else {
        const data = await res.json();
        showAlert("Gagal", data.error || "Gagal mengirim laporan");
      }
    } catch (err) {
      showAlert("Error", "Terjadi kesalahan sistem");
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full"></div>
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <ShieldAlert className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">{error}</h2>
        <Link href="/market" className="text-primary hover:underline">
          Kembali ke Market
        </Link>
      </div>
    );
  }

  const isSeller = session?.user?.discordId === item.sellerId;
  const allImages = item.images?.length > 0 ? item.images : (item.image_url ? [item.image_url] : []);

  return (
    <main className="max-w-5xl mx-auto px-4 py-12 min-h-screen">
      <Link href="/market" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </Link>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
        {/* Gambar */}
        <div className="flex flex-col gap-4">
          <div 
            className="rounded-2xl overflow-hidden bg-black/50 border border-border/50 aspect-video md:aspect-square relative cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => allImages.length > 0 && setShowFullImage(true)}
          >
            {allImages.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={allImages[activeImageIndex]} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600">
                <Box className="w-20 h-20" />
              </div>
            )}
          </div>
          
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent">
              {allImages.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border-2 transition-all ${activeImageIndex === idx ? 'border-primary' : 'border-transparent opacity-50 hover:opacity-100'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`${item.title} preview ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <div className="flex gap-2 flex-wrap mb-4">
            <span className="px-3 py-1 bg-black/50 border border-border/50 rounded-full text-xs font-bold text-white">
              {item.game_id === 1 ? "Euro Truck Simulator 2" : "American Truck Simulator"}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">{item.title}</h1>
          <p className="text-gray-400 mb-2 text-sm">Dipublikasikan pada {new Date(item.createdAt).toLocaleDateString("id-ID")}</p>
          
          <div className="flex flex-wrap gap-4 items-center mb-6">
            <div className="flex items-center gap-1 text-yellow-400">
              <Star className="w-5 h-5 fill-yellow-400" />
              <span className="font-bold">{averageRating > 0 ? averageRating : "-"} / 5</span>
              <span className="text-gray-400 text-sm">({reviews.length} ulasan)</span>
            </div>
            <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs font-bold text-primary">
              {totalBuyers} Pembeli
            </div>
          </div>

          {/* Seller Info */}
          <Link 
            href={item.sellerTruckyId ? `/profile/${item.sellerTruckyId}` : "#"} 
            className="flex items-center gap-4 bg-black/30 border border-border/50 rounded-2xl p-4 mb-8 hover:border-primary/50 transition-colors group"
          >
            <div className="w-12 h-12 rounded-full overflow-hidden bg-black/50 border border-border/50 flex items-center justify-center">
              {item.sellerImage ? (
                <img src={item.sellerImage} alt={item.sellerName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-gray-500" />
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5 uppercase tracking-wider">Kreator Mod</p>
              <p className="text-base font-bold text-white group-hover:text-primary transition-colors">
                {item.sellerName || "Unknown Seller"}
              </p>
            </div>
          </Link>

          <div className="p-6 bg-card/30 border border-border/50 rounded-2xl mb-8">
            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Harga Mod</p>
            <div className="text-3xl font-black text-yellow-400 mb-2">
              {item.price > 0 ? `${item.price} NC` : "Gratis"}
            </div>
            {item.price > 0 && !isPurchased && !isSeller && (
              <p className="text-xs text-gray-500 mb-4">*Harga sudah termasuk pajak & biaya admin</p>
            )}

            <div className="mt-6 space-y-3">
              {isSeller ? (
                <>
                  <a
                    href={item.download_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
                  >
                    <Download className="w-5 h-5" /> Download Mod
                  </a>
                  <Link
                    href={`/dashboard/my-market/edit/${item._id}`}
                    className="block w-full text-center py-4 rounded-xl border-2 border-primary text-primary font-bold hover:bg-primary hover:text-white transition-colors"
                  >
                    Edit Barang Saya
                  </Link>
                </>
              ) : isPurchased ? (
                <a
                  href={item.download_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
                >
                  <Download className="w-5 h-5" /> Download Mod
                </a>
              ) : !session ? (
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-primary text-white font-bold hover:bg-primary/80 transition-colors"
                >
                  Login untuk {item.price === 0 ? "Mengklaim" : "Membeli"}
                </Link>
              ) : !session.user.isDriver ? (
                <button
                  disabled
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-gray-600 text-white font-bold cursor-not-allowed opacity-50"
                >
                  Hanya Driver yang Dapat Membeli
                </button>
              ) : item.price === 0 ? (
                <button
                  onClick={handleBuy}
                  disabled={buyLoading}
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-primary text-white font-bold hover:bg-primary/80 transition-colors disabled:opacity-50"
                >
                  {buyLoading ? "Memproses..." : "Klaim Mod Gratis"}
                </button>
              ) : (
                <button
                  onClick={() => setShowBuyModal(true)}
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-primary text-white font-bold hover:bg-primary/80 transition-colors disabled:opacity-50"
                >
                  <ShoppingCart className="w-5 h-5" /> Beli Mod Ini
                </button>
              )}
            </div>

            {/* Manager Takedown Button */}
            {session && (session.user.role === "manager" || session.user.role === "admin") && (
              <div className="mt-4 border-t border-red-500/20 pt-4">
                <button
                  onClick={handleTakedown}
                  disabled={takedownLoading}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-red-500/10 border border-red-500/50 text-red-500 font-bold hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                >
                  <ShieldAlert className="w-5 h-5" />
                  {takedownLoading ? "Memproses Takedown..." : "Takedown Mod (Moderasi)"}
                </button>
              </div>
            )}

            {isPurchased && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-green-400 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Anda sudah memiliki mod ini
              </div>
            )}

            {session && session.user.discordId !== item.sellerId && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowReportModal(true)}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center justify-center gap-1 mx-auto"
                >
                  <Flag className="w-3 h-3" /> Laporkan mod ini
                </button>
              </div>
            )}
          </div>

          {/* Detail / Spesifikasi */}
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4 text-white">Spesifikasi Mod</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-black/30 border border-border/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Game</p>
                <p className="text-sm font-bold text-white">{item.game_id === 1 ? "Euro Truck Simulator 2" : "American Truck Simulator"}</p>
              </div>
              <div className="bg-black/30 border border-border/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Versi Game</p>
                <p className="text-sm font-bold text-white">{item.game_version || "Semua Versi"}</p>
              </div>
              <div className="bg-black/30 border border-border/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Kategori</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.categories?.map((c: string) => (
                    <span key={c} className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full capitalize">
                      {c.replace("_", " ")}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="prose prose-invert max-w-none mb-12">
        <h3 className="text-2xl font-bold mb-4 text-white">Deskripsi Mod</h3>
        <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{item.description}</p>
      </div>

      {/* Ulasan Section */}
      <div className="pt-8 border-t border-border/50">
        <h3 className="text-2xl font-bold mb-6 text-white">Ulasan Pembeli ({reviews.length})</h3>

        {(isPurchased || isSeller || item.price === 0) && (
              <form onSubmit={handleReviewSubmit} className="bg-card/30 border border-border/50 rounded-2xl p-6 mb-8">
                <h4 className="font-bold text-white mb-4">Berikan Ulasan Anda</h4>
                <div className="flex gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingInput(star)}
                      className="focus:outline-none"
                    >
                      <Star className={`w-8 h-8 transition-colors ${ratingInput >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Ceritakan pengalaman Anda menggunakan mod ini..."
                  className="w-full bg-black/30 border border-border/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors mb-4 min-h-[100px]"
                  required
                />
                <button
                  type="submit"
                  disabled={reviewSubmitLoading}
                  className="px-6 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/80 transition-colors disabled:opacity-50"
                >
                  {reviewSubmitLoading ? "Mengirim..." : "Kirim Ulasan"}
                </button>
              </form>
            )}

            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review._id} className="bg-black/30 border border-border/50 rounded-2xl p-6 flex gap-4">
                  <Link href={review.user?.truckyId ? `/profile/${review.user.truckyId}` : "#"} className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-black/50 border border-border/50">
                      {review.user?.image ? (
                        <img src={review.user.image} alt={review.user.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-full h-full p-2 text-gray-500" />
                      )}
                    </div>
                  </Link>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Link href={review.user?.truckyId ? `/profile/${review.user.truckyId}` : "#"} className="font-bold text-white hover:text-primary transition-colors">
                          {review.user?.name}
                        </Link>
                        <UserBadges 
                          isManager={review.user?.isManager} 
                          isBooster={review.user?.isBooster} 
                          isNismaraPlus={review.user?.isNismaraPlus} 
                          truckyRank={review.user?.truckyRank}
                          className="w-4 h-4" 
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(review.updatedAt).toLocaleDateString("id-ID")}
                        {review.updatedAt !== review.createdAt && " (Diedit)"}
                      </div>
                    </div>
                    <div className="flex gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className={`w-4 h-4 ${review.rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />
                      ))}
                    </div>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{review.comment}</p>
                  </div>
                </div>
              ))}
              
              {reviews.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                  <Star className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Belum ada ulasan untuk mod ini.</p>
                </div>
              )}
            </div>
          </div>

      {/* Modal Full Image */}
      {showFullImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 cursor-pointer"
          onClick={() => setShowFullImage(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={allImages[activeImageIndex]} 
            alt={item.title} 
            className="max-w-full max-h-[90vh] object-contain rounded-xl" 
          />
        </div>
      )}

      {/* Buy Confirmation Modal */}
      <Modal 
        isOpen={showBuyModal} 
        onClose={() => !buyLoading && setShowBuyModal(false)}
        title="Konfirmasi Pembelian"
      >
        <div className="space-y-6">
          <p className="text-gray-300">
            Apakah Anda yakin ingin membeli mod <span className="font-bold text-white">{item.title}</span> seharga <span className="font-bold text-yellow-400">{item.price} NC</span>?
          </p>
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setShowBuyModal(false)}
              disabled={buyLoading}
              className="px-4 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button 
              onClick={handleBuy}
              disabled={buyLoading}
              className="px-6 py-2 rounded-xl bg-primary text-white font-bold hover:bg-primary/80 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {buyLoading ? "Memproses..." : "Ya, Beli Sekarang"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Report Mod Modal */}
      <Modal
        isOpen={showReportModal}
        onClose={() => !reportLoading && setShowReportModal(false)}
        title="Laporkan Mod"
      >
        <form onSubmit={handleReport} className="space-y-4">
          <p className="text-sm text-gray-400">
            Jelaskan alasan pelaporan Anda untuk mod <strong className="text-white">{item?.title}</strong>. Laporan palsu dapat berakibat sanksi.
          </p>
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            className="w-full bg-black/50 border border-border/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 min-h-[100px]"
            placeholder="Contoh: Mod hasil curian dari author lain, file mengandung virus, dll."
            required
          />
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowReportModal(false)}
              disabled={reportLoading}
              className="px-4 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={reportLoading}
              className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {reportLoading ? "Mengirim..." : "Kirim Laporan"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Generic Alert & Confirm Modal */}
      <Modal
        isOpen={modalData.isOpen}
        onClose={() => setModalData(prev => ({ ...prev, isOpen: false }))}
        title={modalData.title}
      >
        <div className="space-y-6">
          <p className="text-gray-300">{modalData.message}</p>
          <div className="flex justify-end gap-3">
            {modalData.type === "confirm" && (
              <button
                onClick={() => setModalData(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                Batal
              </button>
            )}
            <button
              onClick={() => {
                if (modalData.type === "confirm" && modalData.onConfirm) {
                  modalData.onConfirm();
                } else {
                  setModalData(prev => ({ ...prev, isOpen: false }));
                }
              }}
              className={`px-6 py-2 rounded-xl text-white font-bold transition-colors ${
                modalData.type === "confirm" ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/80"
              }`}
            >
              {modalData.type === "confirm" ? "Ya, Lanjutkan" : "Tutup"}
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
