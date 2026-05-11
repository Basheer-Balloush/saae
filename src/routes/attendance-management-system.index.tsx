import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/attendance-management-system/")({
  component: AmsDashboard,
});

function AmsDashboard() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-3 text-muted-foreground">
          Welcome to the Attendance Management System. Sections will appear here soon.
        </p>
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No sections configured yet.
          </p>
        </div>
      </div>
    </div>
  );
}
