"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Heart, MessageCircle, Send, Share2, Trash2, Loader2, Pencil, Check, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import Link from "next/link";
import UserBadges from "@/components/icons/UserBadges";
import { Modal } from "@/components/ui/Modal";
import { showAlert, showConfirm } from "@/lib/dialog";


interface Comment {
  _id: string;
  text: string;
  createdAt: string;
  user: { name: string; avatarUrl: string; discordId: string; truckyId?: string; truckyRank?: string; isNismaraPlus?: boolean; isBooster?: boolean; isManager?: boolean };
  likes?: string[];
  parentId?: string;
  replyToUser?: string;
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
  const [replyingTo, setReplyingTo] = useState<{commentId: string, userName: string} | null>(null);
  const [likes, setLikes] = useState<string[]>(post.likes);
  const [showToast, setShowToast] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");

  const startEdit = (commentId: string, currentText: string) => {
    setEditingCommentId(commentId);
    setEditCommentText(currentText);
  };

  const saveEdit = async (commentId: string) => {
    if (!editCommentText.trim()) return;
    try {
      const res = await fetch(`/api/gallery/${post._id}/comment/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editCommentText }),
      });
      if (res.ok) {
        setComments(prev => prev.map(c => c._id === commentId ? { ...c, text: editCommentText.trim() } : c));
        setEditingCommentId(null);
      } else {
        showAlert("Gagal mengedit komentar");
      }
    } catch (e) {
      showAlert("Terjadi kesalahan saat mengedit komentar");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (await showConfirm("Apakah Anda yakin ingin menghapus komentar ini?")) {
      try {
        const res = await fetch(`/api/gallery/${post._id}/comment/${commentId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setComments(prev => prev.filter(c => c._id !== commentId && c.parentId !== commentId));
          if (onPostUpdate) {
            onPostUpdate({
              ...post,
              commentCount: Math.max(0, (post.commentCount || 0) - 1)
            });
          }
        } else {
          showAlert("Gagal menghapus komentar");
        }
      } catch (e) {
        showAlert("Terjadi kesalahan saat menghapus komentar");
      }
    }
  };

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
      // Optional: Revert state if failed
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
        if (onPostUpdate) {
          onPostUpdate({
            ...post,
            commentCount: (post.commentCount || 0) + 1
          });
        }
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
        window.location.reload(); // Refresh the page to remove post
      } else {
        const err = await res.json();
        await showAlert(err.error || "Gagal menghapus postingan");
        setIsDeleting(false);
        setShowDeleteModal(false);
      }
    } catch (error) {
      await showAlert("Terjadi kesalahan sistem saat menghapus postingan");
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const rootComments = comments.filter(c => !c.parentId);
  const getReplies = (parentId: string) => comments.filter(c => c.parentId === parentId);

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
                      <UserBadges 
                        role={profileRole} 
                        isBooster={profileIsBooster} 
                        isNismaraPlus={profileIsNismaraPlus} 
                        truckyRank={undefined /* pass profileRank if available in props */}
                      />
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
                      <UserBadges 
                        role={profileRole} 
                        isBooster={profileIsBooster} 
                        isNismaraPlus={profileIsNismaraPlus} 
                        truckyRank={undefined}
                      />
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
                    <UserBadges 
                      role={profileRole} 
                      isBooster={profileIsBooster} 
                      isNismaraPlus={profileIsNismaraPlus} 
                      truckyRank={undefined}
                    />
                  </div>
                  <span className="text-sm mt-0.5 inline-block">{post.caption}</span>
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {post.tags.map((tag: string) => (
                        <Link href={`/feeds?tag=${tag}`} key={tag} className="text-primary hover:underline cursor-pointer font-medium text-xs">
                          #{tag}
                        </Link>
                      ))}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: localeId })}
                  </div>
                </div>
              </div>
            )}

            {rootComments.map((comment) => (
              <div key={comment._id} className="flex flex-col gap-2 group">
                <div className="flex gap-3">
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
                  
                  <div className="flex-1">
                    <div className="bg-muted/30 rounded-2xl px-4 py-2 border border-border/30 inline-block w-full">
                      <div className="flex items-center flex-wrap">
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
                          className="w-3.5 h-3.5"
                        />
                        <span className="text-[10px] text-muted-foreground ml-2">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: localeId })}
                        </span>
                      </div>
                      {editingCommentId === comment._id ? (
                        <div className="flex items-center gap-2 mt-1 w-full">
                          <input 
                            type="text" 
                            className="flex-1 bg-black/20 border border-border/50 text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:border-primary transition-colors text-foreground" 
                            value={editCommentText} 
                            onChange={(e) => setEditCommentText(e.target.value)} 
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(comment._id);
                              if (e.key === 'Escape') setEditingCommentId(null);
                            }}
                          />
                          <button onClick={() => saveEdit(comment._id)} className="p-1.5 bg-primary/20 text-primary rounded hover:bg-primary hover:text-white transition-colors" title="Simpan">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingCommentId(null)} className="p-1.5 bg-red-500/20 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors" title="Batal">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm mt-0.5 break-words text-foreground/90 leading-relaxed">{comment.text}</p>
                      )}
                    </div>
                    
                    {/* Comment Actions */}
                    <div className="flex items-center gap-4 mt-1.5 ml-4 text-[11px] font-semibold text-muted-foreground flex-wrap">
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

                      {(loggedInUserId === comment.user.discordId) && (
                        <button onClick={() => startEdit(comment._id, comment.text)} className="hover:text-foreground transition-colors flex items-center gap-1">
                          Edit
                        </button>
                      )}
                      {(loggedInUserId === comment.user.discordId || isManager) && (
                        <button onClick={() => handleDeleteComment(comment._id)} className="hover:text-red-500 transition-colors flex items-center gap-1">
                          Hapus
                        </button>
                      )}
                      {(loggedInUserId !== comment.user.discordId && loggedInUserId) && (
                        <Link href={`/dashboard/ticket?commentId=${comment._id}&postId=${post._id}&reportedUser=${encodeURIComponent(comment.user.name)}&commentText=${encodeURIComponent(comment.text)}`} className="hover:text-orange-500 transition-colors flex items-center gap-1" title="Laporkan komentar">
                          Lapor
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {getReplies(comment._id).length > 0 && (
                  <div className="ml-11 mt-1 flex flex-col gap-3">
                    {getReplies(comment._id).map((reply) => (
                      <div key={reply._id} className="flex gap-3 group/reply">
                        {reply.user.truckyId ? (
                          <Link href={`/profile/${reply.user.truckyId}`} className="shrink-0 group-hover/reply:opacity-80 transition-opacity">
                            <img
                              src={reply.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.user.name)}&background=random`}
                              alt={reply.user.name}
                              className="w-6 h-6 rounded-full object-cover border border-border/50"
                            />
                          </Link>
                        ) : (
                          <div className="shrink-0">
                            <img
                              src={reply.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.user.name)}&background=random`}
                              alt={reply.user.name}
                              className="w-6 h-6 rounded-full object-cover border border-border/50"
                            />
                          </div>
                        )}
                        
                        <div className="flex-1">
                          <div className="bg-muted/20 rounded-2xl px-3 py-1.5 border border-border/20 inline-block w-full">
                            <div className="flex items-center flex-wrap">
                              {reply.user.truckyId ? (
                                <Link href={`/profile/${reply.user.truckyId}`} className="font-bold mr-1 text-xs hover:text-primary transition-colors hover:underline">
                                  {reply.user.name}
                                </Link>
                              ) : (
                                <span className="font-bold mr-1 text-xs">{reply.user.name}</span>
                              )}
                              <UserBadges 
                                isManager={reply.user.isManager} 
                                isBooster={reply.user.isBooster} 
                                isNismaraPlus={reply.user.isNismaraPlus} 
                                truckyRank={reply.user.truckyRank}
                                className="w-3 h-3"
                              />
                              <span className="text-[9px] text-muted-foreground ml-2">
                                {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true, locale: localeId })}
                              </span>
                            </div>
                              {editingCommentId === reply._id ? (
                                <div className="flex items-center gap-2 mt-1 w-full">
                                  <input 
                                    type="text" 
                                    className="flex-1 bg-black/20 border border-border/50 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-primary transition-colors text-foreground" 
                                    value={editCommentText} 
                                    onChange={(e) => setEditCommentText(e.target.value)} 
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveEdit(reply._id);
                                      if (e.key === 'Escape') setEditingCommentId(null);
                                    }}
                                  />
                                  <button onClick={() => saveEdit(reply._id)} className="p-1 bg-primary/20 text-primary rounded hover:bg-primary hover:text-white transition-colors" title="Simpan">
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button onClick={() => setEditingCommentId(null)} className="p-1 bg-red-500/20 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors" title="Batal">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <p className="text-xs mt-0.5 break-words text-foreground/90 leading-relaxed">
                                  {reply.replyToUser && <span className="text-primary font-medium mr-1">@{reply.replyToUser}</span>}
                                  {reply.text}
                                </p>
                              )}
                            </div>

                            {/* Reply Actions */}
                            <div className="flex items-center gap-4 mt-1 ml-3 text-[10px] font-semibold text-muted-foreground flex-wrap">
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

                              {(loggedInUserId === reply.user.discordId) && (
                                <button onClick={() => startEdit(reply._id, reply.text)} className="hover:text-foreground transition-colors flex items-center gap-1">
                                  Edit
                                </button>
                              )}
                              {(loggedInUserId === reply.user.discordId || isManager) && (
                                <button onClick={() => handleDeleteComment(reply._id)} className="hover:text-red-500 transition-colors flex items-center gap-1">
                                  Hapus
                                </button>
                              )}
                              {(loggedInUserId !== reply.user.discordId && loggedInUserId) && (
                                <Link href={`/dashboard/ticket?commentId=${reply._id}&postId=${post._id}&reportedUser=${encodeURIComponent(reply.user.name)}&commentText=${encodeURIComponent(reply.text)}`} className="hover:text-orange-500 transition-colors flex items-center gap-1" title="Laporkan balasan">
                                  Lapor
                                </Link>
                              )}
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
            <form onSubmit={submitComment} className="p-4 border-t border-border/50 bg-card/50 backdrop-blur-sm shrink-0">
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
