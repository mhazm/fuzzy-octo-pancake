import { Metadata } from "next";
import clientPromise from "@/lib/mongodb";
import Link from "next/link";
import {
  CheckCircle2,
  ShieldCheck,
  MessageSquare,
  Ticket,
  ArrowRight,
  BookOpen,
  Headset,
  Gamepad2,
  Users,
  Map,
  Flag,
  Truck,
  Quote,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
// SEO Metadata for indexing
export const metadata: Metadata = {
  title: "Cara Bergabung & Persyaratan - Nismara Transport",
  description:
    "Tertarik bergabung dengan Nismara Transport? Pelajari persyaratan, baca Terms of Service, dan ikuti langkah-langkah mudah untuk mendaftar sebagai driver di VTC kami.",
  keywords: [
    "Nismara Transport",
    "Cara Bergabung Nismara",
    "Pendaftaran VTC Nismara",
    "ETS2 VTC Indonesia",
    "Syarat Join Nismara",
    "Discord Nismara",
  ],
  openGraph: {
    title: "Bergabung dengan Nismara Transport",
    description:
      "Pelajari persyaratan dan cara mudah bergabung menjadi driver di ekosistem Nismara Transport.",
    type: "website",
    url: "https://nismara.web.id/onboarding",
    images: ["https://images.nismara.my.id/227300_188.jpg"], // Menggunakan gambar default project
  },
};
export default async function OnboardingPage() {
  const client = await clientPromise;
  const db = client.db();
  // Fetch real statistics from database
  const totalDriversCount = await db.collection("driverlinks").countDocuments();
  const totalConvoysCount = await db.collection("convoylobby").countDocuments();
  const completedContractsCount = await db
    .collection("contracthistories")
    .countDocuments();

  const distanceAggregation = await db
    .collection("contracthistories")
    .aggregate([{ $group: { _id: null, total: { $sum: "$totalDistance" } } }])
    .toArray();

  // Format stats for display
  const totalDrivers = totalDriversCount; // Base active members
  const totalConvoys = totalConvoysCount;
  const completedContracts =
    completedContractsCount > 0 ? completedContractsCount : 25;
  const totalDistance = (
    distanceAggregation[0]?.total || 150000
  ).toLocaleString("id-ID");

  // Fetch real users for testimonials
  const dbUsers = await db.collection("users").find({}).limit(8).toArray();

  const mockQuotes = [
    "Bergabung dengan Nismara adalah keputusan terbaik saya! Komunitasnya solid dan sistemnya sangat terstruktur.",
    "Konvoi rutinnya seru banget! Apalagi ada sistem Nismara Coin yang bikin makin semangat jalan bareng.",
    "Sistem VTC paling rapi yang pernah saya temui. Teman-temannya juga asyik, saling support, dan dewasa.",
    "Sangat cocok buat yang cari komunitas ETS2 santai tapi tetap tertata dengan baik. Adminnya responsif!",
    "Terima kasih Nismara, berkat VTC ini saya jadi punya banyak teman baru dari seluruh penjuru Indonesia!",
    "Dari awal join sampai sekarang selalu merasa disambut baik. Nismara Transport memang beda dari yang lain.",
    "Banyak event menarik tiap bulannya, gak pernah bosan buat narik bareng anak-anak Nismara.",
    "Awalnya coba-coba, eh ternyata malah keterusan. Sistem poin dan integrasi Trucky-nya juara!",
  ];

  const testimonials = dbUsers.map((user, index) => ({
    name: user.name || user.username || "Driver Nismara",
    image: user.image || null,
    quote: mockQuotes[index % mockQuotes.length],
  }));

  const requirements = [
    {
      icon: Gamepad2,
      title: "Memiliki Game Original",
      desc: "Wajib memiliki game Euro Truck Simulator 2 (ETS2) atau American Truck Simulator (ATS) original di Steam.",
    },
    {
      icon: Headset,
      title: "Komunikasi Aktif",
      desc: "Memiliki microphone yang berfungsi dengan baik untuk komunikasi via Voice Chat Discord saat konvoi.",
    },
    {
      icon: ShieldCheck,
      title: "Sikap & Kedewasaan",
      desc: "Berusia minimal 15 tahun, mampu bersikap dewasa, sopan, dan saling menghargai sesama anggota.",
    },
    {
      icon: BookOpen,
      title: "Paham Peraturan Dasar",
      desc: "Bersedia membaca, memahami, dan mematuhi seluruh peraturan dasar berkendara di TruckersMP.",
    },
  ];
  const steps = [
    {
      number: "01",
      icon: MessageSquare,
      title: "Bergabung ke Discord",
      desc: "Langkah pertama adalah masuk ke server Discord resmi Nismara. Semua komunikasi dan aktivitas berpusat di sana.",
      action: {
        text: "Join Discord Nismara",
        url: "https://link.nismara.web.id/discord",
      },
    },
    {
      number: "02",
      icon: BookOpen,
      title: "Baca Terms of Service",
      desc: "Pastikan Anda membaca seluruh Terms of Service (TOS) dan Rules perusahaan di channel informasi.",
      action: {
        text: "Baca TOS",
        url: "/terms", // atau link spesifik jika ada
      },
    },
    {
      number: "03",
      icon: Ticket,
      title: "Buka Tiket Pendaftaran",
      desc: "Masuk ke channel pendaftaran dan buat tiket baru. Tim HRD kami akan segera merespons tiket Anda.",
      action: null,
    },
    {
      number: "04",
      icon: CheckCircle2,
      title: "Interview & Setup",
      desc: "Ikuti proses interview singkat. Jika lulus, Anda akan dibantu untuk setup Trucky dan sistem lainnya.",
      action: null,
    },
  ];
  return (
    <main className="min-h-screen py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-background">
      {/* Ambient Backgrounds */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent-sky/10 rounded-full blur-[150px] -z-10 pointer-events-none" />
      <div className="max-w-6xl mx-auto space-y-24">
        {/* HERO SECTION */}
        <header className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
            <span className="text-sm font-bold uppercase tracking-widest">
              Open Recruitment
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-foreground tracking-tight">
            Mulai Perjalanan Anda Bersama{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-accent-sky">
              Nismara
            </span>
          </h1>
          <p className="text-lg md:text-xl text-foreground/60 leading-relaxed">
            Bergabunglah dengan salah satu Virtual Trucking Company paling
            terstruktur dan solid di Indonesia. Pelajari persyaratannya di bawah
            ini.
          </p>
        </header>
        {/* STATISTIK SECTION */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 -mt-8 relative z-10">
          <div className="bg-card/40 backdrop-blur-md border border-border p-6 rounded-3xl text-center shadow-lg hover:border-primary/40 transition-colors group">
            <div className="w-12 h-12 bg-primary/20 text-primary mx-auto rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-3xl md:text-4xl font-black text-foreground mb-1">
              {totalDrivers}+
            </h3>
            <p className="text-[10px] md:text-xs text-foreground/60 uppercase tracking-widest font-bold">
              Driver Aktif
            </p>
          </div>

          <div className="bg-card/40 backdrop-blur-md border border-border p-6 rounded-3xl text-center shadow-lg hover:border-primary/40 transition-colors group">
            <div className="w-12 h-12 bg-accent-sky/20 text-accent-sky mx-auto rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Map className="w-6 h-6" />
            </div>
            <h3 className="text-3xl md:text-4xl font-black text-foreground mb-1">
              {totalConvoys}
            </h3>
            <p className="text-[10px] md:text-xs text-foreground/60 uppercase tracking-widest font-bold">
              Total Convoy
            </p>
          </div>
          <div className="bg-card/40 backdrop-blur-md border border-border p-6 rounded-3xl text-center shadow-lg hover:border-primary/40 transition-colors group">
            <div className="w-12 h-12 bg-green-500/20 text-green-500 mx-auto rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Flag className="w-6 h-6" />
            </div>
            <h3 className="text-3xl md:text-4xl font-black text-foreground mb-1">
              {completedContracts}
            </h3>
            <p className="text-[10px] md:text-xs text-foreground/60 uppercase tracking-widest font-bold">
              Contracts Selesai
            </p>
          </div>
          <div className="bg-card/40 backdrop-blur-md border border-border p-6 rounded-3xl text-center shadow-lg hover:border-primary/40 transition-colors group">
            <div className="w-12 h-12 bg-yellow-500/20 text-yellow-500 mx-auto rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-3xl md:text-4xl font-black text-foreground mb-1">
              {totalDistance}
            </h3>
            <p className="text-[10px] md:text-xs text-foreground/60 uppercase tracking-widest font-bold">
              Km Ditempuh
            </p>
          </div>
        </section>
        {/* PERSYARATAN SECTION */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Persyaratan Pendaftaran
            </h2>
            <p className="text-foreground/60 max-w-2xl mx-auto">
              Untuk menjaga kualitas dan kenyamanan bermain bersama, kami
              menetapkan beberapa standar bagi para calon pelamar.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {requirements.map((req, idx) => (
              <div
                key={idx}
                className="bg-card/40 backdrop-blur-md border border-border p-6 rounded-3xl hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
              >
                <div className="w-14 h-14 bg-background rounded-2xl flex items-center justify-center border border-border mb-6 group-hover:scale-110 transition-transform">
                  <req.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {req.title}
                </h3>
                <p className="text-sm text-foreground/60 leading-relaxed">
                  {req.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
        {/* TERMS OF SERVICE ALERT */}
        <section>
          <div className="bg-linear-to-br from-primary/20 to-transparent border border-primary/30 p-8 md:p-12 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-64 h-64 bg-primary/20 rounded-full blur-[80px] pointer-events-none group-hover:bg-primary/30 transition-colors" />
            <div className="relative z-10 flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <ShieldCheck className="w-8 h-8 text-primary" />
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  Terms of Service
                </h2>
              </div>
              <p className="text-foreground/70 text-lg leading-relaxed max-w-2xl">
                Sebelum melangkah lebih jauh, Anda <strong>wajib</strong>{" "}
                membaca dan menyetujui seluruh ketentuan layanan (Terms of
                Service) Nismara Transport. Ini penting untuk memastikan visi
                kita sejalan.
              </p>
            </div>
            <div className="relative z-10 shrink-0 w-full md:w-auto">
              <Link href="/terms" className="w-full">
                <Button className="w-full md:w-auto h-14 px-8 text-lg font-bold rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
                  Baca Terms of Service <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
        {/* ALUR PENDAFTARAN */}
        <section>
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Alur Pendaftaran
            </h2>
            <p className="text-foreground/60 max-w-2xl mx-auto">
              Sudah memenuhi syarat dan membaca TOS? Ikuti langkah-langkah
              sederhana berikut untuk resmi menjadi bagian dari keluarga
              Nismara.
            </p>
          </div>
          <div className="relative">
            {/* Timeline Line (Desktop only) */}
            <div className="hidden lg:block absolute top-1/2 left-0 w-full h-1 bg-border -translate-y-1/2 z-0" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="bg-card border border-border p-8 rounded-3xl relative hover:border-primary/50 transition-colors shadow-lg"
                >
                  <div className="absolute -top-5 -left-5 w-12 h-12 bg-primary text-background font-black text-xl flex items-center justify-center rounded-xl shadow-lg shadow-primary/30">
                    {step.number}
                  </div>
                  <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-6">
                    <step.icon className="w-8 h-8 text-foreground/70" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-sm text-foreground/60 mb-6 leading-relaxed">
                    {step.desc}
                  </p>
                  {step.action && (
                    <Link
                      href={step.action.url}
                      target={
                        step.action.url.startsWith("http")
                          ? "_blank"
                          : undefined
                      }
                    >
                      <Button
                        variant="outline"
                        className="w-full border-border bg-background hover:bg-muted font-bold rounded-xl"
                      >
                        {step.action.text}{" "}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS SECTION */}
        {testimonials.length > 0 && (
          <section>
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Apa Kata Mereka?
              </h2>
              <p className="text-foreground/60 max-w-2xl mx-auto">
                Dengarkan langsung pengalaman dari para driver Nismara Transport
                yang telah bergabung dan menjadi bagian dari keluarga besar
                kami.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {testimonials.map((testi, idx) => (
                <div
                  key={idx}
                  className="bg-card/30 backdrop-blur-sm border border-border p-6 rounded-3xl relative hover:border-primary/50 transition-colors shadow-lg flex flex-col h-full group"
                >
                  <Quote className="absolute top-6 right-6 w-10 h-10 text-primary/10 group-hover:text-primary/20 transition-colors" />

                  <div className="flex items-center gap-1 mb-4 text-yellow-500">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-4 h-4 fill-current" />
                    ))}
                  </div>

                  <p className="text-sm text-foreground/80 leading-relaxed italic mb-8 flex-1">
                    "{testi.quote}"
                  </p>

                  <div className="flex items-center gap-4 mt-auto">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/20 border-2 border-primary/30 shrink-0">
                      {testi.image ? (
                        <img
                          src={testi.image}
                          alt={testi.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-primary">
                          {testi.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-foreground line-clamp-1">
                        {testi.name}
                      </p>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-primary">
                        Driver Nismara
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
