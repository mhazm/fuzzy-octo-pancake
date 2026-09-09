import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { checkRateLimit } from "@/lib/rateLimit";
import { claimManagerSalary } from "@/lib/managerSalary";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0, s-maxage=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  Pragma: "no-cache",
  Expires: "0",
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user.role !== "manager" && session.user.role !== "admin")) {
      return NextResponse.json(
        { error: "Unauthorized. Akses khusus Manager & Admin." },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const discordId = String(session.user.discordId);

    // Rate limit guard: 2 detik
    if (!checkRateLimit(discordId, "payroll-claim", 2000)) {
      return NextResponse.json(
        { error: "Permintaan terlalu cepat. Tunggu beberapa saat." },
        { status: 429, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { month } = body;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "Format parameter bulan tidak valid (contoh yang benar: YYYY-MM)." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // Eksekusi klaim secara atomik
    const result = await claimManagerSalary(discordId, month);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Gagal memproses klaim gaji." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // Revalidasi cache halaman dashboard
    revalidatePath("/dashboard/manage/payroll");
    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard/vouchers");
    revalidatePath("/dashboard/points");

    return NextResponse.json(
      {
        success: true,
        message: `Gaji dan insentif performa periode ${month} berhasil dicairkan!`,
        data: result.data,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error("POST /api/manage/payroll/claim Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
