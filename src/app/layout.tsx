import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ODR Panel | Case Management Platform for Arbitrators",
  description:
    "Online Dispute Resolution and Case Management Platform for arbitrators, institutions, parties and counsel.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans text-slate-900">{children}</body>
    </html>
  );
}
