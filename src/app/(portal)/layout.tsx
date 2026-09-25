import { requireUser } from "@/lib/rbac";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen">
      <Sidebar permissionSet={user.role.permissionSet} roleName={user.role.name} />
      <div className="flex flex-1 flex-col">
        <Header fullName={user.fullName} email={user.email} />
        <main className="flex-1 bg-slate-50 p-6">{children}</main>
      </div>
    </div>
  );
}
