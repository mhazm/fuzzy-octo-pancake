import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Ganti spasi dengan -
    .replace(/[^\w-]+/g, "") // Hapus karakter non-word
    .replace(/--+/g, "-"); // Ganti -- ganda dengan single -
};

/**
 * Konversi input tanggal (date-only, datetime-local, ISO) ke objek Date dengan timezone WIB (Asia/Jakarta).
 * Mencegah bug Invalid Date / epoch 1970 saat menyimpan tanggal ke MongoDB.
 *
 * @param dateInput - string ISO, YYYY-MM-DD, YYYY-MM-DDTHH:mm, atau Date object
 * @param isEndOfDayIfDateOnly - jika input hanya tanggal (YYYY-MM-DD), apakah dijadikan 23:59:59 WIB (true) atau 00:00:00 WIB (false)
 */
export function parseWIBDate(
  dateInput: string | Date | undefined | null,
  isEndOfDayIfDateOnly = false
): Date {
  if (!dateInput) throw new Error("Tanggal tidak boleh kosong");
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) throw new Error("Format tanggal tidak valid");
    return dateInput;
  }

  const trimmed = String(dateInput).trim();
  if (!trimmed) throw new Error("Tanggal tidak boleh kosong");

  // Jika sudah ISO lengkap dengan offset timezone (Z atau +HH:mm atau -HH:mm)
  if (/Z|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }

  // Jika hanya tanggal: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const timePart = isEndOfDayIfDateOnly ? "T23:59:59+07:00" : "T00:00:00+07:00";
    const d = new Date(`${trimmed}${timePart}`);
    if (!isNaN(d.getTime())) return d;
  }

  // Jika datetime-local: YYYY-MM-DDTHH:mm (tanpa detik)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}:00+07:00`);
    if (!isNaN(d.getTime())) return d;
  }

  // Jika datetime dengan detik tanpa offset: YYYY-MM-DDTHH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}+07:00`);
    if (!isNaN(d.getTime())) return d;
  }

  // Fallback standar
  const fallback = new Date(trimmed);
  if (!isNaN(fallback.getTime())) return fallback;

  throw new Error(`Format tanggal tidak valid: "${trimmed}"`);
}

/**
 * Format objek Date / ISO string ke format string untuk input HTML type="datetime-local" (YYYY-MM-DDTHH:mm) dalam zona waktu WIB (Asia/Jakarta).
 */
export function formatWIBDateTimeLocal(dateInput?: Date | string | number | null): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  if (d.getFullYear() <= 1970) return "";

  const wibDate = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const year = wibDate.getFullYear();
  const month = String(wibDate.getMonth() + 1).padStart(2, "0");
  const day = String(wibDate.getDate()).padStart(2, "0");
  const hours = String(wibDate.getHours()).padStart(2, "0");
  const minutes = String(wibDate.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

