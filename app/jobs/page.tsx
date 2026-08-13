import Link from "next/link";
import { Map } from "lucide-react";
import JobList from "./jobList";
import { fetchJobs } from "./actions";

export const revalidate = 120;

export default async function PublicJobsPage(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const searchParams = await props.searchParams;

  // Logika 3 tab: default ke completed jika tidak ada parameter
  let currentTab: "ongoing" | "completed" | "canceled" = "completed";
  if (searchParams.tab === "ongoing") currentTab = "ongoing";
  if (searchParams.tab === "canceled") currentTab = "canceled";

  const initialJobs = await fetchJobs(currentTab, 0, 12);

  return (
    <main className="min-h-screen pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-primary/20 rounded-2xl mb-4 border border-primary/30">
            <Map className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-extrabold text-foreground mb-2">
            Live <span className="text-gradient">Logbook</span>
          </h1>
          <p className="text-gray-400 text-lg">
            Pantau aktivitas pengiriman Nismara Transport secara langsung.
          </p>
        </div>

        {/* Tab Navigasi 3 Opsi */}
        <div className="flex justify-center mb-10">
          <div className="glass-panel inline-flex p-1 rounded-2xl bg-card/10 border border-border/50">
            <Link
              href="/jobs?tab=ongoing"
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                currentTab === "ongoing"
                  ? "bg-accent-sky text-white shadow-lg"
                  : "text-gray-400 hover:text-foreground"
              }`}
            >
              Ongoing
            </Link>
            <Link
              href="/jobs?tab=completed"
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                currentTab === "completed"
                  ? "bg-primary text-white shadow-lg"
                  : "text-gray-400 hover:text-foreground"
              }`}
            >
              Completed
            </Link>
            <Link
              href="/jobs?tab=canceled"
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                currentTab === "canceled"
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "text-gray-400 hover:text-foreground"
              }`}
            >
              Canceled
            </Link>
          </div>
        </div>

        {/* Tabel dengan Key unik agar remount saat pindah tab */}
        <JobList key={currentTab} initialJobs={initialJobs} tab={currentTab} />
      </div>
    </main>
  );
}
