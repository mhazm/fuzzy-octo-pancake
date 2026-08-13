"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

interface AppealButtonProps {
  jobId: string;
  driverId?: string | number | null;
}

export default function AppealButton({ jobId, driverId }: AppealButtonProps) {
  const { data: session } = useSession();
  
  // Jika tidak login, atau bukan miliknya, maka tidak usah render apa-apa.
  const isOwner = session?.user?.discordId === driverId;
  if (!isOwner) return null;

  return (
    <Link 
      href={`/dashboard/ticket?jobId=${jobId}`}
      className="px-4 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-1"
    >
      <AlertCircle className="w-3 h-3" /> Banding Pekerjaan
    </Link>
  );
}
