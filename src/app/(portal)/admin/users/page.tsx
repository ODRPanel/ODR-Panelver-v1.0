import { requireUser, requirePermission } from "@/lib/rbac";
import { MODULE_KEYS, hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createUserAction, toggleUserStatusAction } from "@/actions/admin";
import { StatusBadge } from "@/components/ui/Badge";
import { ErrorAlert, SuccessAlert } from "@/components/ui/Alert";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  const user = await requireUser();
  await requirePermission(user, MODULE_KEYS.USER_ROLE_ACCESS, "view");
  const canEdit = hasPermission(user.role.permissionSet, MODULE_KEYS.USER_ROLE_ACCESS, "edit");
  const canCreate = hasPermission(user.role.permissionSet, MODULE_KEYS.USER_ROLE_ACCESS, "create");

  const [users, roles] = await Promise.all([
    prisma.user.findMany({ where: { isDeleted: false }, include: { role: true }, orderBy: { createdAt: "desc" } }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="page-title">User, Role &amp; Access Management</h1>
      <ErrorAlert message={searchParams.error} />
      <SuccessAlert message={searchParams.success} />

      {canCreate && (
        <div className="card p-6">
          <h2 className="section-title mb-4">Provision a new account</h2>
          <form action={createUserAction} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="fullName">Full name</label>
              <input className="input" id="fullName" name="fullName" required />
            </div>
            <div>
              <label className="label" htmlFor="email">Email address</label>
              <input className="input" id="email" name="email" type="email" required />
            </div>
            <div>
              <label className="label" htmlFor="password">Temporary password</label>
              <input className="input" id="password" name="password" type="text" minLength={8} required />
            </div>
            <div>
              <label className="label" htmlFor="roleId">Role</label>
              <select className="input" id="roleId" name="roleId" required>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <button className="btn-primary" type="submit">
                Create account
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card p-6">
        <h2 className="section-title mb-4">All accounts ({users.length})</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
              <th className="pb-2">Name</th>
              <th className="pb-2">Email</th>
              <th className="pb-2">Role</th>
              <th className="pb-2">MFA</th>
              <th className="pb-2">Status</th>
              {canEdit && <th className="pb-2">Action</th>}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100">
                <td className="py-2">{u.fullName}</td>
                <td className="py-2">{u.email}</td>
                <td className="py-2">{u.role.name}</td>
                <td className="py-2">{u.mfaEnabled ? "Enabled" : "Not enabled"}</td>
                <td className="py-2">
                  <StatusBadge status={u.status} />
                </td>
                {canEdit && (
                  <td className="py-2">
                    <form action={toggleUserStatusAction}>
                      <input type="hidden" name="userId" value={u.id} />
                      <button className="text-xs font-medium text-brand-700 hover:underline" type="submit">
                        {u.status === "active" ? "Suspend" : "Reactivate"}
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
