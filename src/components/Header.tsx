import Link from "next/link";
import { logoutAction } from "@/actions/auth";

export function Header({ fullName, email }: { fullName: string; email: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="md:hidden font-serif text-lg font-bold text-brand-900">ODR Panel</div>
      <div className="ml-auto flex items-center gap-4">
        <Link href="/notifications" className="text-sm text-slate-500 hover:text-brand-700">
          Notification Centre
        </Link>
        <Link href="/profile/mfa" className="text-sm text-slate-500 hover:text-brand-700">
          {fullName} <span className="text-slate-400">({email})</span>
        </Link>
        <form action={logoutAction}>
          <button className="btn-secondary" type="submit">
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}
