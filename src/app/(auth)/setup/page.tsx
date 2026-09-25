import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { bootstrapSuperAdminAction } from "@/actions/auth";
import { ErrorAlert } from "@/components/ui/Alert";

export default async function SetupPage({ searchParams }: { searchParams: { error?: string } }) {
  const userCount = await prisma.user.count();
  if (userCount > 0) redirect("/login");

  return (
    <div>
      <h1 className="section-title mb-2">First-time setup</h1>
      <p className="mb-6 text-sm text-slate-500">
        This one-time step creates the first Super Admin account for this installation, per the
        bootstrap provisioning journey (Annexure A-1, Section 4). Every other account is
        subsequently provisioned from the Super Admin or Registrar console.
      </p>
      <ErrorAlert message={searchParams.error} />
      <form action={bootstrapSuperAdminAction} className="mt-4 space-y-4">
        <div>
          <label className="label" htmlFor="fullName">
            Full name
          </label>
          <input className="input" id="fullName" name="fullName" required autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email address
          </label>
          <input className="input" id="email" name="email" type="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password (at least 8 characters)
          </label>
          <input className="input" id="password" name="password" type="password" minLength={8} required />
        </div>
        <button className="btn-primary w-full" type="submit">
          Create Super Admin account
        </button>
      </form>
    </div>
  );
}
