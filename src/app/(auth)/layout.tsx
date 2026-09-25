export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="font-serif text-2xl font-bold tracking-tight text-brand-900">ODR Panel</p>
          <p className="mt-1 text-sm text-slate-500">
            Online Dispute Resolution &amp; Case Management Platform
          </p>
        </div>
        <div className="card p-8">{children}</div>
      </div>
    </div>
  );
}
