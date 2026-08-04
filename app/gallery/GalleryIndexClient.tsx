"use client";

import { useState } from "react";
import { Heart, MessageCircle, MonitorPlay, Loader2 } from "lucide-react";
import GalleryModal from "@/components/gallery/GalleryModal";
import Link from "next/link";
import NismaraPlusBadge from "@/components/icons/NismaraPlusBadge";
import ServerBoosterBadge from "@/components/icons/ServerBoosterBadge";

export default function GalleryIndexClient({
  initialPosts,
  loggedInDiscordId,
  loggedInUserTruckyId,
  isManager,
}: {
  initialPosts: any[];
  loggedInDiscordId: string;
  loggedInUserTruckyId?: string | null;
  isManager: boolean;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length === 12);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/gallery?global=true&page=${nextPage}`);
      if (res.ok) {
        const newPosts = await res.json();
        if (newPosts.length < 12) {
          setHasMore(false);
        }
        setPosts((prev) => [...prev, ...newPosts]);
        setPage(nextPage);
      }
    } catch (error) {
      console.error("Gagal memuat galeri:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div>
      {/* Grid */}
      {posts.length === 0 ? (
        <div className="py-24 text-center bg-card/30 rounded-3xl border-2 border-dashed border-border/50">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <MonitorPlay className="w-12 h-12 text-muted-foreground/50" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-3">
            Galeri Kosong
          </h3>
          <p className="text-muted-foreground max-w-sm mx-auto text-sm leading-relaxed">
            Jadilah yang pertama untuk membagikan momen perjalanan Anda!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4 lg:gap-6">
          {posts.map((post) => (
            <div key={post._id} className="group relative flex flex-col gap-2">
              <div
                className="relative aspect-square cursor-pointer rounded-lg md:rounded-2xl overflow-hidden bg-muted shadow-sm hover:shadow-xl transition-all duration-500"
                onClick={() => setSelectedPost(post)}
              >
                <img
                  src={post.imageUrl}
                  alt={post.caption || "Gallery Post"}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />
                {post.imageUrls && post.imageUrls.length > 1 && (
                  <div className="absolute top-3 right-3 z-10 text-white drop-shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></svg>
                  </div>
                )}
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-6 text-white font-bold backdrop-blur-[2px]">
                  <div className="flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    <Heart className="w-6 h-6 fill-white" />
                    <span className="text-lg">{post.likes?.length || 0}</span>
                  </div>
                  <div className="flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                    <MessageCircle className="w-6 h-6 fill-white" />
                    <span className="text-lg">{post.commentCount || 0}</span>
                  </div>
                </div>
              </div>

              {/* Uploader Info */}
              {post.user && (
                <div className="flex items-center gap-2 px-1">
                  {post.user.truckyId ? (
                    <Link href={`/profile/${post.user.truckyId}`} className="shrink-0 relative">
                      <img 
                        src={post.user.avatarUrl || "/placeholder-avatar.png"} 
                        alt={post.user.name} 
                        className="w-7 h-7 rounded-full object-cover border border-border"
                      />
                    </Link>
                  ) : (
                    <img 
                      src={post.user.avatarUrl || "/placeholder-avatar.png"} 
                      alt={post.user.name} 
                      className="w-7 h-7 rounded-full object-cover border border-border shrink-0"
                    />
                  )}
                  <div className="flex flex-col overflow-hidden">
                    <div className="flex items-center gap-1">
                      {post.user.truckyId ? (
                        <Link href={`/profile/${post.user.truckyId}`} className="font-bold text-xs truncate hover:text-primary transition-colors">
                          {post.user.name}
                        </Link>
                      ) : (
                        <span className="font-bold text-xs truncate">{post.user.name}</span>
                      )}
                      {post.user.isBooster && <ServerBoosterBadge />}
                      {post.user.isNismaraPlus && <NismaraPlusBadge />}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {hasMore && posts.length > 0 && (
        <div className="mt-12 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-8 py-3 rounded-full font-bold bg-card border border-border shadow-sm hover:shadow-md hover:bg-muted text-foreground transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span>Memuat...</span>
              </>
            ) : (
              <span>Muat Lebih Banyak</span>
            )}
          </button>
        </div>
      )}

      {/* Modal */}
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
            // Kita perlu mempertahankan data user yang ada karena updated mungkin tidak memilikinya (jika like/comment)
            const fullUpdated = { ...selectedPost, ...updated, user: selectedPost.user };
            setPosts((prev) =>
              prev.map((p) => (p._id === fullUpdated._id ? fullUpdated : p))
            );
            setSelectedPost(fullUpdated);
          }}
        />
      )}
    </div>
  );
}
