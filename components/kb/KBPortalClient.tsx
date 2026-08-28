"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Search, Folder } from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";

export default function KBPortalClient({ session }: { session: any }) {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/kb"); // Reusing the main endpoint that returns both, or use categories
      const data = await res.json();
      if (data.success && data.categories) {
        setCategories(data.categories);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden bg-card/50 border border-border/50 p-8 md:p-12 mb-10 flex flex-col items-center text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
        <div className="w-16 h-16 bg-primary/20 text-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/10">
          <BookOpen className="w-8 h-8" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
          Nismara <span className="text-gradient">Knowledge Base</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Temukan panduan, aturan, dan informasi seputar VTC Nismara Logistics.
        </p>
      </div>

      {/* Categories Grid */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-2">
          <Folder className="w-6 h-6 text-primary" /> Kategori Topik
        </h2>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card/30 rounded-2xl h-32 animate-pulse border border-border/30" />
            ))}
          </div>
        ) : categories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat, idx) => (
              <ScrollReveal key={cat._id} delay={idx * 0.1}>
                <Link href={`/kb/${cat.slug}`} className="group block h-full">
                  <div className="bg-card/50 border border-border/50 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 rounded-2xl p-6 transition-all duration-300 h-full flex flex-col justify-center items-center text-center">
                    <Folder className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors mb-4" />
                    <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                      {cat.name}
                    </h3>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        ) : (
          <div className="bg-card/30 border border-border/50 rounded-2xl p-12 text-center flex flex-col items-center">
            <Folder className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Belum ada kategori</h3>
          </div>
        )}
      </div>
    </div>
  );
}
