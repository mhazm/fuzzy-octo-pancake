import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { notFound, redirect } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  TicketPercent,
  Coins,
  ShieldAlert,
  Users,
} from "lucide-react";
import PaginationControls from "./PaginationControls";
import UserBadges from "@/components/icons/UserBadges";
import ClaimButton from "./ClaimButton";

import { Metadata } from "next";

export const dynamic = "force-dynamic";

interface DetailPageProps {
  params: Promise<{ codeCoupon: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata(props: DetailPageProps): Promise<Metadata> {
  const resolvedParams = await props.params;
  const codeCoupon = resolvedParams.codeCoupon;
  
  try {
    const client = await clientPromise;
    const db = client.db();
    
    const query = { codeCoupon: { $regex: new RegExp(`^${codeCoupon}$`, "i") } };
    let coupon = await db.collection("coupons").findOne(query);

    if (coupon) {
      const meta: Metadata = {
        title: `Kupon ${coupon.nameCoupon}`,
      };

      if (coupon.imageUrl) {
        meta.openGraph = {
          images: [{ url: coupon.imageUrl }],
        };
        meta.twitter = {
          card: "summary_large_image",
          images: [coupon.imageUrl],
        };
      }

      return meta;
    }
  } catch (error) {
    console.error("Error fetching coupon metadata:", error);
  }

  return {
    title: "Detail Kupon",
  };
}

export default async function CouponDetailPage(props: DetailPageProps) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.isDriver) {
    // Hanya driver yang boleh akses, sesuai rule
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-card/30 backdrop-blur-md p-10 rounded-2xl border border-red-500/30 text-center max-w-md">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Akses Ditolak
          </h1>
          <p className="text-foreground/70 mb-6">
            Halaman detail kupon hanya dapat diakses oleh Pengemudi Nismara.
          </p>
          <Link
            href="/coupons"
            className="px-6 py-3 bg-primary text-white rounded-xl font-bold inline-block hover:bg-primary/80 transition"
          >
            Kembali ke Kupon
          </Link>
        </div>
      </main>
    );
  }

  const resolvedParams = await props.params;
  const resolvedSearchParams = await props.searchParams;

  const codeCoupon = resolvedParams.codeCoupon;
  const currentPage = Number(resolvedSearchParams.page) || 1;
  const itemsPerPage = 20;

  const client = await clientPromise;
  const db = client.db();

  const query = { codeCoupon: { $regex: new RegExp(`^${codeCoupon}$`, "i") } };

  // Cari di koleksi coupons (aktif maupun non-aktif)
  let coupon = await db.collection("coupons").findOne(query);

  if (!coupon) {
    notFound();
  }

  const isPending = coupon.isScheduled && new Date() < new Date(coupon.startDate);
  const isExpired = (!coupon.isActive && !isPending) || new Date() > new Date(coupon.endDate);
  const hasClaimed = session.user?.discordId
    ? (coupon.driverClaims || []).some(
        (c: any) => c.discordId === session.user.discordId,
      )
    : false;

  const isNC = !coupon.type || coupon.type === "NC";
  const driverClaims = coupon.driverClaims || [];

  // Sort claims by date descending (newest first)
  const sortedClaims = [...driverClaims].sort((a, b) => {
    return new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime();
  });

  const totalClaims = sortedClaims.length;
  const totalPages = Math.ceil(totalClaims / itemsPerPage) || 1;

  // Pagination slice
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClaims = sortedClaims.slice(startIndex, endIndex);

  // Ambil data user yang claim untuk halaman ini
  const discordIds = paginatedClaims.map((c) => c.discordId || c.driverId);

  const claimUsers = await db
    .collection("users")
    .find(
      { discordId: { $in: discordIds } },
      {
        projection: {
          discordId: 1,
          name: 1,
          image: 1,
          avatarUrl: 1,
          truckyId: 1,
          role: 1,
          discordRole: 1,
          isBooster: 1,
          nismaraplus: 1,
          truckyRank: 1,
        },
      },
    )
    .toArray();

  // Map user data to claims
  const claimsWithUserData = paginatedClaims.map((claim) => {
    const userDiscordId = claim.discordId || claim.driverId;
    const user = claimUsers.find((u) => u.discordId === userDiscordId);
    return {
      ...claim,
      user,
    };
  });

  // Calculate total distributed
  const totalDistributed = driverClaims.reduce(
    (sum: number, claim: any) => sum + (claim.amount || 0),
    0,
  );

  const formatDate = (dateString: string | Date) => {
    return (
      new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      }).format(new Date(dateString)) + " WIB"
    );
  };

  return (
    <main className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none" />

      <div className="max-w-5xl mx-auto">
        <Link
          href="/coupons"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-medium mb-8"
        >
          <ArrowLeft size={20} />
          Kembali ke Daftar Kupon
        </Link>

        {/* Header Kupon */}
        <div className="bg-card/50 backdrop-blur-md rounded-3xl border border-border overflow-hidden shadow-2xl mb-12 flex flex-col md:flex-row relative">
          <div className="md:w-1/3 bg-muted relative min-h-[200px] flex-shrink-0">
            {coupon.imageUrl ? (
              <img
                src={coupon.imageUrl}
                alt={coupon.nameCoupon}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div
                className={`absolute inset-0 bg-linear-to-br flex items-center justify-center ${isNC ? "from-yellow-500/20 to-orange-500/20" : "from-red-500/20 to-rose-500/20"}`}
              >
                <span className="text-white text-8xl font-bold opacity-30 drop-shadow-xl">
                  {isNC ? "🪙" : "🛡️"}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-linear-to-r from-transparent to-card hidden md:block" />
            <div className="absolute inset-0 bg-linear-to-t from-card to-transparent md:hidden" />
          </div>

          <div className="p-8 md:p-10 flex-1 relative z-10 flex flex-col justify-center">
            <div className="flex flex-wrap gap-2 mb-4">
              <span
                className={`px-4 py-1.5 text-sm font-bold rounded-full backdrop-blur-sm border ${
                  isPending
                    ? "bg-orange-500/10 text-orange-500 border-orange-500/30"
                    : coupon.isActive
                    ? "bg-green-500/10 text-green-500 border-green-500/30"
                    : "bg-muted text-foreground/50 border-border"
                }`}
              >
                {isPending ? "Kupon Belum Dimulai" : coupon.isActive ? "Kupon Aktif" : "Kupon Selesai"}
              </span>
              <span className="px-4 py-1.5 text-sm font-bold rounded-full bg-primary/10 text-primary border border-primary/30">
                {isNC ? "Hadiah Nismara Coin" : "Tiket Hapus Penalti"}
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-foreground mb-2">
              {coupon.nameCoupon}
            </h1>

            <div className="inline-block bg-background/50 rounded-xl p-4 mt-4 border border-dashed border-primary/40">
              <p className="text-sm text-muted-foreground mb-1 uppercase tracking-widest font-bold">
                Kode Kupon
              </p>
              <span className="text-2xl font-black text-primary tracking-[0.2em]">
                {coupon.codeCoupon}
              </span>
            </div>

            <ClaimButton
              codeCoupon={coupon.codeCoupon}
              isExpired={isExpired}
              hasClaimed={hasClaimed}
              isPending={isPending}
              startDate={coupon.startDate}
            />
          </div>
        </div>

        {/* Statistik */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-card/40 backdrop-blur-md rounded-2xl p-8 border border-border flex items-center gap-6 group hover:border-primary/50 transition-colors">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <Users size={32} />
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest mb-1">
                Total Pengklaim
              </p>
              <p className="text-4xl font-black text-foreground">
                {totalClaims.toLocaleString("id-ID")}
              </p>
            </div>
          </div>

          <div className="bg-card/40 backdrop-blur-md rounded-2xl p-8 border border-border flex items-center gap-6 group hover:border-primary/50 transition-colors">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform ${isNC ? "bg-yellow-500/10 text-yellow-500" : "bg-red-500/10 text-red-500"}`}
            >
              {isNC ? <Coins size={32} /> : <ShieldAlert size={32} />}
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest mb-1">
                Total Dibagikan
              </p>
              <p className="text-4xl font-black text-foreground">
                {isNC
                  ? `${totalDistributed.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NC`
                  : `${totalDistributed.toLocaleString("id-ID")} Tiket`}
              </p>
            </div>
          </div>
        </div>

        {/* Daftar Pengklaim */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl font-bold text-foreground">
            Daftar Pengklaim
          </h2>
          <div className="text-sm text-muted-foreground">
            Menampilkan {totalClaims === 0 ? 0 : startIndex + 1}-
            {Math.min(endIndex, totalClaims)} dari {totalClaims} pengklaim
          </div>
        </div>

        <div className="bg-card/40 backdrop-blur-md rounded-2xl border border-border overflow-hidden">
          {totalClaims === 0 ? (
            <div className="p-16 text-center">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-border">
                <TicketPercent className="w-8 h-8 text-muted-foreground opacity-50" />
              </div>
              <p className="text-lg text-foreground/50 font-medium">
                Belum ada yang mengeklaim kupon ini.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {claimsWithUserData.map((claim, idx) => {
                const avatar = claim.user?.image || claim.user?.avatarUrl;

                return (
                  <div
                    key={idx}
                    className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-muted overflow-hidden border border-border flex-shrink-0 relative">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={claim.user?.name || "User"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-lg">
                            {(claim.user?.name || "?")[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-foreground text-lg">
                            {claim.user?.name || "Driver Tidak Ditemukan"}
                          </h4>
                          {claim.user && (
                            <UserBadges
                              role={claim.user.discordRole || claim.user.role}
                              isBooster={claim.user.isBooster}
                              isNismaraPlus={claim.user.nismaraplus?.status}
                              nismaraPlusStartedAt={claim.user.nismaraplus?.startedAt}
                              truckyRank={claim.user.truckyRank}
                              className="w-4 h-4"
                            />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(claim.claimedAt)}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 flex-shrink-0 border ${
                        isNC
                          ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
                          : "bg-red-500/10 text-red-500 border-red-500/30"
                      }`}
                    >
                      {isNC ? <Coins size={16} /> : <ShieldAlert size={16} />}
                      {isNC
                        ? `${(claim.amount || 0).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NC`
                        : `${claim.amount || 0} Tiket`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8">
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              codeCoupon={codeCoupon}
            />
          </div>
        )}
      </div>
    </main>
  );
}
