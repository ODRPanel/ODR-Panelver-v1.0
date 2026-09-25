import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { loginAction } from "@/actions/auth";
import { ErrorAlert } from "@/components/ui/Alert";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const userCount = await prisma.user.count();

  return (
    <div>
      <h1 className="section-title mb-6">Sign in</h1>
      <ErrorAlert message={searchParams.error} />
      <form action={loginAction} className="mt-4 space-y-4">
        <div>
          <label className="label" htmlFor="email">
            Email address
          </label>
          <input className="input" id="email" name="email" type="email" required autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input className="input" id="password" name="password" type="password" required />
        </div>
        <button className="btn-primary w-full" type="submit">
          Sign in
        </button>
      </form>
      {userCount === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-500">
          No accounts exist yet.{" "}
          <Link className="font-medium text-brand-700 hover:underline" href="/setup">
            Set up the first Super Admin account
          </Link>
          .
        </p>
      ) : (
        <p className="mt-6 text-center text-xs text-slate-400">
          Accounts are provisioned by your Super Admin or Registrar, not self-registered.
        </p>
      )}
    </div>
  );
}
