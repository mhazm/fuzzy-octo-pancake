// Fungsi ini hanya akan berjalan di server (aman dari kebocoran key)
const TRUCKY_BASE_URL = "https://e.truckyapp.com";
// Catatan: Base URL ini bisa disesuaikan dengan endpoint e.truckyapp.com jika kamu menggunakan spesifik VTC Hub API.

export async function getDriverStats(truckyId: number) {
  try {
    // Contoh pemanggilan API Trucky untuk mendapatkan profil player.
    // Ganti URL endpoint sesuai dengan dokumentasi API Trucky yang kamu butuhkan.
    const res = await fetch(`${TRUCKY_BASE_URL}/api/v2/user/${truckyId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": `${process.env.TRUCKY_API_KEY}`,
        "User-Agent": "NismaraLogistics/1.0 (Next.js Server)",
        Referer: "https://nismara.web.id",
        Origin: "https://nismara.web.id",
      },
      // Next.js Cache: Simpan data selama 60 detik agar API Trucky tidak kelebihan beban (Rate Limit)
      next: { revalidate: 120 },
    });

    if (!res.ok) {
      console.error(`Gagal mengambil data Trucky. Status: ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Trucky API Error:", error);
    return null;
  }
}

export async function getCompanyMemberStats(
  companyId: number,
  truckyId: number,
) {
  try {
    let currentPage = 1;
    let lastPage = 1;

    // Lakukan pencarian berulang (loop) ke setiap halaman
    do {
      const res = await fetch(
        `https://e.truckyapp.com/api/v1/company/${companyId}/members?page=${currentPage}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-access-token": process.env.TRUCKY_API_KEY as string,
            "User-Agent": "NismaraLogistics/1.0 (Next.js Server)",
            Referer: "https://nismara.web.id",
            Origin: "https://nismara.web.id",
          },
          // Cache diperpanjang jadi 5 menit (300 detik) karena looping memakan waktu
          // Ini mencegah server Nismara terkena limit API Trucky
          next: { revalidate: 300 },
        },
      );

      if (!res.ok) {
        console.error(
          `Gagal mengambil halaman ${currentPage}. Status: ${res.status}`,
        );
        return null;
      }

      const responseData = await res.json();
      lastPage = responseData.last_page;

      // Cari user di dalam array 'data' pada halaman ini
      const foundUser = responseData.data.find(
        (member: any) => member.id === truckyId,
      );

      // Jika user ditemukan di halaman ini, langsung kembalikan datanya dan hentikan loop
      if (foundUser) {
        return foundUser;
      }

      // Jika tidak ketemu, lanjut ke halaman berikutnya
      currentPage++;
    } while (currentPage <= lastPage);

    // Jika sampai halaman terakhir tetap tidak ditemukan
    return null;
  } catch (error) {
    console.error("Trucky API Error:", error);
    return null;
  }
}

export async function getCompanyMembersMap(companyId: number) {
  try {
    let currentPage = 1;
    let lastPage = 1;
    const membersMap: Record<number, any> = {};

    do {
      const res = await fetch(
        `https://e.truckyapp.com/api/v1/company/${companyId}/members?page=${currentPage}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-access-token": process.env.TRUCKY_API_KEY as string,
            "User-Agent": "NismaraLogistics/1.0 (Next.js Server)",
            Referer: "https://nismara.web.id",
            Origin: "https://nismara.web.id",
          },
          next: { revalidate: 3600 }, // Cache 1 jam
        },
      );

      if (!res.ok) break;

      const responseData = await res.json();
      lastPage = responseData.last_page;

      // Masukkan semua member ke dalam object (Dictionary) dengan truckyId sebagai kunci
      responseData.data.forEach((member: any) => {
        membersMap[member.id] = member;
      });

      currentPage++;
    } while (currentPage <= lastPage);

    return membersMap;
  } catch (error) {
    console.error("Trucky Map Error:", error);
    return {};
  }
}

export async function getMonthlyStats(companyId: string | number) {
  try {
    const res = await fetch(
      `https://e.truckyapp.com/api/v1/company/${companyId}/stats/monthly`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": process.env.TRUCKY_API_KEY as string,
          "User-Agent": "NismaraLogistics/1.0",
          Referer: "https://nismara.web.id",
          Origin: "https://nismara.web.id",
        },
        next: { revalidate: 3600 }, // Cache 1 jam
      },
    );

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Error fetching Monthly Stats:", error);
    return null;
  }
}

export async function getJobDetails(jobId: string | number) {
  try {
    const res = await fetch(`https://e.truckyapp.com/api/v1/job/${jobId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": process.env.TRUCKY_API_KEY as string,
        "User-Agent": "NismaraLogistics/1.0",
      },
      next: { revalidate: 3600 }, // Cache 1 jam
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Error fetching Job Details:", error);
    return null;
  }
}

/**
 * Mengambil log kejadian (collision, fined) selama pekerjaan berlangsung
 */
export async function getJobEvents(jobId: string | number) {
  try {
    const res = await fetch(
      `https://e.truckyapp.com/api/v1/job/${jobId}/events`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": process.env.TRUCKY_API_KEY as string,
          "User-Agent": "NismaraLogistics/1.0",
        },
        next: { revalidate: 3600 },
      },
    );

    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error("Error fetching Job Events:", error);
    return [];
  }
}

/**
 * Helper untuk mengambil keduanya sekaligus (Detail & Events)
 */
export async function getTruckyFullJobData(jobId: string | number) {
  const [details, events] = await Promise.all([
    getJobDetails(jobId),
    getJobEvents(jobId),
  ]);

  return { details, events };
}
