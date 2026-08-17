/**
 * Cloudflare Turnstile — Server-Side Token Verifier
 *
 * Usage in a Server Action or API Route:
 *
 *   const result = await verifyTurnstileToken(token);
 *   if (!result.success) return { error: "Verifikasi gagal. Coba lagi." };
 */

const TURNSTILE_SECRET_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteip?: string
): Promise<{ success: boolean; errorCodes?: string[] }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    // In development without a secret key, skip verification
    if (process.env.NODE_ENV === "development") {
      console.warn("[Turnstile] TURNSTILE_SECRET_KEY not set — skipping verification in dev mode.");
      return { success: true };
    }
    return { success: false, errorCodes: ["missing-secret-key"] };
  }

  if (!token) {
    return { success: false, errorCodes: ["missing-input-response"] };
  }

  try {
    const formData = new FormData();
    formData.append("secret", secret);
    formData.append("response", token);
    if (remoteip) formData.append("remoteip", remoteip);

    const res = await fetch(TURNSTILE_SECRET_URL, {
      method: "POST",
      body: formData,
    });

    const data: TurnstileVerifyResponse = await res.json();

    return {
      success: data.success,
      errorCodes: data["error-codes"],
    };
  } catch (err) {
    console.error("[Turnstile] Verification request failed:", err);
    return { success: false, errorCodes: ["network-error"] };
  }
}
