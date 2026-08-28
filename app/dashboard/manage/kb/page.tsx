"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Edit, Trash2, BookOpen, ExternalLink } from "lucide-react";
import { showConfirm, showAlert } from "@/lib/dialog";

export default function ManagerKBDashboard() {
  const [articles, setArticles] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOption, setSortOption] = useState("newest");
  const [pagination, setPagination] = useState({ total: 0, pages: 1, currentPage: 1 });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [page, categoryFilter, sortOption]);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/kb/categories");
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchArticles = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        category: categoryFilter,
        sort: sortOption
      });
      const res = await fetch(`/api/manager/kb?${params}`);
      const data = await res.json();
      if (data.success) {
        setArticles(data.articles);
        if (data.pagination) setPagination(data.pagination);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (await showConfirm(`Yakin ingin menghapus artikel "${title}"?`)) {
      try {
        const res = await fetch(`/api/manager/kb/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success) {
          setArticles(articles.filter(a => a._id !== id));
          showAlert("Artikel berhasil dihapus!");
        } else {
          showAlert(`Gagal: ${data.error}`, "error");
        }
      } catch (e) {
        showAlert("Terjadi kesalahan jaringan", "error");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" /> Kelola Knowledge Base
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Buat dan atur artikel pusat pengetahuan Nismara.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <Link 
            href="/dashboard/manage/kb/categories" 
            className="bg-card text-foreground border border-border hover:bg-card/80 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all w-full sm:w-auto justify-center"
          >
            Kelola Kategori
          </Link>
          <Link 
            href="/dashboard/manage/kb/editor" 
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" /> Tulis Artikel Baru
          </Link>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card/50 p-4 border border-border/50 rounded-2xl shadow-sm">
        <select
          className="bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-auto"
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
        >
          <option value="all">Semua Kategori</option>
          {categories.map(c => (
            <option key={c._id} value={c.name}>{c.name}</option>
          ))}
        </select>

        <select
          className="bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-auto"
          value={sortOption}
          onChange={(e) => { setSortOption(e.target.value); setPage(1); }}
        >
          <option value="newest">Terbaru</option>
          <option value="oldest">Terlama</option>
          <option value="views_desc">Views Terbanyak</option>
          <option value="views_asc">Views Paling Sedikit</option>
          <option value="title_asc">Judul (A-Z)</option>
          <option value="title_desc">Judul (Z-A)</option>
        </select>
      </div>

      <div className="bg-card/50 border border-border/50 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-bold">Judul Artikel</th>
                <th className="px-6 py-4 font-bold">Kategori</th>
                <th className="px-6 py-4 font-bold">Akses</th>
                <th className="px-6 py-4 font-bold text-center">Views</th>
                <th className="px-6 py-4 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Memuat data...</td>
                </tr>
              ) : articles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Belum ada artikel yang ditulis.</td>
                </tr>
              ) : (
                articles.map(article => (
                  <tr key={article._id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground max-w-[300px] truncate">
                      {article.title}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-secondary/50 text-secondary-foreground px-2 py-1 rounded-md text-xs font-semibold">
                        {article.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                        article.accessLevel === 'manager' ? 'bg-amber-500/10 text-amber-500' :
                        article.accessLevel === 'driver' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-green-500/10 text-green-500'
                      }`}>
                        {article.accessLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono">
                      {article.views}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          href={`/kb/${article.categorySlug}/${article.slug}`} 
                          target="_blank"
                          className="p-2 text-muted-foreground hover:text-primary bg-background border border-border rounded-lg transition-colors"
                          title="Lihat Artikel"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <Link 
                          href={`/dashboard/manage/kb/editor?id=${article._id}`} 
                          className="p-2 text-muted-foreground hover:text-blue-500 bg-background border border-border rounded-lg transition-colors"
                          title="Edit Artikel"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button 
                          onClick={() => handleDelete(article._id, article.title)}
                          className="p-2 text-muted-foreground hover:text-destructive bg-background border border-border rounded-lg transition-colors"
                          title="Hapus Artikel"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {pagination.pages > 1 && (
        <div className="flex justify-between items-center bg-card/50 p-4 border border-border/50 rounded-2xl shadow-sm">
          <button 
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 text-sm font-bold bg-background border border-border rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
          >
            Sebelumnya
          </button>
          <span className="text-sm font-medium text-muted-foreground">
            Halaman {pagination.currentPage} dari {pagination.pages} (Total: {pagination.total})
          </span>
          <button 
            disabled={page === pagination.pages}
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 text-sm font-bold bg-background border border-border rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
          >
            Selanjutnya
          </button>
        </div>
      )}
    </div>
  );
}
