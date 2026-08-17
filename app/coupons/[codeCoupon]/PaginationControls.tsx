"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  codeCoupon: string;
}

export default function PaginationControls({ currentPage, totalPages, codeCoupon }: PaginationControlsProps) {
  // Function to generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5; // Show at most 5 page numbers
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Logic for ellipsis and showing current page in the middle
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <Link
        href={`/coupons/${codeCoupon}?page=${currentPage - 1}`}
        className={`p-2 rounded-xl border border-border flex items-center justify-center transition-colors ${
          currentPage === 1 
            ? "opacity-50 pointer-events-none bg-muted" 
            : "hover:bg-primary/10 hover:border-primary/50 text-foreground hover:text-primary"
        }`}
        aria-disabled={currentPage === 1}
      >
        <ChevronLeft size={20} />
      </Link>

      {getPageNumbers().map((page, index) => (
        page === "..." ? (
          <span key={`ellipsis-${index}`} className="px-3 text-muted-foreground">...</span>
        ) : (
          <Link
            key={`page-${page}`}
            href={`/coupons/${codeCoupon}?page=${page}`}
            className={`w-10 h-10 flex items-center justify-center rounded-xl border font-bold transition-all ${
              currentPage === page
                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-110"
                : "border-border hover:border-primary/50 hover:bg-primary/10 text-foreground"
            }`}
          >
            {page}
          </Link>
        )
      ))}

      <Link
        href={`/coupons/${codeCoupon}?page=${currentPage + 1}`}
        className={`p-2 rounded-xl border border-border flex items-center justify-center transition-colors ${
          currentPage === totalPages 
            ? "opacity-50 pointer-events-none bg-muted" 
            : "hover:bg-primary/10 hover:border-primary/50 text-foreground hover:text-primary"
        }`}
        aria-disabled={currentPage === totalPages}
      >
        <ChevronRight size={20} />
      </Link>
    </div>
  );
}
