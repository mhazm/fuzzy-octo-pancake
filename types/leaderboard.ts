export type LeaderboardCategory = "distance" | "jobs" | "mass" | "nc";

export interface LeaderboardDriver {
  rank: number;
  discordId: string;
  name: string;
  image: string | null;
  truckyId: number | string | null;
  role?: string | null;
  truckyRank?: string | null;
  isNismaraPlus: boolean;
  score: number;
  isCurrentUser?: boolean;
  isBooster?: boolean;
  topManager?: {
    status?: boolean;
    month?: string | null;
    expiredAt?: Date | string | null;
  } | null;
}

export interface MyRankData {
  rank: number | null;
  score: number;
  totalActiveDrivers: number;
  diffToTop10: number | null;
  isTop10: boolean;
}

export interface LeaderboardResult {
  category: LeaderboardCategory;
  period: string; // 'all' or 'YYYY-MM'
  periodLabel: string;
  top10: LeaderboardDriver[];
  myRank: MyRankData | null;
  totalActiveDrivers: number;
  updatedAt: string;
}

export const INDONESIAN_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function formatLeaderboardMonthLabel(period: string): string {
  if (period === "all") return "Sepanjang Masa";
  const parts = period.split("-");
  if (parts.length !== 2) return period;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  return `${INDONESIAN_MONTHS[monthIdx] || parts[1]} ${year}`;
}
