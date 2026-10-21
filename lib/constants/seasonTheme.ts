/**
 * Konfigurasi Tema Musiman (Season Theme) Nismara Transport
 * 
 * Pengembang dapat mengaktifkan atau menonaktifkan tema ini dengan mudah:
 * - Ubah HALLOWEEN_THEME_ACTIVE menjadi false, ATAU
 * - Set environment variable NEXT_PUBLIC_HALLOWEEN_THEME="false".
 */
export const HALLOWEEN_THEME_ACTIVE: boolean =
  process.env.NEXT_PUBLIC_HALLOWEEN_THEME === "false" ? false : true;

export const HALLOWEEN_CONFIG = {
  /** Status aktif/nonaktif tema */
  active: HALLOWEEN_THEME_ACTIVE,
  /** Pengaturan jumpscare easter egg */
  jumpscare: {
    enabled: true,
    /** Jumlah klik berturut-turut pada ghost untuk memicu jumpscare */
    clickThreshold: 5,
    /** Durasi flash penampakan jumpscare (milidetik) */
    flashDurationMs: 2800,
    /** Gambar jumpscare */
    imageSrc: "/images/halloween/jumpscare.webp",
  },
  /** Pengaturan komponen dekorasi */
  decorations: {
    floatingGhost: true,
    pumpkins: true,
    cobwebs: true,
    spookyLoading: true,
  },
};
