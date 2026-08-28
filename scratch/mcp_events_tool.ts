// 1. TAMBAHKAN SCHEMA INI KE DALAM DAFTAR TOOLS ANDA
export const getEventsToolSchema = {
  name: "get_events_via_api",
  description: "Mengambil semua jadwal event komunitas (Convoy, Contracts, NC Boosts, Coupons, Community Goals) secara kronologis dari Nismara Transport API.",
  inputSchema: {
    type: "object",
    properties: {}, // Tidak butuh argumen apa-apa
    required: []
  }
};

// 2. TAMBAHKAN HANDLER INI KE DALAM SWITCH-CASE / ROUTER EKSEKUSI MCP ANDA
export async function handleGetEventsTool() {
  try {
    // Pastikan base URL ini mengarah ke URL Next.js Nismara (sesuaikan dengan environment)
    const apiUrl = 'http://localhost:3000/api/mcp/events';
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Gagal memanggil API: HTTP status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Format pengembalian standar (Model Context Protocol)
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2)
        }
      ]
    };
  } catch (error) {
    console.error("Error fetching events:", error);
    return {
      content: [
        {
          type: "text",
          text: `Gagal mengambil jadwal event: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true // Menandakan ke LLM bahwa eksekusi gagal
    };
  }
}
