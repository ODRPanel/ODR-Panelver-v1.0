"use client";

import Link from "next/link";

export default function PortalError({ error }: { error: Error & { digest?: string } }) {
  const isAccessDenied = error.message.startsWith("Access denied");

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="page-title">{isAccessDenied ? "Access Denied" : "Something went wrong"}</h1>
      <p className="mt-3 text-sm text-slate-500">
        {isAccessDenied
          ? "Your role does not have permission to view this screen. If you believe this is incorrect, contact your Super Admin or Registrar."
          : "An unexpected error occurred while loading this page."}
      </p>
      {!isAccessDenied && (
        <p className="mt-2 text-xs text-slate-400 font-mono">{error.message}</p>
      )}
      <Link href="/dashboard" className="btn-primary mt-6 inline-flex">
        Back to dashboard
      </Link>
    </div>
  );
}
