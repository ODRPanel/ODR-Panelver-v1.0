import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { disableMfaAction } from "@/actions/auth";
import { MfaEnroll } from "@/components/MfaEnroll";
import { ErrorAlert, SuccessAlert } from "@/components/ui/Alert";

export default async function ProfileMfaPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  const user = await requireUser();
  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="page-title">Multi-Factor Authentication</h1>
      <p className="text-sm text-slate-500">
        Section 6 of the SOW/SRS requires mandatory MFA before live case data is entered. This
        local build enrols MFA through a built-in authenticator app rather than an external
        identity provider.
      </p>
      <ErrorAlert message={searchParams.error} />
      <SuccessAlert message={searchParams.success} />
      <div className="card p-6">
        {dbUser.mfaEnabled ? (
          <div className="space-y-4">
            <p className="text-sm font-medium text-emerald-700">MFA is currently enabled on your account.</p>
            <form action={disableMfaAction}>
              <button className="btn-danger" type="submit">
                Disable MFA
              </button>
            </form>
          </div>
        ) : (
          <MfaEnroll />
        )}
      </div>
    </div>
  );
}
