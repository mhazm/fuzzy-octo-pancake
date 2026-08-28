// Fungsi ini hanya akan berjalan di server (aman dari kebocoran key)
const TMP_BASE_URL = "https://api.truckersmp.com";
// Catatan: Base URL ini bisa disesuaikan dengan endpoint e.truckyapp.com jika kamu menggunakan spesifik VTC Hub API.

export async function getDriverStats(tmpId: number) {
  try {
    // Contoh pemanggilan API Trucky untuk mendapatkan profil player.
    // Ganti URL endpoint sesuai dengan dokumentasi API Trucky yang kamu butuhkan.
    const res = await fetch(`${TMP_BASE_URL}/v2/player/${tmpId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Nismara Transport/1.2.1",
        Referer: "https://transport.nismara.web.id",
        Origin: "https://transport.nismara.web.id",
      },
      next: { revalidate: 120 },
    });

    if (!res.ok) {
      console.error(`Gagal mengambil data TMP. Status: ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("TMP API Error:", error);
    return null;
  }
}
