"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";

export default function KBSidebarClient({ currentSlug, categorySlug }: { currentSlug?: string, categorySlug?: string }) {
  const [groupedArticles, setGroupedArticles] = useState<Record<string, any[]>>({});
  const [sortedCategories, setSortedCategories] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllArticles = async () => {
      try {
        const res = await fetch("/api/kb");
        const data = await res.json();
        
        if (data.success && data.articles) {
          // Group by category
          const groups: Record<string, any[]> = {};
          data.articles.forEach((article: any) => {
            const cat = article.category || "Uncategorized";
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(article);
          });
          
          setGroupedArticles(groups);
          
          if (data.categories) {
            setSortedCategories(data.categories.map((c: any) => c.name));
          } else {
            setSortedCategories(Object.keys(groups).sort((a, b) => a.localeCompare(b)));
          }
          
          // Auto-expand category that contains the current slug
          const initialExpanded: Record<string, boolean> = {};
          Object.keys(groups).forEach(cat => {
            if (groups[cat].some(a => a.slug === currentSlug)) {
              initialExpanded[cat] = true;
            } else {
              initialExpanded[cat] = false;
            }
          });
          setExpandedCategories(initialExpanded);
        }
      } catch (error) {
        console.error("Failed to fetch sidebar articles", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAllArticles();
  }, [currentSlug]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  if (isLoading) {
    return (
      <div className="py-6 flex flex-col gap-4 animate-pulse">
        <div className="h-6 w-32 bg-card/50 rounded mb-2"></div>
        <div className="h-4 w-48 bg-card/50 rounded"></div>
        <div className="h-4 w-40 bg-card/50 rounded"></div>
      </div>
    );
  }

  return (
    <div className="py-8 pr-6 flex flex-col gap-6">
      <div className="font-black text-xl tracking-tight mb-2">Knowledge Base</div>
      
      {sortedCategories
        .map(category => {
          const isExpanded = expandedCategories[category];
          const articles = groupedArticles[category];
          
          return (
            <div key={category} className="flex flex-col">
              <button 
                onClick={() => toggleCategory(category)}
                className="flex items-center justify-between w-full text-left font-bold text-sm text-foreground/90 hover:text-primary transition-colors py-2 group"
              >
                {category}
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </button>
              
              {isExpanded && (
                <div className="flex flex-col mt-1 space-y-1 border-l border-border/50 ml-2 pl-3">
                  {articles.map(article => {
                    const isActive = currentSlug === article.slug;
                    return (
                      <Link
                        key={article._id}
                        href={`/kb/${article.categorySlug}/${article.slug}`}
                        className={`text-sm py-1.5 px-3 rounded-md transition-colors ${
                          isActive 
                            ? "bg-primary/10 text-primary font-semibold" 
                            : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                        }`}
                      >
                        {article.title}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
