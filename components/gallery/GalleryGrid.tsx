"use client";

import { useState, useEffect } from "react";
import { Heart, MessageCircle, MonitorPlay, Plus } from "lucide-react";
import GalleryModal from "./GalleryModal";
import UploadPostDialog from "./UploadPostDialog";

export interface UserComment {
  _id: string;
  userId: string;
  text: string;
  createdAt: string;
  likes?: string[];
  parentId?: string;
  replyToUser?: string;
  user: {
    name: string;
    avatarUrl: string;
    truckyId?: string;
    isNismaraPlus?: boolean;
    nismaraPlusStartedAt?: string | null;
    isBooster?: boolean;
    isManager?: boolean;
    truckyRank?: string;
  };
}

export interface GalleryPost {
  _id: string;
  userId: string;
  imageUrl: string;
  imageUrls?: string[];
  caption: string;
  likes: string[];
  commentCount?: number;
  createdAt: string;
}

export default function GalleryGrid({
  truckyId,
  isOwner,
  discordId,
  loggedInUserTruckyId,
  profileName,
  profileAvatar,
  profileDiscordId,
  profileIsNismaraPlus,
  profileIsBooster,
  profileRole,
  isManager,
}: {
  truckyId: string;
  isOwner: boolean;
  discordId: string; // the logged in user's discordId
  loggedInUserTruckyId?: string | null;
  profileName: string;
  profileAvatar: string;
  profileDiscordId: string;
  profileIsNismaraPlus?: boolean;
  profileIsBooster?: boolean;
  profileRole?: string;
  isManager?: boolean;
}) {
  const [posts, setPosts] = useState<GalleryPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<GalleryPost | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const fetchPosts = async () => {
    try {
      const res = await fetch(`/api/gallery?userId=${profileDiscordId}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [truckyId]);

  return (
    <div>
      {/* Header Actions */}
      <div className="flex justify-end mb-6">
        {isOwner && (
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg hover:bg-primary/90 transition"
          >
            <Plus className="w-4 h-4" /> Postingan Baru
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-20 text-center text-muted-foreground">
          Memuat galeri...
        </div>
      ) : posts.length === 0 ? (
        <div className="col-span-3 py-24 text-center bg-background/30 rounded-2xl border-2 border-dashed border-border/50">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <MonitorPlay className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-3">
            Belum ada unggahan
          </h3>
          <p className="text-muted-foreground max-w-sm mx-auto text-sm leading-relaxed">
            {isOwner
              ? "Ayo bagikan foto truk terbaikmu sekarang!"
              : "Driver ini belum mengunggah foto truk."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 md:gap-4 lg:gap-6">
          {posts.map((post) => (
            <div
              key={post._id}
              className="relative aspect-square cursor-pointer group rounded-sm md:rounded-xl overflow-hidden bg-muted"
              onClick={() => setSelectedPost(post)}
            >
              <img
                src={post.imageUrl}
                alt={post.caption}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              {post.imageUrls && post.imageUrls.length > 1 && (
                <div className="absolute top-2 right-2 z-10 text-white drop-shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></svg>
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-6 text-white font-bold">
                <div className="flex items-center gap-2">
                  <Heart className="w-6 h-6 fill-white" />
                  <span>{post.likes.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-6 h-6 fill-white" />
                  <span>{post.commentCount || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {selectedPost && (
        <GalleryModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          loggedInUserId={discordId}
          loggedInUserTruckyId={loggedInUserTruckyId}
          profileName={profileName}
          profileAvatar={profileAvatar}
          profileTruckyId={truckyId}
          profileIsNismaraPlus={profileIsNismaraPlus}
          profileIsBooster={profileIsBooster}
          profileRole={profileRole}
          isManager={isManager}
          onPostUpdate={(updated: GalleryPost) => {
            setPosts((prev) =>
              prev.map((p) => (p._id === updated._id ? updated : p)),
            );
            setSelectedPost(updated);
          }}
        />
      )}

      {isUploadOpen && (
        <UploadPostDialog
          onClose={() => setIsUploadOpen(false)}
          onSuccess={(newPost: GalleryPost) => {
            setPosts([newPost, ...posts]);
            setIsUploadOpen(false);
          }}
        />
      )}
    </div>
  );
}
