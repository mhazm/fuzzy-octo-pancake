import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Matikan client-side router cache untuk dynamic routes agar data selalu fresh saat navigasi
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 180,
    },
  },

  // Pastikan Vercel CDN, Cloudflare, dan browser tidak men-cache rute dinamis & API
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
          },
          {
            key: "CDN-Cache-Control",
            value: "no-store",
          },
          {
            key: "Vercel-CDN-Cache-Control",
            value: "no-store",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
      {
        source: "/dashboard/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
          },
          {
            key: "CDN-Cache-Control",
            value: "no-store",
          },
          {
            key: "Vercel-CDN-Cache-Control",
            value: "no-store",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
      {
        source: "/fuel-market/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
          },
          {
            key: "CDN-Cache-Control",
            value: "no-store",
          },
          {
            key: "Vercel-CDN-Cache-Control",
            value: "no-store",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
    ];
  },

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
        hostname: "media.discordapp.net",
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
      {
        protocol: "https",
        hostname: "i.imgur.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "imgur.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.vgy.me",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "vgy.me",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.truckyapp.com",
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

export default nextConfig;

