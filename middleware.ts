import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Hanya memproteksi rute API MCP
  if (request.nextUrl.pathname.startsWith('/api/mcp')) {
    const authHeader = request.headers.get('authorization');
    const mcpToken = process.env.MCP_API_TOKEN;

    if (!mcpToken) {
      console.warn("WARNING: MCP_API_TOKEN tidak diatur di environment variables!");
      return NextResponse.json(
        { error: 'Server Error: MCP API token belum dikonfigurasi' },
        { status: 500 }
      );
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Token Bearer tidak ditemukan atau tidak valid' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    if (token !== mcpToken) {
      return NextResponse.json(
        { error: 'Forbidden: Token tidak cocok' },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

// Konfigurasi matcher agar middleware HANYA berjalan untuk rute ini
// Ini penting agar tidak membebani performa untuk rute lain (seperti halaman web biasa)
export const config = {
  matcher: '/api/mcp/:path*',
};
