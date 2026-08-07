"use client";

import React, { useState, useEffect } from "react";
import { Heart, MessageCircle, Share2, Loader2, MonitorPlay, Home, Hash, Users, Bell, Plus } from "lucide-react";
import Link from "next/link";
import UserBadges from "@/components/icons/UserBadges";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import GalleryModal from "@/components/gallery/GalleryModal";
import UploadPostDialog from "@/components/gallery/UploadPostDialog";

export default function FeedsClient({
  initialPosts,
  trendingTags,
  currentTag,
  loggedInDiscordId,
  loggedInUserTruckyId,
  isManager,
}: {
  initialPosts: any[];
  trendingTags: any[];
  currentTag?: string;
  loggedInDiscordId: string;
  loggedInUserTruckyId?: string | null;
  isManager: boolean;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length === 10);
  
  // Update state if navigation changes the props
  useEffect(() => {
    setPosts(initialPosts);
    setPage(1);
    setHasMore(initialPosts.length === 10);
  }, [initialPosts, currentTag]);
  
  // State for modal
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const url = new URL("/api/gallery", window.location.origin);
      url.searchParams.set("global", "true");
      url.searchParams.set("page", nextPage.toString());
      url.searchParams.set("limit", "10");
      if (currentTag) url.searchParams.set("tag", currentTag);

      const res = await fetch(url.toString());
      if (res.ok) {
        const newPosts = await res.json();
        if (newPosts.length < 10) {
          setHasMore(false);
        }
        setPosts((prev) => [...prev, ...newPosts]);
        setPage(nextPage);
      }
    } catch (error) {
      console.error("Gagal memuat feeds:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!loggedInDiscordId) return; // User must be logged in

    // Optimistic UI update
    setPosts(prev => prev.map(p => {
      if (p._id === postId) {
        const isLiked = p.likes?.includes(loggedInDiscordId);
        const newLikes = isLiked
          ? p.likes.filter((id: string) => id !== loggedInDiscordId)
          : [...(p.likes || []), loggedInDiscordId];
        return { ...p, likes: newLikes };
      }
      return p;
    }));

    try {
      await fetch(`/api/gallery/${postId}/like`, { method: "POST" });
    } catch (error) {
      console.error("Gagal menyukai postingan", error);
      // Revert optimism if failed (optional, let's keep it simple for now)
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: id });
    } catch {
      return "";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pb-10 relative items-start">
      {/* Left Sidebar (Nav) */}
      <div className="hidden lg:block lg:col-span-1 sticky top-48 space-y-2 h-fit">
        <Link href="/gallery" className="flex items-center gap-4 p-4 rounded-xl text-muted-foreground hover:bg-card hover:text-foreground font-bold transition-all border border-transparent hover:border-border hover:shadow-sm">
          <Home className="w-6 h-6" />
          <span className="text-lg">Gallery Grid</span>
        </Link>
        <Link href="/feeds" className="flex items-center gap-4 p-4 rounded-xl bg-card text-primary font-bold transition-all border border-border shadow-sm">
          <Hash className="w-6 h-6" />
          <span className="text-lg">Global Feeds</span>
        </Link>
        <div className="flex items-center gap-4 p-4 rounded-xl text-muted-foreground hover:bg-card hover:text-foreground font-bold transition-all cursor-not-allowed border border-transparent opacity-60">
          <Users className="w-6 h-6" />
          <span className="text-lg">Following <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full ml-2 font-medium">SOON</span></span>
        </div>
        <Link href="/dashboard/notifications" className="flex items-center gap-4 p-4 rounded-xl text-muted-foreground hover:bg-card hover:text-foreground font-bold transition-all border border-transparent hover:border-border hover:shadow-sm">
          <Bell className="w-6 h-6" />
          <span className="text-lg">Notifikasi</span>
        </Link>
        
        <div className="pt-4">
          <button 
            onClick={() => setShowUpload(true)}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-full bg-primary text-primary-foreground font-bold shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all"
          >
            <Plus className="w-6 h-6" />
            <span className="text-lg">Unggah Foto</span>
          </button>
        </div>
      </div>

      {/* Mobile FAB */}
      <div className="lg:hidden fixed bottom-24 right-4 z-50">
        <button 
          onClick={() => setShowUpload(true)}
          className="w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.3)] hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-8 h-8" />
        </button>
      </div>

      {/* Main Feed Column */}
      <div className="lg:col-span-2 space-y-8">
        {posts.length === 0 ? (
          <div className="py-24 text-center bg-card/30 rounded-3xl border-2 border-dashed border-border/50">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <MonitorPlay className="w-12 h-12 text-muted-foreground/50" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3">
              Feeds Kosong
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto text-sm leading-relaxed">
              Jadilah yang pertama untuk membagikan momen perjalanan Anda!
            </p>
          </div>
        ) : (
          <div className="space-y-8">
          {posts.map((post) => {
            const isLiked = post.likes?.includes(loggedInDiscordId);
            
            return (
              <div key={post._id} className="bg-card border border-border shadow-sm rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header (Profile) */}
                <div className="p-4 flex items-center gap-3">
                  {post.user?.truckyId ? (
                    <Link href={`/profile/${post.user.truckyId}`} className="shrink-0">
                      <img 
                        src={post.user.avatarUrl || "/placeholder-avatar.png"} 
                        alt={post.user.name} 
                        className="w-10 h-10 rounded-full object-cover border border-border"
                      />
                    </Link>
                  ) : (
                    <img 
                      src={post.user?.avatarUrl || "/placeholder-avatar.png"} 
                      alt={post.user?.name || "Driver"} 
                      className="w-10 h-10 rounded-full object-cover border border-border shrink-0"
                    />
                  )}
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                      {post.user?.truckyId ? (
                        <Link href={`/profile/${post.user.truckyId}`} className="font-bold text-foreground hover:text-primary transition-colors text-sm">
                          {post.user.name}
                        </Link>
                      ) : (
                        <span className="font-bold text-foreground text-sm">{post.user?.name || "Driver"}</span>
                      )}
                      {post.user && (
                        <UserBadges 
                          role={post.user.role} 
                          isBooster={post.user.isBooster} 
                          isNismaraPlus={post.user.isNismaraPlus} 
                          truckyRank={post.user.truckyRank}
                        />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(post.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Media */}
                <div 
                  className="w-full relative cursor-pointer group bg-black"
                  onClick={() => setSelectedPost(post)}
                >
                  <img
                    src={post.imageUrl}
                    alt={post.caption || "Feed Post"}
                    className="w-full h-auto max-h-[80vh] object-contain"
                    loading="lazy"
                  />
                  {/* Indicator if multiple images */}
                  {post.imageUrls && post.imageUrls.length > 1 && (
                    <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-md font-medium backdrop-blur-sm">
                      1 / {post.imageUrls.length}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-4">
                  <div className="flex items-center gap-4 mb-3">
                    <button 
                      onClick={() => handleLike(post._id)}
                      className="group flex items-center gap-1.5 transition-transform active:scale-95"
                    >
                      <Heart className={`w-7 h-7 transition-colors duration-300 ${isLiked ? 'fill-red-500 text-red-500' : 'text-foreground group-hover:text-muted-foreground'}`} />
                    </button>
                    <button 
                      onClick={() => setSelectedPost(post)}
                      className="group flex items-center gap-1.5 transition-transform active:scale-95"
                    >
                      <MessageCircle className="w-7 h-7 text-foreground group-hover:text-muted-foreground" />
                    </button>
                    <button className="group flex items-center gap-1.5 transition-transform active:scale-95 ml-auto">
                      <Share2 className="w-6 h-6 text-foreground group-hover:text-muted-foreground" />
                    </button>
                  </div>

                  {/* Likes count */}
                  <div className="font-bold text-sm mb-2 text-foreground">
                    {post.likes?.length || 0} Suka
                  </div>

                  {/* Caption and Tags */}
                  {(post.caption || (post.tags && post.tags.length > 0)) && (
                    <div className="text-sm mb-2 text-foreground">
                      <span className="font-bold mr-2">{post.user?.name}</span>
                      {post.caption}
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {post.tags.map((tag: string) => (
                            <Link href={`/feeds?tag=${tag}`} key={tag} className="text-primary hover:underline cursor-pointer font-medium">
                              #{tag}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* View all comments */}
                  {post.commentCount > 0 && (
                    <button 
                      onClick={() => setSelectedPost(post)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
                    >
                      Lihat semua {post.commentCount} komentar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load More Button */}
      {hasMore && posts.length > 0 && (
        <div className="pt-8 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-8 py-3 rounded-full font-bold bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Memuat...</span>
              </>
            ) : (
              <span>Muat Lebih Banyak</span>
            )}
          </button>
        </div>
      )}
      </div>

      {/* Right Sidebar (Widgets) */}
      <div className="hidden lg:block lg:col-span-1 sticky top-48 space-y-6 h-fit">
        <div className="bg-card border border-border shadow-sm rounded-2xl p-5">
          <h3 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
            🔥 Trending Tags
          </h3>
          {trendingTags.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada tagar populer.</p>
          ) : (
            <div className="space-y-3">
              {trendingTags.map((tagItem) => (
                <Link href={`/feeds?tag=${tagItem.tag}`} key={tagItem.tag} className="flex flex-col group cursor-pointer">
                  <span className="font-bold text-foreground group-hover:text-primary transition-colors text-sm">
                    #{tagItem.tag}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {tagItem.count} post
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card/50 border border-border rounded-2xl p-5 text-sm text-muted-foreground">
          <p className="mb-2">Jelajahi momen perjalanan, bagikan pengalaman Anda dengan driver lainnya di Nismara Transport.</p>
          <p>© 2026 Nismara Transport</p>
        </div>
      </div>

      {/* Modal - Reused from Gallery */}
      {selectedPost && (
        <GalleryModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          loggedInUserId={loggedInDiscordId}
          loggedInUserTruckyId={loggedInUserTruckyId}
          profileName={selectedPost.user?.name || "Driver"}
          profileAvatar={selectedPost.user?.avatarUrl || "/placeholder-avatar.png"}
          profileTruckyId={selectedPost.user?.truckyId}
          profileIsNismaraPlus={selectedPost.user?.isNismaraPlus}
          profileIsBooster={selectedPost.user?.isBooster}
          profileRole={selectedPost.user?.role}
          isManager={isManager}
          onPostUpdate={(updated) => {
            // Keep the user info when updating post from modal
            const fullUpdated = { ...selectedPost, ...updated, user: selectedPost.user };
            setPosts((prev) =>
              prev.map((p) => (p._id === fullUpdated._id ? fullUpdated : p))
            );
            setSelectedPost(fullUpdated);
          }}
        />
      )}

      {/* Upload Modal */}
      {showUpload && (
        <UploadPostDialog
          onClose={() => setShowUpload(false)}
          onSuccess={(newPost) => {
            // Add new post to the top of the feed
            setPosts((prev) => [newPost, ...prev]);
            setShowUpload(false);
          }}
        />
      )}
    </div>
  );
}
