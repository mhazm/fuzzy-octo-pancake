/**
 * Helper utility untuk menghasilkan deskripsi misi giveaway otomatis
 * yang dapat digunakan baik di Client Component maupun Server Component.
 */

export function getAutoQuestDescription(
  type: string,
  target: number = 1,
  minDistanceKm?: number,
  minCargoMass?: number
): string {
  const targetNum = target || 1;
  switch (type) {
    case "TOTAL_JOBS":
      return `Selesaikan ${targetNum} pekerjaan kargo apa saja di ETS2 atau ATS.`;
    case "TRUCKERSMP_JOB":
      return `Selesaikan ${targetNum} pekerjaan kargo di server multiplayer TruckersMP.`;
    case "LONG_HAUL": {
      const dist = (minDistanceKm || 2000).toLocaleString("id-ID");
      return `Selesaikan ${targetNum} pengiriman kargo dengan jarak minimal ${dist} KM.`;
    }
    case "HEAVY_CARGO": {
      const mass = (minCargoMass || 25).toLocaleString("id-ID");
      return `Selesaikan ${targetNum} pengiriman kargo berat dengan bobot minimal ${mass} Ton.`;
    }
    case "PERFECT_DELIVERY":
      return `Selesaikan ${targetNum} pengiriman kargo dengan kondisi sempurna tanpa kerusakan (0% Damage).`;
    default:
      return `Selesaikan ${targetNum} pekerjaan kargo selama periode giveaway.`;
  }
}

/**
 * Menyelesaikan deskripsi misi:
 * Menggunakan deskripsi manual jika tersedia, atau men-generate deskripsi otomatis
 * jika deskripsi kosong atau merupakan template default bawaan yang tidak sinkron dengan tipe misi.
 */
export function resolveQuestDescription(q: {
  type: string;
  target?: number;
  minDistanceKm?: number;
  minCargoMass?: number;
  description?: string;
}): string {
  if (!q.description || !q.description.trim()) {
    return getAutoQuestDescription(q.type, q.target, q.minDistanceKm, q.minCargoMass);
  }

  // Deteksi anomali bawaan template default lama yang tidak sinkron:
  const isOldDefaultJobsTemplate = q.description.includes("pekerjaan kargo apa saja di ETS2 atau ATS");
  const isOldDefaultLongHaulTemplate = q.description.includes("pengiriman kargo dengan jarak minimal");

  // Jika tipe misi adalah TruckersMP tapi teksnya template kargo apa saja / jarak jauh
  if (q.type === "TRUCKERSMP_JOB" && (isOldDefaultJobsTemplate || isOldDefaultLongHaulTemplate)) {
    return getAutoQuestDescription(q.type, q.target, q.minDistanceKm, q.minCargoMass);
  }

  // Jika tipe misi adalah 0% Damage tapi teksnya template kargo apa saja / jarak jauh
  if (q.type === "PERFECT_DELIVERY" && (isOldDefaultJobsTemplate || isOldDefaultLongHaulTemplate)) {
    return getAutoQuestDescription(q.type, q.target, q.minDistanceKm, q.minCargoMass);
  }

  // Jika tipe misi adalah Heavy Cargo tapi teksnya template kargo apa saja / jarak jauh
  if (q.type === "HEAVY_CARGO" && (isOldDefaultJobsTemplate || isOldDefaultLongHaulTemplate)) {
    return getAutoQuestDescription(q.type, q.target, q.minDistanceKm, q.minCargoMass);
  }

  return q.description;
}
