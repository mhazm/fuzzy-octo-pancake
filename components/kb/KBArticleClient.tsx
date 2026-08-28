"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { ArrowLeft, Calendar, Eye, ShieldCheck, Lock, Menu, Home, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import KBSidebarClient from "@/components/kb/KBSidebarClient";

export default function KBArticleClient({ slug, categorySlug, session }: { slug: string, categorySlug?: string, session: any }) {
  const [article, setArticle] = useState<any>(null);
  const [relatedData, setRelatedData] = useState<{ prev: any, next: any, related: any[] }>({ prev: null, next: null, related: [] });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [slug]);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        // Since we fetch by slug, it's mostly the same, but we could pass categorySlug if needed
      // Currently API just takes slug, so it's fine.
      const res = await fetch(`/api/kb/${slug}`);
        const data = await res.json();
        
        if (data.success && data.article) {
          setArticle(data.article);
          setRelatedData({
            prev: data.prevArticle || null,
            next: data.nextArticle || null,
            related: data.relatedArticles || []
          });
        } else {
          setError(data.error || "Gagal memuat artikel");
        }
      } catch (e) {
        setError("Terjadi kesalahan jaringan");
      } finally {
        setIsLoading(false);
      }
    };
    fetchArticle();
  }, [slug]);

  const getAccessBadge = (level: string) => {
    if (level === "manager") return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30"><ShieldCheck className="w-4 h-4" /> Manager Only</span>;
    if (level === "driver") return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-500 border border-blue-500/30"><Lock className="w-4 h-4" /> Driver Only</span>;
    return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-500 border border-green-500/30">Public Access</span>;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse w-full max-w-4xl">
        <div className="h-4 bg-card/50 rounded-xl w-1/3 mb-4"></div>
        <div className="h-12 bg-card/50 rounded-xl w-3/4"></div>
        <div className="h-6 bg-card/50 rounded-xl w-1/4 mb-8"></div>
        <div className="h-64 bg-card/50 rounded-2xl w-full"></div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="w-full text-center py-20 max-w-2xl mx-auto">
        <div className="bg-destructive/10 text-destructive p-6 rounded-2xl border border-destructive/20 mb-6">
          <h2 className="text-2xl font-bold mb-2">Akses Ditolak / Tidak Ditemukan</h2>
          <p>{error}</p>
        </div>
        <Link href="/kb" className="text-primary hover:underline flex items-center justify-center gap-2 font-semibold">
          <ArrowLeft className="w-5 h-5" /> Kembali ke Pusat Pengetahuan
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl">
      {/* Breadcrumbs & Mobile Menu Toggle */}
      <div className="flex items-center gap-4 mb-8 text-sm text-muted-foreground">
        <div className="lg:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger className="p-2 -ml-2 hover:bg-card/50 rounded-md transition-colors text-foreground">
              <Menu className="w-5 h-5" />
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80 bg-background/95 backdrop-blur-xl border-border/30">
              <div className="h-full overflow-y-auto">
                <KBSidebarClient currentSlug={slug} />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <nav className="flex items-center flex-wrap gap-2">
          <Link href="/kb" className="hover:text-primary transition-colors flex items-center gap-1">
            <Home className="w-4 h-4" />
          </Link>
          <ChevronRight className="w-4 h-4 opacity-50" />
          <Link href={`/kb/${categorySlug || article.categorySlug}`} className="hover:text-primary transition-colors font-medium text-foreground/80">
            {article.category}
          </Link>
          <ChevronRight className="w-4 h-4 opacity-50" />
          <span className="truncate max-w-[150px] sm:max-w-[300px] font-semibold text-foreground">{article.title}</span>
        </nav>
      </div>

      <div className="mb-10">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <span className="text-sm font-bold uppercase tracking-wider text-primary">
            {article.category}
          </span>
          <span className="text-border">|</span>
          {getAccessBadge(article.accessLevel)}
        </div>
        
        <h1 className="text-4xl md:text-5xl font-black text-foreground mb-6 leading-tight">
          {article.title}
        </h1>
        
        <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground border-b border-border/30 pb-8">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {(() => {
              const created = new Date(article.createdAt).getTime();
              const updated = new Date(article.updatedAt || article.createdAt).getTime();
              // If updated time is at least 1 minute after created time
              if (updated - created > 60000) {
                return `Last Update: ${new Date(article.updatedAt).toLocaleDateString("id-ID", { year: 'numeric', month: 'long', day: 'numeric' })}`;
              }
              return `Published: ${new Date(article.createdAt).toLocaleDateString("id-ID", { year: 'numeric', month: 'long', day: 'numeric' })}`;
            })()}
          </div>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            {article.views + 1} tayangan
          </div>
        </div>
      </div>

      {article.coverImage && (
        <img 
          src={article.coverImage} 
          alt={article.title}
          className="w-full h-auto max-h-[400px] object-cover rounded-3xl mb-12 shadow-2xl shadow-primary/5 border border-border/50"
        />
      )}

      {/* Markdown Body */}
      <article className="prose prose-invert prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary hover:prose-a:text-primary/80 prose-img:rounded-2xl prose-img:border prose-img:border-border/50 prose-pre:bg-card/50 prose-pre:border prose-pre:border-border/50">
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
          {article.content}
        </ReactMarkdown>
      </article>
      
      {/* RELATED ARTICLES SECTION */}
      {relatedData.related.length > 0 && (
        <div className="mt-24">
          <h2 className="text-2xl font-bold mb-2">Langkah Selanjutnya</h2>
          <p className="text-muted-foreground mb-6">Pelajari artikel terkait lainnya dalam kategori {article.category}.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relatedData.related.map((rel: any) => (
              <Link 
                key={rel._id} 
                href={`/kb/${rel.categorySlug}/${rel.slug}`}
                className="bg-card/30 border border-border/50 hover:border-primary/50 hover:bg-card/80 p-5 rounded-2xl transition-all block group"
              >
                <h3 className="font-bold text-foreground group-hover:text-primary mb-1">{rel.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{rel.description || "Lanjutkan membaca artikel terkait dalam kategori ini."}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* PREV / NEXT NAVIGATION */}
      {(relatedData.prev || relatedData.next) && (
        <div className="mt-16 pt-8 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          {relatedData.prev ? (
            <Link 
              href={`/kb/${relatedData.prev.categorySlug}/${relatedData.prev.slug}`}
              className="w-full sm:w-1/2 flex flex-col items-start p-4 hover:bg-card/30 rounded-xl transition-colors group"
            >
              <span className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Sebelumnya</span>
              <span className="font-bold text-foreground group-hover:text-primary flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> {relatedData.prev.title}
              </span>
            </Link>
          ) : <div className="w-full sm:w-1/2" />}
          
          {relatedData.next && (
            <Link 
              href={`/kb/${relatedData.next.categorySlug}/${relatedData.next.slug}`}
              className="w-full sm:w-1/2 flex flex-col items-end p-4 hover:bg-card/30 rounded-xl transition-colors group text-right"
            >
              <span className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Selanjutnya</span>
              <span className="font-bold text-foreground group-hover:text-primary flex items-center gap-2">
                {relatedData.next.title} <ArrowLeft className="w-4 h-4 rotate-180" />
              </span>
            </Link>
          )}
        </div>
      )}

      <div className="mt-8 pt-8 border-t border-border/30 text-center text-sm text-muted-foreground">
        Terakhir diperbarui: {new Date(article.updatedAt).toLocaleDateString("id-ID", { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}
