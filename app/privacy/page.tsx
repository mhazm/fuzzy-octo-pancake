import React from "react";
import {
  ShieldCheck,
  Database,
  Eye,
  Share2,
  Cookie,
  UserCircle,
  FileSearch,
  Lock,
  Image as ImageIcon,
} from "lucide-react";

export default function PrivacyPolicy() {
  const lastUpdated = "03 Agustus 2026";

  const sections = [
    {
      icon: <Database size={20} />,
      title: "1. Data yang Kami Kumpulkan",
      content:
        "Kami mengumpulkan informasi yang diperlukan untuk operasional VTC, termasuk ID Discord, Username Trucky, data statistik pengiriman (KM, muatan, waktu), dan log aktivitas di dalam dashboard Nismara. Kami tidak mengumpulkan informasi identitas dunia nyata yang sensitif.",
    },
    {
      icon: <Eye size={20} />,
      title: "2. Penggunaan Informasi",
      content:
        "Data yang dikumpulkan digunakan semata-mata untuk sistem Leaderboard, penghitungan Nismara Coin, audit Poin Penalti, dan manajemen armada. Statistik Anda mungkin ditampilkan secara publik di halaman Leaderboard agar dapat dilihat oleh anggota komunitas lain.",
    },
    {
      icon: <Share2 size={20} />,
      title: "3. Integrasi Pihak Ketiga",
      content:
        "Platform kami terintegrasi dengan Discord OAuth2 dan Trucky API. Kebijakan privasi pihak ketiga tersebut berlaku saat Anda menghubungkan akun. Kami tidak menjual atau membagikan data Anda kepada pengiklan atau pihak eksternal di luar kebutuhan teknis simulasi.",
    },
    {
      icon: <ShieldCheck size={20} />,
      title: "4. Keamanan Data",
      content:
        "Kami menggunakan enkripsi standar industri untuk melindungi data Anda. Akses ke database tingkat tinggi hanya dibatasi untuk manajemen inti Nismara guna mencegah kebocoran informasi atau penyalahgunaan wewenang.",
    },
    {
      icon: <Cookie size={20} />,
      title: "5. Kebijakan Cookie",
      content:
        "Kami menggunakan cookie fungsional untuk menjaga sesi login Anda tetap aktif dan menyimpan preferensi tema (Dark/Light mode). Cookie ini tidak digunakan untuk melacak aktivitas Anda di luar domain nismara.web.id.",
    },
    {
      icon: <UserCircle size={20} />,
      title: "6. Hak Pengguna",
      content:
        "Anda berhak meminta penghapusan seluruh data terkait akun Anda di sistem Nismara (Data Wipe). Untuk melakukan ini, Anda dapat menghubungi tim manajemen melalui kanal dukungan di Discord resmi kami.",
    },
    {
      icon: <ImageIcon size={20} />,
      title: "7. Penyimpanan Media & UGC (User-Generated Content)",
      content:
        "Foto atau gambar yang Anda unggah ke dalam fitur Profil maupun Galeri akan disimpan secara aman di infrastruktur Cloud Storage pihak ketiga. Nismara berhak menampilkan konten tersebut di dalam platform. Anda tetap memegang hak penuh atas gambar Anda dan dapat meminta penghapusan permanen atas media tersebut kapan saja.",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-12 pb-24 animate-in fade-in duration-700">
      {/* HEADER SECTION */}
      <div className="text-center space-y-4 pt-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-sky/10 border border-accent-sky/20 text-[10px] font-black uppercase tracking-[0.3em] text-accent-sky mb-2">
          <FileSearch size={14} /> Data Protection
        </div>
        <h1 className="text-6xl font-black text-(-primary-foreground) tracking-tighter uppercase leading-none">
          Privacy <span className="text-primary">Policy</span>
        </h1>
        <p className="text-foreground/40 font-bold uppercase text-xs tracking-widest">
          Terakhir Diperbarui: {lastUpdated}
        </p>
      </div>

      {/* PRIVACY COMMITMENT */}
      <div className="glass-panel p-8 rounded-[2.5rem] border border-border bg-card/30 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Lock size={120} />
        </div>
        <p className="text-lg font-medium text-foreground/60 leading-relaxed relative z-10 italic">
          "Komitmen kami adalah melindungi privasi digital Anda sembari
          memberikan pengalaman manajemen logistik virtual yang paling
          transparan dan aman."
        </p>
      </div>

      {/* DETAILED SECTIONS */}
      <div className="space-y-6">
        {sections.map((section, index) => (
          <div
            key={index}
            className="group p-8 rounded-[2rem] border border-border bg-card/20 hover:bg-card/50 hover:border-accent-sky/30 transition-all duration-300"
          >
            <div className="flex items-start gap-6">
              <div className="p-3 bg-accent-sky/10 rounded-xl text-accent-sky group-hover:scale-110 transition-transform">
                {section.icon}
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-(-primary-foreground) uppercase tracking-tight">
                  {section.title}
                </h3>
                <p className="text-sm font-medium text-foreground/50 leading-relaxed">
                  {section.content}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER NOTE */}
      <div className="p-10 text-center space-y-6 border-t border-border/50">
        <p className="text-sm text-foreground/30 font-medium max-w-2xl mx-auto">
          Dengan melanjutkan penggunaan layanan kami, Anda dianggap menyetujui
          kebijakan privasi ini. Kami menyarankan Anda untuk memeriksa halaman
          ini secara berkala untuk mengetahui pembaruan terbaru mengenai cara
          kami melindungi informasi Anda.
        </p>

        <div className="flex justify-center gap-4">
          <div className="flex items-center gap-2 px-5 py-2 bg-primary/10 border border-primary/20 rounded-full">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">
              Nismara Privacy Shield
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
