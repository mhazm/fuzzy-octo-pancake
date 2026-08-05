import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  XCircle,
  List,
  MapPin,
  Package,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import DriverAccessBlocker from "@/components/DriverAccessBlocker";

export const metadata = {
  title: "Jobs",
};



// 1. PERBAIKAN: Ubah tipe searchParams menjadi Promise
interface JobsPageProps {
  searchParams: Promise<{
    status?: string;
    page?: string;
  }>;
}

export default async function JobsIndexPage({ searchParams }: JobsPageProps) {
  // 2. PERBAIKAN: Await searchParams sebelum digunakan
  const params = await searchParams;

  // Cek Sesi User
  const session = await getServerSession(authOptions);

  if (!session || !session.user.discordId) {
    redirect("/login");
  }

  if (!session.user?.isDriver || !session.user.driverData) {
    return <DriverAccessBlocker session={session} />;
  }

  const discordId = session.user.discordId;
  const client = await clientPromise;
  const db = client.db();

  // 3. PERBAIKAN: Gunakan 'params' yang sudah di-await, bukan 'searchParams'
  const currentFilter = params.status?.toLowerCase() || "all";

  // Setup Pagination
  const ITEMS_PER_PAGE = 9;
  const currentPage = Number(params.page) || 1;
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;

  // 4. Susun query database
  const query: any = { driverId: discordId };
  if (currentFilter !== "all") {
    query.jobStatus = currentFilter.toUpperCase();
  }

  // Fetch data jobs dengan Limit & Skip untuk Pagination
  const totalJobsCount = await db
    .collection("jobhistories")
    .countDocuments(query);
  const totalPages = Math.ceil(totalJobsCount / ITEMS_PER_PAGE);

  const rawJobs = await db
    .collection("jobhistories")
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(ITEMS_PER_PAGE)
    .toArray();

  // Serialize data MongoDB
  const jobs = rawJobs.map((job) => ({
    _id: job._id.toString(),
    jobId: job.jobId || job._id.toString().slice(-6),
    status: job.jobStatus || "ongoing",
    cargo: job?.cargoName || "Kargo Tidak Diketahui",
    source: job?.sourceCity || "Lokasi Awal",
    destination: job?.destinationCity || "Tujuan",
    incomeNC: job.nc?.total || 0,
    game: job.game || "ETS2",
    createdAt: job.createdAt,
  }));

  // Fungsi utilitas warna status (perbaiki case jika DB menggunakan huruf kapital)
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case "ongoing":
        return {
          color: "text-blue-400",
          bg: "bg-blue-500/10",
          border: "border-blue-500/30",
          icon: <Clock className="w-4 h-4" />,
          label: "Berjalan",
        };
      case "completed":
        return {
          color: "text-green-400",
          bg: "bg-green-500/10",
          border: "border-green-500/30",
          icon: <CheckCircle2 className="w-4 h-4" />,
          label: "Selesai",
        };
      case "canceled":
        return {
          color: "text-red-400",
          bg: "bg-red-500/10",
          border: "border-red-500/30",
          icon: <XCircle className="w-4 h-4" />,
          label: "Dibatalkan",
        };
      default:
        return {
          color: "text-gray-400",
          bg: "bg-gray-500/10",
          border: "border-gray-500/30",
          icon: <List className="w-4 h-4" />,
          label: "Unknown",
        };
    }
  };

  // Helper function untuk generate URL pagination dengan mempertahankan status filter saat ini
  const createPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams();
    if (currentFilter !== "all") params.set("status", currentFilter);
    if (pageNumber > 1) params.set("page", pageNumber.toString());

    const queryString = params.toString();
    return `/dashboard/jobs${queryString ? `?${queryString}` : ""}`;
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-12">
      {/* Header & Filter Tabs */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Package className="text-accent-lilac w-8 h-8" />
            Riwayat Pekerjaan
          </h1>
          <p className="text-gray-400">
            Kelola dan pantau semua riwayat pengiriman kargo Anda. (Total:{" "}
            {totalJobsCount})
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex bg-card/50 p-1 rounded-xl border border-border/50">
          <Link
            href="/dashboard/jobs"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentFilter === "all"
                ? "bg-accent-lilac text-white shadow-md"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Semua
          </Link>
          <Link
            href="/dashboard/jobs?status=ongoing"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              currentFilter === "ongoing"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-md"
                : "text-gray-400 hover:text-blue-400 hover:bg-white/5"
            }`}
          >
            <Clock className="w-4 h-4" /> Ongoing
          </Link>
          <Link
            href="/dashboard/jobs?status=completed"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              currentFilter === "completed"
                ? "bg-green-500/20 text-green-400 border border-green-500/30 shadow-md"
                : "text-gray-400 hover:text-green-400 hover:bg-white/5"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" /> Completed
          </Link>
          <Link
            href="/dashboard/jobs?status=canceled"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              currentFilter === "canceled"
                ? "bg-red-500/20 text-red-400 border border-red-500/30 shadow-md"
                : "text-gray-400 hover:text-red-400 hover:bg-white/5"
            }`}
          >
            <XCircle className="w-4 h-4" /> Canceled
          </Link>
        </div>
      </div>

      {/* Daftar Jobs - Grid Layout */}
      {jobs.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {jobs.map((job) => {
              const statusConfig = getStatusConfig(job.status);

              return (
                <Link
                  href={`/jobs/${job.jobId}`}
                  key={job._id}
                  className="block group"
                >
                  <div
                    className="glass-panel p-5 rounded-2xl border border-border/50 
                                  transition-all duration-300 ease-in-out
                                  group-hover:bg-card/80 group-hover:border-accent-lilac/40 
                                  group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-accent-lilac/10 h-full flex flex-col"
                  >
                    {/* Header Card */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs font-mono text-gray-500">
                          #{job.jobId}
                        </span>
                        <h3 className="text-lg font-bold text-foreground mt-1 line-clamp-1">
                          {job.cargo}
                        </h3>
                      </div>
                      <div
                        className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}
                      >
                        {statusConfig.icon} {statusConfig.label}
                      </div>
                    </div>

                    {/* Body Card (Rute) */}
                    <div className="flex-1 space-y-3 mb-5">
                      <div className="flex items-start gap-3 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-gray-400 text-xs uppercase tracking-wider">
                            Dari
                          </p>
                          <p className="text-gray-200">{job.source}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 text-sm">
                        <MapPin className="w-4 h-4 text-accent-lilac mt-0.5 shrink-0" />
                        <div>
                          <p className="text-gray-400 text-xs uppercase tracking-wider">
                            Ke
                          </p>
                          <p className="text-foreground">{job.destination}</p>
                        </div>
                      </div>
                    </div>

                    {/* Footer Card */}
                    <div className="pt-4 border-t border-border/50 flex justify-between items-center mt-auto">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(job.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <span className="text-xs font-bold bg-white/5 px-2 py-1 rounded-md border border-white/10 text-gray-300">
                        {job.game}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              {currentPage > 1 ? (
                <Link
                  href={createPageUrl(currentPage - 1)}
                  className="p-2 rounded-lg bg-card/50 border border-border/50 text-gray-400 hover:text-foreground hover:bg-white/5 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Link>
              ) : (
                <div className="p-2 rounded-lg bg-card/10 border border-border/20 text-gray-600 cursor-not-allowed">
                  <ChevronLeft className="w-5 h-5" />
                </div>
              )}

              <span className="text-sm font-medium text-gray-400">
                Halaman <span className="text-foreground">{currentPage}</span> dari{" "}
                <span className="text-foreground">{totalPages}</span>
              </span>

              {currentPage < totalPages ? (
                <Link
                  href={createPageUrl(currentPage + 1)}
                  className="p-2 rounded-lg bg-card/50 border border-border/50 text-gray-400 hover:text-foreground hover:bg-white/5 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </Link>
              ) : (
                <div className="p-2 rounded-lg bg-card/10 border border-border/20 text-gray-600 cursor-not-allowed">
                  <ChevronRight className="w-5 h-5" />
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Empty State */
        <div className="glass-panel p-12 rounded-2xl border-dashed flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-card/50 rounded-full flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            Tidak Ada Data Ditemukan
          </h3>
          <p className="text-gray-400 max-w-md">
            {currentFilter === "all"
              ? "Anda belum memiliki riwayat pekerjaan sama sekali. Ayo mulai narik dan kumpulkan Nismara Coins!"
              : `Tidak ada pekerjaan dengan status "${currentFilter}" saat ini.`}
          </p>
        </div>
      )}
    </main>
  );
}
