import type { Metadata } from "next";
import { Noto_Sans, Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NismaraPlusAdPopup from "@/components/NismaraPlusAdPopup";
import { Providers } from "@/components/Providers";
import { GoogleAnalytics } from "@next/third-parties/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const roboto = Noto_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: "%s - Nismara Transport",
    default: "Nismara Transport - Virtual Trucking & Logistics Company Indonesia",
  },
  description:
    "Nismara Transport adalah perusahaan virtual trucking dan logistik Indonesia yang menghadirkan sistem pengiriman modern, komunitas driver profesional, event convoy, dan manajemen transportasi terintegrasi",
  openGraph: {
    title: {
      template: "%s - Nismara Transport",
      default: "Nismara Transport - Virtual Trucking & Logistics Company Indonesia",
    },
    description:
      "Nismara Transport adalah perusahaan virtual trucking dan logistik Indonesia yang menghadirkan sistem pengiriman modern, komunitas driver profesional, event convoy, dan manajemen transportasi terintegrasi",
    images: ["https://images.nismara.my.id/227300_188.jpg"],
  },
  keywords: [
    "Nismara Transport",
    "Nismara Group",
    "tmp vtc indonesia",
    "vtc tmp indonesia",
    "Virtual Trucking Company",
    "VTC Indonesia",
    "Truck Simulator Indonesia",
    "ETS2 Indonesia",
    "VTC ETS2 Indonesia",
    "American Truck Simulator",
    "Komunitas Trucking",
    "Logistics Company",
    "Virtual Logistics",
    "Convoy Indonesia",
    "Driver Community",
    "Transport Management",
    "Pengiriman Barang",
    "Virtual Driver",
    "euro truck simulator 2",
    "american truk simulator",
    "komunitas ets2 indonesia",
  ],
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
    },
  },
  verification: {
    google: "Y2oIpUQn-6CiJNU-hIkuga1RRPYbBDgDMPS4LRUXE40",
    other: {
      "msvalidate.01": "8DF8DC629EA75F95928BCD35B959096E",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={cn("dark", "font-sans", geist.variable, "overflow-x-clip")}
    >
      <body
        className={`${roboto.className} flex flex-col min-h-screen overflow-x-clip`}
      >
        {/* Navbar akan selalu ada di paling atas */}
        <Providers>
          <Navbar />

          <div className="flex-1 w-full max-w-full overflow-x-clip">
            {children}
          </div>
          <Footer />
          <NismaraPlusAdPopup />
        </Providers>
      </body>
      {process.env.NEXT_PUBLIC_GA_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      )}
    </html>
  );
}
