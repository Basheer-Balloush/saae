import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance Management System" },
      { name: "description", content: "Attendance management system." },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold">Attendance Management System</h1>
      </main>
    </div>
  );
}
