# Third-Party Integration Adapters

Section 1.2 ("Out of Scope") of the SOW/SRS is explicit that the underlying
video-conferencing, e-signature, payment-gateway, SMS-gateway, OCR,
LiquidText and AI/LLM **services** are third-party products "procured and
licensed separately" by the Client - the Platform's job is only to provide
a pluggable integration point for each one (Section 7.2).

Every file in this folder is exactly that pluggable point: a small
TypeScript interface plus a **local stub implementation** that lets every
module depending on it (Hearings, Orders/Awards, Costs, Communication,
Document Intelligence, the AI Layer) be fully exercised end-to-end on a
laptop with no paid subscription, no API key and no internet access.

To connect a real provider later:

1. Open the relevant file (e.g. `video.ts`).
2. Replace the body of the exported function with a real API call.
3. Nothing else in the application needs to change - every caller only
   depends on the function's return type, per the "independently
   deployable, independently upgradable" integration-layer requirement at
   Section 7.1 of the SOW/SRS.

Every stub call is written to the audit trail exactly like a real one, and
its output is clearly labelled as simulated wherever it is shown on screen.
