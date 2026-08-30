import { output } from "framer-motion/client";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Jika Anda menggunakan image dari domain tunnel
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.nismara.my.id",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatars.steamstatic.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "dev.nismara.my.id",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "transport.nismara.my.id",
        pathname: "/**",
      },
    ],
  },
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/dashboard/leaderboard",
        destination: "/leaderboard",
        permanent: true,
      },
      {
        source: "/special-contract",
        destination: "/special-contracts",
        permanent: true,
      },
      {
        source: "/special-contract/:slug*",
        destination: "/special-contracts/:slug*",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
