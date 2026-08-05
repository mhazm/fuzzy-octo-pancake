import React from "react";
import {
  ShieldCheck,
  Scale,
  UserCheck,
  Coins,
  AlertTriangle,
  Lock,
  FileText,
  ShoppingCart,
  Camera,
  Crown,
  Dices,
  Handshake,
  CalendarCheck,
  UserX,
  Info,
  ChevronRight,
  ListChecks,
} from "lucide-react";

export const revalidate = 86400;

export const metadata = {
  title: "Terms of Service",
  description:
    "Ketentuan Layanan resmi platform Nismara Transport. Peraturan yang berlaku untuk seluruh anggota komunitas simulasi logistik virtual ETS2 dan ATS.",
};

type TosSection = {
  id: string;
  icon: React.ReactNode;
  title: string;
  content: string;
  subItems?: string[];
};

export default function TermsOfService() {
  const lastUpdated = "06 Agustus 2026";

  const sections: TosSection[] = [
    {
      id: "section-1",
      icon: <UserCheck size={20} />,
      title: "1. Penerimaan Ketentuan",
      content:
        "Dengan mendaftar dan menggunakan platform Nismara Transport, Anda menyatakan bahwa Anda telah membaca, memahami, dan setuju untuk terikat oleh Ketentuan Layanan ini. Jika Anda tidak setuju, Anda tidak diperkenankan menggunakan layanan kami.",
    },
    {
      id: "section-2",
      icon: <ShieldCheck size={20} />,
      title: "2. Kelayakan Driver",
      content:
        "Layanan ini ditujukan untuk komunitas simulasi (ETS2 dan ATS). Setiap driver wajib memiliki akun Discord dan Trucky yang valid. Kami berhak menolak pendaftaran tanpa memberikan alasan spesifik demi menjaga kualitas komunitas.",
    },
    {
      id: "section-3",
      icon: <Scale size={20} />,
      title: "3. Perilaku & Kode Etik",
      content:
        "Semua driver wajib mematuhi peraturan lalu lintas virtual dan etika berkomunitas. Tindakan rasisme, pelecehan, atau penggunaan cheat/exploit akan mengakibatkan pemutusan akses akun secara permanen tanpa peringatan.",
    },
    {
      id: "section-4",
      icon: <Coins size={20} />,
      title: "4. Ekonomi Virtual (Nismara Coin)",
      content:
        "Nismara Coin (N¢) adalah mata uang virtual internal dan tidak memiliki nilai mata uang nyata. N¢ tidak dapat diuangkan atau diperdagangkan di luar ekosistem Nismara. Kami berhak menyesuaikan saldo jika ditemukan kesalahan sistem atau manipulasi data.",
    },
    {
      id: "section-5",
      icon: <AlertTriangle size={20} />,
      title: "5. Sistem Poin Penalti",
      content:
        "Nismara menggunakan sistem Poin Penalti untuk mengaudit kualitas mengemudi. Akumulasi poin tertentu (seperti SP1, SP2, SP3) dapat mengakibatkan penangguhan akun sementara hingga pemecatan driver dari VTC.",
    },
    {
      id: "section-6",
      icon: <Lock size={20} />,
      title: "6. Hak Intelektual",
      content:
        "Semua logo, aset grafis, dan infrastruktur perangkat lunak Nismara adalah hak milik Nismara Group. Penggunaan aset kami untuk kepentingan komersial pihak ketiga tanpa izin tertulis adalah pelanggaran hukum.",
    },
    {
      id: "section-7",
      icon: <ShoppingCart size={20} />,
      title: "7. Marketplace & Transaksi",
      content:
        "Penggunaan fitur Marketplace Nismara tunduk pada ketentuan berikut:",
      subItems: [
        "Pengguna dilarang keras melakukan eksploitasi, penipuan (scam), atau manipulasi harga di dalam fitur Marketplace maupun Lotto Nismara.",
        "Pengguna dilarang memperjualbelikan modifikasi (mods) milik pihak lain di luar ekosistem Nismara, mods yang bukan hak milik penuh pengguna, atau mengkomersialkan mods yang aslinya tersedia secara gratis.",
        "Manajemen Nismara sepenuhnya terlepas dari segala tuntutan hukum, kerugian, maupun klaim hak cipta yang timbul akibat barang/mod yang dijual oleh pengguna. Seluruh tanggung jawab dan akibat hukum secara mutlak dilimpahkan kepada pengguna (penjual) yang bersangkutan.",
        "Wewenang Manajemen Nismara sebatas melakukan pencabutan (take down) atas produk yang melanggar ketentuan yang berlaku.",
        "Semua transaksi pembelian menggunakan Nismara Coin (N¢) bersifat final dan tidak dapat dikembalikan (non-refundable), kecuali terjadi kesalahan sistem yang tervalidasi oleh pengurus.",
      ],
    },
    {
      id: "section-8",
      icon: <Camera size={20} />,
      title: "8. Kebijakan Galeri & Konten",
      content:
        "Pengguna yang mengunggah foto atau tangkapan layar ke dalam fitur Galeri wajib mematuhi ketentuan berikut:",
      subItems: [
        "Konten yang diunggah dilarang keras mengandung unsur SARA (Suku, Agama, Ras, dan Antargolongan) maupun unsur pornografi.",
        "Manajemen berhak menghapus konten yang menyalahi aturan dan memblokir akses pengguna dari fitur Galeri secara permanen.",
        "Manajemen Nismara lepas dari segala bentuk tanggung jawab apabila konten yang diunggah menyalahi hak cipta atau aturan pihak ketiga.",
        "Segala bentuk tuntutan atau konsekuensi dari unggahan tersebut sepenuhnya menjadi tanggung jawab pengguna (driver) yang bersangkutan.",
      ],
    },
    {
      id: "section-9",
      icon: <Crown size={20} />,
      title: "9. Layanan Premium (Nismara Plus)",
      content:
        "Nismara Plus merupakan layanan premium berbayar yang memberikan keuntungan eksklusif. Ketentuan berikut berlaku:",
      subItems: [
        "Nismara Plus merupakan bentuk dukungan (donasi) berbayar yang memberikan keuntungan eksklusif tambahan bagi pengguna di dalam ekosistem Nismara.",
        "Semua bentuk pembayaran untuk status Nismara Plus bersifat final dan tidak dapat dikembalikan atau diuangkan (non-refundable) dengan alasan apa pun.",
        "Apabila pengguna Nismara Plus melakukan pelanggaran berat (seperti penggunaan cheat, eksploitasi, rasisme, dll) yang mengakibatkan pemblokiran akun, maka status Nismara Plus dan sisa masa aktifnya akan otomatis hangus tanpa kompensasi.",
        "Masa aktif Nismara Plus berjalan sesuai durasi yang dipilih saat pembelian dan tidak diperpanjang secara otomatis.",
      ],
    },
    {
      id: "section-10",
      icon: <Dices size={20} />,
      title: "10. Fitur Permainan & Hiburan Virtual",
      content:
        "Nismara Transport menyediakan beberapa fitur permainan hiburan berbasis Nismara Coin (N¢), termasuk namun tidak terbatas pada Nismara Lotto, Scratch & Win, dan Truck Drag Race. Ketentuan berikut berlaku untuk seluruh fitur permainan:",
      subItems: [
        "Semua fitur permainan menggunakan mata uang virtual Nismara Coin (N¢) dan bukan merupakan bentuk perjudian uang nyata dalam bentuk apa pun.",
        "Hasil permainan ditentukan sepenuhnya oleh algoritma Random Number Generator (RNG) di sisi server yang tidak dapat dimanipulasi oleh pengguna.",
        "Seluruh pembelian tiket, taruhan, dan transaksi dalam fitur permainan bersifat final dan tidak dapat dikembalikan (non-refundable).",
        "Setiap fitur permainan memiliki batas pembelian atau taruhan harian maupun mingguan yang wajib dipatuhi oleh seluruh pengguna.",
        "Penggunaan bot, script otomatis, exploit bug, atau metode curang lainnya untuk memperoleh keuntungan tidak wajar akan mengakibatkan penangguhan akun dan penyitaan seluruh saldo N¢.",
        "Manajemen Nismara berhak mengubah aturan, odds, hadiah, batas taruhan, atau menonaktifkan fitur permainan sewaktu-waktu tanpa pemberitahuan sebelumnya.",
      ],
    },
    {
      id: "section-11",
      icon: <Handshake size={20} />,
      title: "11. Special Contracts & Convoy",
      content:
        "Nismara Transport menyelenggarakan misi khusus kolektif (Special Contracts) dan sesi berkendara bersama (Convoy) sebagai bagian dari ekosistem komunitas. Ketentuan berikut berlaku:",
      subItems: [
        "Partisipasi dalam Special Contracts bersifat sukarela. Pembagian reward Nismara Coin didasarkan pada kontribusi pengiriman yang tercatat secara otomatis oleh sistem.",
        "Selama sesi Convoy berlangsung, seluruh peserta wajib mematuhi aturan lalu lintas virtual, instruksi Convoy Leader, dan etika berkomunitas yang berlaku.",
        "Pelanggaran selama event resmi seperti tabrak-lari, mengganggu peserta lain, atau penggunaan cheat dapat dikenakan Poin Penalti tambahan di luar ketentuan normal.",
        "Manajemen Nismara berhak membatalkan, mengubah jadwal, atau memodifikasi target Special Contract dan Convoy sewaktu-waktu berdasarkan kondisi operasional.",
      ],
    },
    {
      id: "section-12",
      icon: <CalendarCheck size={20} />,
      title: "12. Event, Kupon & Survey",
      content:
        "Nismara Transport secara berkala menyelenggarakan event bonus, mendistribusikan kupon, dan membuka survey untuk anggota komunitas. Ketentuan berikut berlaku:",
      subItems: [
        "Event bonus NC (Currency Boost) termasuk multiplier dan periode aktifnya diatur sepenuhnya oleh manajemen dan dapat diubah atau dihentikan sewaktu-waktu.",
        "Kupon Nismara Coin bersifat terbatas, memiliki masa berlaku tertentu, dan hanya dapat diklaim satu kali per pengguna kecuali dinyatakan lain.",
        "Survey dan polling hanya boleh diisi satu kali per pengguna per periode. Jawaban wajib diberikan secara jujur dan bertanggung jawab.",
        "Manipulasi data survey, pengisian berulang menggunakan akun ganda, atau tindakan curang lainnya akan mengakibatkan pembatalan reward dan potensi sanksi tambahan.",
        "Reward NC dari survey bersifat satu kali (one-time) dan tidak dapat diklaim ulang setelah diberikan.",
      ],
    },
    {
      id: "section-13",
      icon: <UserX size={20} />,
      title: "13. Penghentian & Penangguhan Akun",
      content:
        "Manajemen Nismara berhak menangguhkan atau menghentikan akses pengguna terhadap platform berdasarkan ketentuan berikut:",
      subItems: [
        "Pelanggaran berulang terhadap Kode Etik atau ketentuan dalam dokumen ini dapat mengakibatkan penangguhan sementara hingga pemblokiran permanen.",
        "Penggunaan cheat, exploit, atau manipulasi data yang merugikan sistem atau pengguna lain akan ditindak tegas tanpa peringatan.",
        "Aktivitas penipuan (scam), pencurian identitas, atau penyalahgunaan akun pihak lain merupakan pelanggaran berat yang mengakibatkan pemblokiran permanen.",
        "Pengguna yang dikenakan pemblokiran dapat mengajukan banding melalui sistem Appeal yang tersedia di Discord resmi Nismara. Keputusan akhir atas banding sepenuhnya berada di tangan manajemen.",
        "Pemblokiran akun akan berdampak pada hangusnya seluruh saldo Nismara Coin, status Nismara Plus (jika ada), dan seluruh aset digital terkait tanpa kompensasi dalam bentuk apa pun.",
      ],
    },
    {
      id: "section-14",
      icon: <Info size={20} />,
      title: "14. Batasan Tanggung Jawab & Disclaimer",
      content:
        'Platform Nismara Transport disediakan dalam kondisi "sebagaimana adanya" (as-is) tanpa jaminan tersirat maupun tersurat. Ketentuan berikut berlaku:',
      subItems: [
        "Nismara tidak bertanggung jawab atas gangguan layanan (downtime), kehilangan data, atau kerugian lainnya yang diakibatkan oleh kegagalan teknis, pemeliharaan sistem, atau keadaan kahar (force majeure).",
        "Nismara tidak menjamin keakuratan data statistik yang bersumber dari API pihak ketiga seperti Trucky API, TruckersMP, atau layanan eksternal lainnya.",
        "Informasi harga dan permintaan kargo dalam Katalog Kargo (Cargo Market) bersifat dinamis dan diperbarui secara berkala setiap 3 jam. Nismara tidak bertanggung jawab atas ketidaksesuaian data yang terjadi di antara periode pembaruan.",
        "Nismara berhak mengubah, menambah, atau menghapus fitur platform kapan saja tanpa pemberitahuan sebelumnya demi peningkatan kualitas layanan.",
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-12 pb-24 animate-in fade-in duration-700">
      {/* HEADER SECTION */}
      <div className="text-center space-y-4 pt-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">
          <FileText size={14} /> Legal Documentation
        </div>
        <h1 className="text-6xl font-black text-(-primary-foreground) tracking-tighter uppercase leading-none">
          Terms of <span className="text-accent-sky">Service</span>
        </h1>
        <p className="text-foreground/40 font-bold uppercase text-xs tracking-widest">
          Terakhir Diperbarui: {lastUpdated}
        </p>
      </div>

      {/* CONTENT INTRODUCTION */}
      <div className="glass-panel p-8 rounded-[2.5rem] border border-border bg-card/30 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Scale size={120} />
        </div>
        <p className="text-lg font-medium text-foreground/60 leading-relaxed relative z-10 italic">
          &quot;Peraturan ini dibuat untuk memastikan pengalaman simulasi yang
          adil, kompetitif, dan profesional bagi seluruh anggota Nismara
          Transport Group.&quot;
        </p>
      </div>

      {/* TABLE OF CONTENTS */}
      <div className="glass-panel p-8 rounded-[2.5rem] border border-border bg-card/20 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
            <ListChecks size={20} />
          </div>
          <h2 className="text-lg font-black text-foreground uppercase tracking-wider">
            Daftar Isi
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-foreground/50 hover:text-primary hover:bg-primary/5 transition-all duration-200 group"
            >
              <ChevronRight
                size={14}
                className="text-primary/30 group-hover:text-primary transition-colors shrink-0"
              />
              <span className="line-clamp-1">{section.title}</span>
            </a>
          ))}
        </div>
      </div>

      {/* DETAILED SECTIONS */}
      <div className="space-y-6">
        {sections.map((section, index) => (
          <div
            key={index}
            id={section.id}
            className="group p-8 rounded-[2rem] border border-border bg-card/20 hover:bg-card/50 hover:border-primary/30 transition-all duration-300 scroll-mt-24"
          >
            <div className="flex items-start gap-6">
              <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform shrink-0">
                {section.icon}
              </div>
              <div className="space-y-3 flex-1 min-w-0">
                <h3 className="text-xl font-black text-(-primary-foreground) uppercase tracking-tight">
                  {section.title}
                </h3>
                <p className="text-sm font-medium text-foreground/50 leading-relaxed">
                  {section.content}
                </p>
                {section.subItems && section.subItems.length > 0 && (
                  <ul className="space-y-3 mt-4 pt-4 border-t border-border/50">
                    {section.subItems.map((item, i) => (
                      <li
                        key={i}
                        className="flex gap-3 text-sm font-medium text-foreground/50 leading-relaxed"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-[7px] shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER NOTE */}
      <div className="p-10 text-center space-y-6 border-t border-border/50">
        <p className="text-sm text-foreground/30 font-medium max-w-2xl mx-auto">
          Nismara Transport berhak untuk mengubah ketentuan ini sewaktu-waktu.
          Perubahan akan diinformasikan melalui kanal Discord resmi kami.
          Penggunaan layanan secara berkelanjutan setelah perubahan dianggap
          sebagai persetujuan terhadap ketentuan baru.
        </p>
      </div>
    </div>
  );
}
