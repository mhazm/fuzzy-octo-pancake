"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, ChevronRight, Search, ShieldCheck, Lock } from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";

export default function KBCategoryClient({ categorySlug, session }: { categorySlug: string, session: any }) {
  const [articles, setArticles] = useState<any[]>([]);
  const [categoryName, setCategoryName] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [searchQuery]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (searchQuery) query.append("search", searchQuery);

      const res = await fetch(`/api/kb?${query.toString()}`);
      const data = await res.json();
      
      if (data.success) {
        // Find the category name corresponding to this slug
        const currentCategory = data.categories?.find((c: any) => c.slug === categorySlug);
        setCategoryName(currentCategory ? currentCategory.name : categorySlug);

        // Filter articles by categorySlug
        const filtered = data.articles.filter((a: any) => a.categorySlug === categorySlug);
        setArticles(filtered);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const getAccessBadge = (level: string) => {
    if (level === "manager") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
          <ShieldCheck className="w-3 h-3" /> Manager
        </span>
      );
    }
    if (level === "driver") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-500 border border-blue-500/30">
          <Lock className="w-3 h-3" /> Driver
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-500 border border-green-500/30">
        Public
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10">
        <Link href="/kb" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6 font-semibold">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Kategori
        </Link>
        <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight capitalize">
          {categoryName}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mb-8">
          Kumpulan artikel dan panduan terkait {categoryName}.
        </p>

        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-3 bg-card/50 border border-border/50 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            placeholder="Cari artikel di kategori ini..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Article Grid */}
      <div className="mb-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card/30 rounded-2xl h-48 animate-pulse border border-border/30" />
            ))}
          </div>
        ) : articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article, idx) => (
              <ScrollReveal key={article._id} delay={idx * 0.1}>
                <Link href={`/kb/${categorySlug}/${article.slug}`} className="group block h-full">
                  <div className="bg-card/50 border border-border/50 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 rounded-2xl p-6 transition-all duration-300 h-full flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4">
                      {getAccessBadge(article.accessLevel)}
                    </div>
                    
                    <h2 className="text-xl font-bold mb-3 mt-4 group-hover:text-primary transition-colors line-clamp-2 pr-16">
                      {article.title}
                    </h2>
                    
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-6 flex-1">
                      {article.description || "Tidak ada deskripsi singkat."}
                    </p>
                    
                    <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground border-t border-border/30 pt-4">
                      <span>{new Date(article.createdAt).toLocaleDateString("id-ID")}</span>
                      <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform font-bold text-primary">
                        Baca Artikel <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        ) : (
          <div className="bg-card/30 border border-border/50 rounded-2xl p-12 text-center flex flex-col items-center">
            <BookOpen className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Tidak ada artikel</h3>
            <p className="text-muted-foreground">Belum ada artikel yang dipublikasikan dalam kategori ini.</p>
          </div>
        )}
      </div>
    </div>
  );
}
