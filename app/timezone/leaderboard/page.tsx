import type { Metadata } from "next";
import LeaderboardClient from "./LeaderboardClient";

export const metadata: Metadata = {
  title: "Leaderboard Timezone Arcade",
  description: "Papan peringkat resmi para pengemudi di Timezone Nismara Transport. Lihat siapa Sultan peraih kemenangan terbesar dan penguasa arena!",
  openGraph: {
    title: "Leaderboard Timezone Arcade",
    description: "Papan peringkat resmi para pengemudi di Timezone Nismara Transport. Lihat siapa Sultan peraih kemenangan terbesar dan penguasa arena!",
    url: "https://transport.nismara.web.id/timezone/leaderboard",
    siteName: "Nismara Transport",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "https://images.nismara.my.id/227300_188.jpg",
        width: 1200,
        height: 630,
        alt: "Leaderboard Timezone Nismara Transport",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Leaderboard Timezone Arcade",
    description: "Papan peringkat resmi para pengemudi di Timezone Nismara Transport.",
    images: ["https://images.nismara.my.id/227300_188.jpg"],
  },
};

export default function TimezoneLeaderboardPage() {
  return (
    <div className="min-h-screen pt-20 pb-24 px-4 md:px-8">
      <LeaderboardClient />
    </div>
  );
}
