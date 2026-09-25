import "server-only";

/** Stub SMS/WhatsApp gateway adapter (Section 7.2 of the SOW/SRS). Logs to
 * the server console instead of sending a real message - a production
 * deployment replaces this with a licensed SMS/WhatsApp Business API
 * provider (e.g. Twilio, MSG91, WhatsApp Cloud API). */
export async function sendSimulatedMessage(to: string, body: string): Promise<{ delivered: boolean }> {
  console.info(`[stub sms/whatsapp adapter] to=${to} body=${body}`);
  return { delivered: true };
}
