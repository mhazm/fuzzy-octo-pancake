"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Heart, MessageCircle, Share2, ArrowLeft, Trash2, Loader2, X } from "lucide-react";
import Link from "next/link";
import { GalleryPost, UserComment } from "./GalleryGrid";
import UserBadges from "@/components/icons/UserBadges";
import { Modal } from "@/components/ui/Modal";

export default function PostDetailClient({
  post,
  initialComments,
  loggedInUserId,
  loggedInUserTruckyId,
  profileName,
  profileAvatar,
  profileTruckyId,
  profileIsNismaraPlus,
  profileIsBooster,
  profileRole,
  isManager,
}: {
  post: GalleryPost;
  initialComments: UserComment[];
  loggedInUserId?: string;
  loggedInUserTruckyId?: string | null;
  profileName: string;
  profileAvatar: string;
  profileTruckyId: string;
  profileIsNismaraPlus?: boolean;
  profileIsBooster?: boolean;
  profileRole?: string;
  isManager?: boolean;
}) {
  const [comments, setComments] = useState<UserComment[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [isLiking, setIsLiking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{commentId: string, userName: string} | null>(null);
  const [likes, setLikes] = useState<string[]>(post.likes);
  const [showToast, setShowToast] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Helper untuk menentukan label role
  const getRoleLabel = () => {
    if (profileRole === "manager") return "Manajer Nismara";
    if (profileRole === "admin") return "Admin Nismara";
    return "Driver Nismara";
  };

  const images = post.imageUrls && post.imageUrls.length > 0 ? post.imageUrls : [post.imageUrl];
  const currentImage = images[currentImageIndex];

  const hasLiked = likes.includes(loggedInUserId || "");

  const toggleLike = async () => {
    if (!loggedInUserId || isLiking) return;
    setIsLiking(true);
    
    // Optimistic update
    const previousLikes = [...likes];
    if (hasLiked) {
      setLikes(likes.filter(id => id !== loggedInUserId));
    } else {
      setLikes([...likes, loggedInUserId]);
    }

    try {
      const res = await fetch(`/api/gallery/${post._id}/like`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to toggle like");
    } catch (error) {
      // Revert on error
      setLikes(previousLikes);
    } finally {
      setIsLiking(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!loggedInUserId) return;
    
    // Optimistic UI update
    setComments(prev => prev.map(c => {
      if (c._id === commentId) {
        const currentLikes = c.likes || [];
        const userHasLiked = currentLikes.includes(loggedInUserId);
        return {
          ...c,
          likes: userHasLiked 
            ? currentLikes.filter(id => id !== loggedInUserId)
            : [...currentLikes, loggedInUserId]
        };
      }
      return c;
    }));

    try {
      await fetch(`/api/gallery/${post._id}/comment/${commentId}/like`, { method: "POST" });
    } catch (error) {
      console.error("Failed to toggle comment like:", error);
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
        body: JSON.stringify({ 
          text: newComment,
          parentId: replyingTo?.commentId,
          replyToUser: replyingTo?.userName
        }),
      });
      if (res.ok) {
        const commentData = await res.json();
        setComments([...comments, commentData]);
        setNewComment("");
        setReplyingTo(null);
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
        window.location.href = `/profile/${loggedInUserTruckyId || ""}`;
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

  const rootComments = comments.filter(c => !c.parentId);
  const getReplies = (parentId: string) => comments.filter(c => c.parentId === parentId);

  return (
    <div className="h-[calc(100vh-5rem)] w-full bg-background flex flex-col md:flex-row overflow-hidden">
      
      {/* Image Section (Left) */}
      <div className="w-full md:flex-1 bg-black flex items-center justify-center relative border-r border-border/50 group overflow-hidden">
        {/* Navigation Overlay */}
        <div className="absolute top-4 left-4 z-50">
          <Link 
            href={`/profile/${profileTruckyId}`} 
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors bg-black/40 hover:bg-black/70 px-4 py-2 rounded-full backdrop-blur-md text-sm border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Profil {profileName}</span>
          </Link>
        </div>

        {/* Blurred background behind image */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 blur-3xl scale-125 transition-all duration-500" 
          style={{ backgroundImage: `url(${currentImage})` }}
        />
        <img
          src={currentImage}
          alt={`Post by ${profileName}`}
          className="w-full h-full object-contain relative z-10 transition-all duration-300"
        />

        {/* Carousel Controls */}
        {images.length > 1 && (
          <>
            <div className="absolute inset-x-0 bottom-6 z-20 flex justify-center gap-1.5">
              {images.map((_: any, i: number) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === currentImageIndex ? 'w-5 bg-primary' : 'w-2 bg-white/50'}`}
                />
              ))}
            </div>
            {currentImageIndex > 0 && (
              <button 
                onClick={() => setCurrentImageIndex(prev => prev - 1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/40 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
            )}
            {currentImageIndex < images.length - 1 && (
              <button 
                onClick={() => setCurrentImageIndex(prev => prev + 1)}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/40 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            )}
          </>
        )}
      </div>

      {/* Info & Comments Section (Right) */}
      <div className="w-full md:w-[400px] lg:w-[450px] flex flex-col bg-card/30 h-full shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-border/50 flex items-center justify-between bg-card/50 shrink-0">
          <Link href={`/profile/${profileTruckyId}`} className="flex items-center gap-3 hover:opacity-80 transition">
            <img
              src={profileAvatar}
              alt={profileName}
              className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
            />
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="font-bold text-sm leading-tight hover:underline">{profileName}</h2>
                <UserBadges 
                  role={profileRole} 
                  isBooster={profileIsBooster} 
                  isNismaraPlus={profileIsNismaraPlus} 
                  truckyRank={undefined}
                />
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{getRoleLabel()}</p>
            </div>
          </Link>
          
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
            <div className="flex gap-4 mb-6 group">
              <Link href={`/profile/${profileTruckyId}`} className="shrink-0 group/avatar">
                <img
                  src={profileAvatar}
                  alt={profileName}
                  className="w-10 h-10 rounded-full object-cover border border-border/50 group-hover/avatar:border-primary transition-colors"
                />
              </Link>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  <Link href={`/profile/${profileTruckyId}`} className="font-bold text-sm hover:underline hover:text-primary transition-colors">
                    {profileName}
                  </Link>
                  <UserBadges 
                    role={profileRole} 
                    isBooster={profileIsBooster} 
                    isNismaraPlus={profileIsNismaraPlus} 
                    truckyRank={undefined}
                  />
                </div>
                <span className="text-sm leading-relaxed inline-block">{post.caption}</span>
                <div className="text-xs text-muted-foreground mt-1.5 uppercase tracking-wide">
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: localeId })}
                </div>
              </div>
            </div>
          )}

          {rootComments.map((comment) => (
            <div key={comment._id} className="flex flex-col gap-2 group">
              <div className="flex gap-4">
                {comment.user.truckyId ? (
                  <Link href={`/profile/${comment.user.truckyId}`} className="shrink-0 group/avatar">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-border/50 group-hover/avatar:border-primary transition-colors">
                      <img
                        src={comment.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user.name)}&background=random`}
                        alt={comment.user.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </Link>
                ) : (
                  <div className="shrink-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-border/50">
                      <img
                        src={comment.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user.name)}&background=random`}
                        alt={comment.user.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                
                <div className="flex-1">
                  <div className="flex items-center flex-wrap mb-0.5">
                    {comment.user.truckyId ? (
                      <Link href={`/profile/${comment.user.truckyId}`} className="font-bold mr-1 text-sm hover:text-primary transition-colors hover:underline">
                        {comment.user.name}
                      </Link>
                    ) : (
                      <span className="font-bold mr-1 text-sm">{comment.user.name}</span>
                    )}
                    <UserBadges 
                      isManager={comment.user.isManager} 
                      isBooster={comment.user.isBooster} 
                      isNismaraPlus={comment.user.isNismaraPlus} 
                      truckyRank={comment.user.truckyRank}
                    />
                  </div>
                  <span className="text-sm leading-relaxed">{comment.text}</span>
                  <div className="flex items-center gap-4 mt-1.5 text-[11px] font-semibold text-muted-foreground">
                    <span className="uppercase tracking-wide">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: localeId })}
                    </span>
                    <button 
                      onClick={() => handleLikeComment(comment._id)}
                      className={`hover:text-foreground transition-colors ${(comment.likes || []).includes(loggedInUserId || '') ? 'text-red-500' : ''}`}
                    >
                      {(comment.likes || []).length > 0 && <span className="mr-1.5">{(comment.likes || []).length}</span>}
                      Suka
                    </button>
                    <button 
                      onClick={() => setReplyingTo({ commentId: comment._id, userName: comment.user.name })}
                      className="hover:text-foreground transition-colors"
                    >
                      Balas
                    </button>
                  </div>
                </div>
              </div>

              {/* Replies */}
              {getReplies(comment._id).length > 0 && (
                <div className="ml-14 mt-2 flex flex-col gap-4">
                  {getReplies(comment._id).map((reply) => (
                    <div key={reply._id} className="flex gap-3 group/reply">
                      {reply.user.truckyId ? (
                        <Link href={`/profile/${reply.user.truckyId}`} className="shrink-0 group-hover/reply:opacity-80 transition-opacity">
                          <img
                            src={reply.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.user.name)}&background=random`}
                            alt={reply.user.name}
                            className="w-8 h-8 rounded-full object-cover border border-border/50"
                          />
                        </Link>
                      ) : (
                        <div className="shrink-0">
                          <img
                            src={reply.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.user.name)}&background=random`}
                            alt={reply.user.name}
                            className="w-8 h-8 rounded-full object-cover border border-border/50"
                          />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-center flex-wrap mb-0.5">
                          {reply.user.truckyId ? (
                            <Link href={`/profile/${reply.user.truckyId}`} className="font-bold mr-1 text-sm hover:text-primary transition-colors hover:underline">
                              {reply.user.name}
                            </Link>
                          ) : (
                            <span className="font-bold mr-1 text-sm">{reply.user.name}</span>
                          )}
                          <UserBadges 
                            isManager={reply.user.isManager} 
                            isBooster={reply.user.isBooster} 
                            isNismaraPlus={reply.user.isNismaraPlus} 
                            truckyRank={reply.user.truckyRank}
                            className="w-3.5 h-3.5"
                          />
                        </div>
                        <span className="text-sm leading-relaxed">
                          {reply.replyToUser && <span className="text-primary font-medium mr-1">@{reply.replyToUser}</span>}
                          {reply.text}
                        </span>
                        <div className="flex items-center gap-4 mt-1 text-[11px] font-semibold text-muted-foreground">
                          <span className="uppercase tracking-wide">
                            {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true, locale: localeId })}
                          </span>
                          <button 
                            onClick={() => handleLikeComment(reply._id)}
                            className={`hover:text-foreground transition-colors ${(reply.likes || []).includes(loggedInUserId || '') ? 'text-red-500' : ''}`}
                          >
                            {(reply.likes || []).length > 0 && <span className="mr-1">{(reply.likes || []).length}</span>}
                            Suka
                          </button>
                          <button 
                            onClick={() => setReplyingTo({ commentId: comment._id, userName: reply.user.name })}
                            className="hover:text-foreground transition-colors"
                          >
                            Balas
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {comments.length === 0 && !post.caption && (
            <div className="text-center text-sm text-muted-foreground mt-10 italic">
              Belum ada komentar.
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-border/50 bg-card/20 shrink-0">
          <div className="flex items-center gap-4 mb-3">
            <button onClick={toggleLike} className="hover:scale-110 active:scale-95 transition-transform">
              <Heart className={`w-6 h-6 ${hasLiked ? 'fill-red-500 text-red-500' : 'text-foreground'}`} />
            </button>
            <div className="hover:scale-110 transition-transform cursor-pointer">
              <MessageCircle className="w-6 h-6 text-foreground" />
            </div>
            <button 
              className="hover:scale-110 transition-transform cursor-pointer text-foreground ml-1"
              onClick={() => {
                const shareUrl = `${window.location.origin}/p/${post._id}`;
                navigator.clipboard.writeText(shareUrl);
                setShowToast(true);
                setTimeout(() => setShowToast(false), 3000);
              }}
              title="Bagikan Tautan"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
          <div className="font-bold text-sm mb-1">{likes.length} Suka</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: localeId })}
          </div>
        </div>

        {/* Add Comment */}
        <form onSubmit={submitComment} className="p-4 border-t border-border/50 shrink-0">
          {replyingTo && (
            <div className="flex items-center justify-between bg-muted/30 px-3 py-1.5 rounded-lg mb-3 text-xs border border-border/50">
              <span className="text-muted-foreground">
                Membalas <span className="font-bold text-foreground">{replyingTo.userName}</span>
              </span>
              <button 
                type="button" 
                onClick={() => setReplyingTo(null)}
                className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-3">
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
          </div>
        </form>
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
    </div>
  );
}
