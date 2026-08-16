"use server";

import { getCurrencyDataLogic } from "@/lib/currency";

export async function getCurrencyData() {
  return getCurrencyDataLogic();
}
