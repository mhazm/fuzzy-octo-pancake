export const MECHANIC_FIRST_NAMES = [
  "Fikri",
  "Budi",
  "Asep",
  "Joko",
  "Agus",
  "Bambang",
  "Dedi",
  "Eko",
  "Hendra",
  "Iwan",
  "Rudi",
  "Yudi",
  "Ade",
  "Andi",
  "Ari",
  "Cahyo",
  "Deni",
  "Fajar",
  "Gilang",
  "Heri",
  "Indra",
  "Kiki",
  "Lukman",
  "Rizal",
  "Reza",
  "Teguh",
  "Wahyu",
  "Yoga",
  "Zainal",
  "Ahmad",
  "Muhammad",
  "Ilham",
  "Bayu",
  "Aditya",
  "Dimas",
  "Rizki",
  "Putra",
  "Kurniawan",
  "Pratama",
  "Saputra",
  "Wibowo",
  "Santoso",
  "Suryono",
  "Sutanto",
  "Wijaya",
  "Susanto",
  "Setiawan",
  "Hidayat",
];

export const MECHANIC_LAST_NAMES = [
  "Budiman",
  "Santoso",
  "Wijaya",
  "Susanto",
  "Setiawan",
  "Hidayat",
  "Kusuma",
  "Nugroho",
  "Pratama",
  "Saputra",
  "Wibowo",
  "Suryono",
  "Sutanto",
  "Hartono",
  "Salim",
  "Siregar",
  "Nasution",
  "Sanjaya",
  "Kurniawan",
  "Pangestu",
  "Utomo",
  "Mulyono",
  "Gunawan",
  "Halim",
  "Wahyudi",
  "Ramadhan",
  "Firmansyah",
  "Mahendra",
  "Syahputra",
  "Baskoro",
  "Wiguna",
  "Prayoga",
  "Nugraha",
];

export function generateMechanicName(): string {
  const first =
    MECHANIC_FIRST_NAMES[
      Math.floor(Math.random() * MECHANIC_FIRST_NAMES.length)
    ];
  const last =
    MECHANIC_LAST_NAMES[Math.floor(Math.random() * MECHANIC_LAST_NAMES.length)];
  return `${first} ${last}`;
}

export type MechanicSpecialty = "umum" | "ban" | "mesin";

export interface MechanicLevelConfig {
  level: number;
  boostPercentage: number;
  salary: number;
}

export const MECHANIC_LEVELS: Record<number, MechanicLevelConfig> = {
  1: { level: 1, boostPercentage: 10, salary: 500 },
  2: { level: 2, boostPercentage: 20, salary: 1000 },
  3: { level: 3, boostPercentage: 35, salary: 2000 },
  4: { level: 4, boostPercentage: 50, salary: 3500 },
  5: { level: 5, boostPercentage: 70, salary: 5000 },
};

export function getMechanicConfig(
  level: number,
): MechanicLevelConfig | undefined {
  return MECHANIC_LEVELS[level];
}
