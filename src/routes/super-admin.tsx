import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/super-admin")({
  head: () => ({
    meta: [
      { title: "Super Admin Dashboard" },
      { name: "description", content: "Super admin dashboard for all systems." },
    ],
  }),
  component: SuperAdminDashboard,
});

function SuperAdminDashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold mb-8">Super Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/admin"
            className="block rounded-lg border border-border bg-card p-8 hover:border-primary transition-colors"
          >
            <h2 className="text-xl font-semibold">Content Management System</h2>
          </Link>
          <Link
            to="/attendance-management-system"
            className="block rounded-lg border border-border bg-card p-8 hover:border-primary transition-colors"
          >
            <h2 className="text-xl font-semibold">Attendance Management System</h2>
          </Link>
        </div>
      </main>
    </div>
  );
}
