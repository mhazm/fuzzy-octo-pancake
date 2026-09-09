"use client";

import React, { useState } from "react";
import {
  FileText,
  Download,
  Printer,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  BookOpen,
  ShieldCheck,
} from "lucide-react";

export default function DriverGuidePage() {
  // Gunakan link preview untuk stabilitas maksimal dengan Google Drive
  const pdfUrl =
    "https://drive.google.com/file/d/154DyfeYDZIE3ZkM19RdqS_jIS_T6UFkW/preview";
  const downloadUrl =
    "https://drive.google.com/file/d/154DyfeYDZIE3ZkM19RdqS_jIS_T6UFkW/view?usp=sharing";

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 pb-10 animate-in fade-in duration-700">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-lilac/10 rounded-lg text-accent-lilac">
              <BookOpen size={24} />
            </div>
            <h1 className="text-4xl font-black text-(-primary-foreground) tracking-tighter uppercase">
              Driver Guide
            </h1>
          </div>
          <p className="text-(-primary-foreground)/40 font-bold uppercase text-[10px] tracking-[0.2em] ml-11">
            Nismara Transport • Official Operational Manual
          </p>
        </div>

        <div className="flex gap-2">
          <a
            href={downloadUrl}
            target="_blank"
            className="flex items-center gap-2 bg-card border border-border px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-accent-lilac hover:text-white transition-all shadow-xl"
          >
            <Download size={16} /> Download PDF
          </a>
        </div>
      </div>

      {/* PDF READER CONTAINER */}
      <div className="relative group bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-2xl flex, flex-col h-[80vh]">
        {/* TOOLBAR ATAS */}
        <div className="bg-white/5 border-b border-border px-8 py-4 flex justify-between items-center backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-accent-lilac">
              <FileText size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Viewer Mode
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-foreground/40 uppercase tracking-widest">
            Nismara SOP Engine v2.4
          </span>
        </div>

        {/* EMBED VIEWER CONTAINER */}
        <div className="flex-1 w-full bg-black/40 relative">
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(downloadUrl)}&embedded=true`}
            className="w-full h-full border-none"
            title="Driver Guide Document"
          />
          {/* OVERLAY UNTUK KESAN PREMIUM */}
          <div className="absolute inset-0 pointer-events-none border-[12px] border-card/10 rounded-[2.5rem]" />
        </div>

        {/* TOOLBAR BAWAH */}
        <div className="bg-white/5 border-t border-border px-8 py-4 flex justify-between items-center backdrop-blur-md">
          <div className="flex items-center gap-2 text-[10px] font-bold text-foreground/40 uppercase tracking-widest">
            <ShieldCheck size={14} className="text-emerald-400" /> Dokumen Resmi
            Nismara Transport
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 bg-white/5 border border-border rounded-xl text-foreground/20 cursor-not-allowed">
              <ChevronLeft size={20} />
            </button>
            <span className="text-xs font-black text-(-primary-foreground) tabular-nums">
              PAGES CONTROLLED BY GOOGLE VIEWER
            </span>
            <button className="p-2 bg-white/5 border border-border rounded-xl text-foreground/20 cursor-not-allowed">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* QUICK INFO CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-border bg-gradient-to-br from-accent-lilac/5 to-transparent">
          <h4 className="text-[10px] font-black text-accent-lilac uppercase tracking-widest mb-2">
            Penting
          </h4>
          <p className="text-sm font-medium text-foreground/60 leading-relaxed">
            "Bacalah panduan ini sebelum melakukan hauling perdana Anda untuk
            memahami sistem NC dan Poin Penalti."
          </p>
        </div>
        <div className="glass-panel p-6 rounded-3xl border border-border">
          <h4 className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-2">
            Update Terakhir
          </h4>
          <p className="text-xl font-black text-(-primary-foreground) uppercase">
            07 MEI 2026
          </p>
        </div>
        <div className="glass-panel p-6 rounded-3xl border border-border">
          <h4 className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-2">
            Format File
          </h4>
          <p className="text-xl font-black text-(-primary-foreground) uppercase">
            Digital PDF
          </p>
        </div>
      </div>
    </div>
  );
}
