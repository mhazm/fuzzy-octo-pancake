import clientPromise from "@/lib/mongodb";
import SecurityAlert from "@/lib/models/SecurityAlert";

/**
 * Logs a transaction if it exceeds the extreme threshold (10,000 NC)
 */
export async function logExtremeActivity(
  discordId: string | number,
  action: string,
  amount: number,
  details: string
) {
  const THRESHOLD = 10000;

  if (amount > THRESHOLD) {
    try {
      // Print to server console for immediate visibility
      console.warn("\x1b[41m\x1b[37m[SECURITY ALERT]\x1b[0m Extreme Activity Detected!");
      console.warn(`User: ${discordId} | Action: ${action} | Amount: ${amount} N¢ | Details: ${details}`);

      // Save to database for the Admin Dashboard
      await clientPromise;
      const alert = new SecurityAlert({
        discordId,
        action,
        amount,
        details,
      });
      await alert.save();
      
    } catch (error) {
      console.error("Failed to log extreme activity:", error);
    }
  }
}
