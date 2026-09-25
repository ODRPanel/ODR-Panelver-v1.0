"use client";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="card max-w-md p-8 text-center">
          <h1 className="page-title">Something went wrong</h1>
          <p className="mt-3 text-sm text-slate-500">{error.message}</p>
          <a href="/login" className="btn-primary mt-6 inline-flex">
            Back to login
          </a>
        </div>
      </body>
    </html>
  );
}
