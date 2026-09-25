import "server-only";

/** Stub multi-currency payment-gateway adapter (Section 7.2 of the
 * SOW/SRS). Marks a CostLedgerEntry as "paid" without moving real money -
 * a production deployment replaces this with a licensed payment gateway
 * supporting the currencies at Section 6 of the SOW/SRS. */
export async function simulatePaymentCapture(params: {
  amount: number;
  currency: string;
}): Promise<{ paymentReference: string; status: "simulated_paid" }> {
  return {
    paymentReference: `SIMPAY-${params.currency}-${Date.now().toString(36).toUpperCase()}`,
    status: "simulated_paid",
  };
}
