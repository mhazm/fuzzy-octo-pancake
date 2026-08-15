import { NextResponse } from "next/server";

const AZURACAST_API_KEY = process.env.AZURACAST_API_KEY;
// Base URL for the public API
const AZURACAST_API_URL = "https://radio.nismara.web.id:8443/api/station/1";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const userAgent = req.headers.get("user-agent") || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const forwardedFor = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";

    const res = await fetch(`${AZURACAST_API_URL}/requests`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": userAgent,
        "X-Forwarded-For": forwardedFor,
        ...(AZURACAST_API_KEY ? { Authorization: `Bearer ${AZURACAST_API_KEY}` } : {}),
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch requests: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, s-maxage=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error: any) {
    console.error("Error fetching requestable songs:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data lagu", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const userAgent = req.headers.get("user-agent") || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const forwardedFor = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";

    const body = await req.json();
    const { request_id } = body;

    if (!request_id) {
      return NextResponse.json(
        { error: "Request ID tidak valid" },
        { status: 400 }
      );
    }

    const res = await fetch(`${AZURACAST_API_URL}/request/${request_id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": userAgent,
        "X-Forwarded-For": forwardedFor,
        ...(AZURACAST_API_KEY ? { Authorization: `Bearer ${AZURACAST_API_KEY}` } : {}),
      },
    });

    const result = await res.json();

    if (!res.ok) {
      // Typically AzuraCast returns standard error message for spam/limits
      return NextResponse.json(
        { error: result.message || "Gagal mengirim request" },
        { status: res.status }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error submitting request:", error);
    return NextResponse.json(
      { error: "Gagal mengirim request", details: error.message },
      { status: 500 }
    );
  }
}
