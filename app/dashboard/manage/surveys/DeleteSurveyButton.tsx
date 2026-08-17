"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showConfirm, showAlert } from "@/lib/dialog";

export default function DeleteSurveyButton({
  uri,
  title,
}: {
  uri: string;
  title: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = await showConfirm(
      `Yakin ingin menghapus survey "${title}"?\n\nSemua data responden juga akan ikut terhapus. Tindakan ini tidak bisa dibatalkan.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/surveys/${uri}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Gagal menghapus survey");

      await showAlert(`✅ Survey "${title}" berhasil dihapus.`);
      router.refresh();
    } catch (err: any) {
      await showAlert(`❌ ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleDelete}
      disabled={isDeleting}
      className="border-border bg-background hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive text-muted-foreground transition-colors"
      title="Hapus Survey"
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}
