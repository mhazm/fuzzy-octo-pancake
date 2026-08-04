"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Heart, MessageCircle, Send, Share2, Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import Link from "next/link";
import NismaraPlusBadge from "@/components/icons/NismaraPlusBadge";
import ServerBoosterBadge from "@/components/icons/ServerBoosterBadge";
import { Modal } from "@/components/ui/Modal";

interface Comment {
  _id: string;
  text: string;
  createdAt: string;
  user: { name: string; avatarUrl: string; discordId: string; truckyId?: string; isNismaraPlus?: boolean; isBooster?: boolean };
}

export default function GalleryModal({
  post,
  onClose,
  loggedInUserId,
  loggedInUserTruckyId,
  profileName,
  profileAvatar,
  profileTruckyId,
  profileIsNismaraPlus,
  profileIsBooster,
  profileRole,
  isManager,
  onPostUpdate,
}: {
  post: any;
  onClose: () => void;
  loggedInUserId?: string;
  loggedInUserTruckyId?: string | null;
  profileName: string;
  profileAvatar: string;
  profileTruckyId?: string;
  profileIsNismaraPlus?: boolean;
  profileIsBooster?: boolean;
  profileRole?: string;
  isManager?: boolean;
  onPostUpdate?: (post: any) => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLiking, setIsLiking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likes, setLikes] = useState<string[]>(post.likes);
  const [showToast, setShowToast] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const images = post.imageUrls && post.imageUrls.length > 0 ? post.imageUrls : [post.imageUrl];
  const currentImage = images[currentImageIndex];

  // Helper untuk menentukan label role
  const getRoleLabel = () => {
    if (profileRole === "manager") return "Manajer Nismara";
    if (profileRole === "admin") return "Admin Nismara";
    return "Driver Nismara";
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Disable body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const hasLiked = loggedInUserId ? likes.includes(loggedInUserId) : false;

  useEffect(() => {
    const fetchComments = async () => {
      const res = await fetch(`/api/gallery/${post._id}/comment`);
      if (res.ok) {
        setComments(await res.json());
      }
    };
    fetchComments();
  }, [post._id]);

  const toggleLike = async () => {
    if (isLiking || !loggedInUserId) return;
    setIsLiking(true);
    try {
      const res = await fetch(`/api/gallery/${post._id}/like`, { method: "POST" });
      if (res.ok) {
        const { liked } = await res.json();
        const newLikes = liked
          ? [...post.likes, loggedInUserId]
          : post.likes.filter((id: string) => id !== loggedInUserId);
        if (onPostUpdate) onPostUpdate({ ...post, likes: newLikes });
        setLikes(newLikes);
      }
    } finally {
      setIsLiking(false);
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !loggedInUserId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/gallery/${post._id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newComment }),
      });
      if (res.ok) {
        const commentData = await res.json();
        setComments([...comments, commentData]);
        if (onPostUpdate) {
          onPostUpdate({
            ...post,
            commentCount: (post.commentCount || 0) + 1
          });
        }
        setNewComment("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/gallery/${post._id}`, { method: "DELETE" });
      if (res.ok) {
        window.location.reload(); // Refresh the page to remove post
      } else {
        const err = await res.json();
        alert(err.error || "Gagal menghapus postingan");
        setIsDeleting(false);
        setShowDeleteModal(false);
      }
    } catch (error) {
      alert("Terjadi kesalahan sistem saat menghapus postingan");
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-background/90 backdrop-blur-md" onClick={onClose} />
      
      {/* Modal Alignment Wrapper */}
      <div className="relative min-h-[calc(100vh-3rem)] flex items-center justify-center">
        {/* Modal Box */}
        <div className="relative bg-card w-full max-w-7xl rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-auto md:h-[85vh] max-h-[1000px] z-10 border border-border/50">
          
          {/* Close Button Inside Modal Box */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-[60] p-2 bg-black/30 hover:bg-black/60 rounded-full text-white transition-colors backdrop-blur-md border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Image Section */}
          <div className="w-full md:w-[60%] bg-black flex items-center justify-center relative group border-r border-border/50">
            {/* Blurred Background for Letterboxing */}
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-30 blur-2xl scale-110 transition-all duration-500" 
              style={{ backgroundImage: `url(${currentImage})` }}
            />
            <img
              src={currentImage}
              alt="Post"
              className="w-full h-full object-contain relative z-10 transition-all duration-300"
            />

            {/* Carousel Controls */}
            {images.length > 1 && (
              <>
                <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center gap-1.5">
                  {images.map((_: any, i: number) => (
                    <div 
                      key={i} 
                      className={`h-1.5 rounded-full transition-all duration-300 ${i === currentImageIndex ? 'w-4 bg-primary' : 'w-1.5 bg-white/50'}`}
                    />
                  ))}
                </div>
                {currentImageIndex > 0 && (
                  <button 
                    onClick={() => setCurrentImageIndex(prev => prev - 1)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/40 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                )}
                {currentImageIndex < images.length - 1 && (
                  <button 
                    onClick={() => setCurrentImageIndex(prev => prev + 1)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/40 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                )}
              </>
            )}
          </div>

        {/* Info & Comments Section */}
        <div className="w-full md:w-[40%] flex flex-col bg-background h-full">
        {/* Header (Instagram Style) */}
        <div className="p-4 border-b border-border/50 flex items-center justify-between bg-card/50">
          <div className="flex items-center gap-3">
            {profileTruckyId ? (
              <Link href={`/profile/${profileTruckyId}`} className="flex items-center gap-3 hover:opacity-80 transition">
                <img
                  src={profileAvatar}
                  alt={profileName}
                  className="w-10 h-10 rounded-full object-cover border border-border/50"
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-sm hover:underline">{profileName}</span>
                    {profileIsBooster && <ServerBoosterBadge />}
                    {profileIsNismaraPlus && <NismaraPlusBadge />}
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{getRoleLabel()}</p>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <img
                  src={profileAvatar}
                  alt={profileName}
                  className="w-10 h-10 rounded-full object-cover border border-border/50"
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-sm">{profileName}</span>
                    {profileIsBooster && <ServerBoosterBadge />}
                    {profileIsNismaraPlus && <NismaraPlusBadge />}
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{getRoleLabel()}</p>
                </div>
              </div>
            )}
          </div>
          
          {(loggedInUserId === post.userId || isManager) && (
            <button 
              onClick={() => setShowDeleteModal(true)}
              disabled={isDeleting}
              className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors disabled:opacity-50 ml-auto shrink-0"
              title="Hapus Postingan"
            >
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
            </button>
          )}
        </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
            {post.caption && (
              <div className="flex gap-3 mb-6 group">
                {profileTruckyId ? (
                  <Link href={`/profile/${profileTruckyId}`} className="shrink-0 group/avatar">
                    <img
                      src={profileAvatar}
                      alt={profileName}
                      className="w-8 h-8 rounded-full object-cover border border-border/50 group-hover/avatar:border-primary transition-colors"
                    />
                  </Link>
                ) : (
                  <img
                    src={profileAvatar}
                    alt={profileName}
                    className="w-8 h-8 rounded-full object-cover shrink-0 border border-border/50"
                  />
                )}
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {profileTruckyId ? (
                      <Link href={`/profile/${profileTruckyId}`} className="font-bold text-sm hover:underline hover:text-primary transition-colors">
                        {profileName}
                      </Link>
                    ) : (
                      <span className="font-bold text-sm">{profileName}</span>
                    )}
                    {profileIsBooster && <ServerBoosterBadge />}
                    {profileIsNismaraPlus && <NismaraPlusBadge />}
                  </div>
                  <span className="text-sm mt-0.5 inline-block">{post.caption}</span>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: localeId })}
                  </div>
                </div>
              </div>
            )}

            {comments.map((comment) => (
                  <div key={comment._id} className="flex gap-3 group">
                    {comment.user.truckyId ? (
                      <Link href={`/profile/${comment.user.truckyId}`} className="shrink-0 group/avatar">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-border/50 group-hover/avatar:border-primary transition-colors">
                          <img
                            src={comment.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user.name)}&background=random`}
                            alt={comment.user.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </Link>
                    ) : (
                      <div className="shrink-0">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-border/50">
                          <img
                            src={comment.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user.name)}&background=random`}
                            alt={comment.user.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex-1 bg-muted/30 rounded-2xl px-4 py-2 border border-border/30">
                      <div className="flex items-center flex-wrap">
                        {comment.user.truckyId ? (
                          <Link href={`/profile/${comment.user.truckyId}`} className="font-bold mr-1 text-sm hover:text-primary transition-colors hover:underline">
                            {comment.user.name}
                          </Link>
                        ) : (
                          <span className="font-bold mr-1 text-sm">{comment.user.name}</span>
                        )}
                        {comment.user.isBooster && <ServerBoosterBadge />}
                        {comment.user.isNismaraPlus && <NismaraPlusBadge className="w-3.5 h-3.5" />}
                        <span className="text-[10px] text-muted-foreground ml-2">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: localeId })}
                        </span>
                      </div>
                      <p className="text-sm mt-0.5 break-words text-foreground/90 leading-relaxed">{comment.text}</p>
                    </div>
                  </div>
                ))}
            
            {comments.length === 0 && !post.caption && (
              <div className="text-center text-sm text-muted-foreground mt-10 italic">
                Belum ada komentar.
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-border/50">
            <div className="flex items-center gap-4 mb-3">
              <button onClick={toggleLike} className="hover:opacity-70 transition">
                <Heart className={`w-7 h-7 ${hasLiked ? 'fill-red-500 text-red-500' : 'text-foreground'}`} />
              </button>
              <button className="hover:opacity-70 transition">
                <MessageCircle className="w-7 h-7 text-foreground" />
              </button>
              <button 
                className="hover:opacity-70 transition text-foreground"
                onClick={() => {
                  const shareUrl = `${window.location.origin}/p/${post._id}`;
                  navigator.clipboard.writeText(shareUrl);
                  setShowToast(true);
                  setTimeout(() => setShowToast(false), 3000);
                }}
                title="Bagikan Tautan"
              >
                <Share2 className="w-7 h-7" />
              </button>
            </div>
            <div className="font-bold text-sm mb-1">{likes.length} Suka</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: localeId })}
            </div>
          </div>

          {/* Add Comment */}
            <form onSubmit={submitComment} className="p-4 border-t border-border/50 flex items-center gap-3 bg-card/50 backdrop-blur-sm shrink-0">
              <input
                type="text"
                placeholder={
                  !loggedInUserId 
                    ? "Login untuk berkomentar..." 
                    : !loggedInUserTruckyId 
                      ? "Hanya driver Nismara yang dapat berkomentar" 
                      : "Tambahkan komentar..."
                }
                className="flex-1 bg-transparent text-sm focus:outline-none disabled:opacity-50"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={!loggedInUserTruckyId || isSubmitting}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || !loggedInUserTruckyId || isSubmitting}
                className="text-primary font-bold text-sm disabled:opacity-50 hover:opacity-80 transition"
              >
                Kirim
              </button>
            </form>
        </div>
        </div>
      </div>

      {/* Custom Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <Share2 className="w-4 h-4" />
          Tautan disalin ke clipboard!
        </div>
      )}
      {/* Konfirmasi Hapus Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => !isDeleting && setShowDeleteModal(false)}
        title="Hapus Postingan"
      >
        <div className="space-y-6">
          <p className="text-muted-foreground leading-relaxed">
            Apakah Anda yakin ingin menghapus postingan galeri ini? Tindakan ini <strong className="text-foreground">permanen</strong> dan file foto akan dihapus selamanya dari sistem.
            {isManager && loggedInUserId !== post.userId && (
              <span className="block mt-2 text-red-500 font-medium text-sm">
                *Tindakan Moderasi: Notifikasi pelanggaran akan otomatis dikirimkan kepada pembuat postingan ini.
              </span>
            )}
          </p>
          
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
              className="px-5 py-2.5 rounded-xl font-bold hover:bg-muted text-muted-foreground transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-5 py-2.5 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {isDeleting ? "Menghapus..." : "Ya, Hapus!"}
            </button>
          </div>
        </div>
      </Modal>

    </div>,
    document.body
  );
}
