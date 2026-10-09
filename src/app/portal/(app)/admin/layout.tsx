import { AdminTabs } from "@/components/portal/admin-tabs";
import { requireAdmin } from "@/lib/portal/auth";

// Setup: staff, clients, pick-lists and company details. Admins only.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold">Setup</h1>
        <p className="mt-1 text-muted">Staff accounts, clients, work types, holidays and the company details that appear on invoices.</p>
      </div>
      <AdminTabs />
      {children}
    </div>
  );
}
