import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/super-admin")({
  head: () => ({
    meta: [
      { title: "Super Admin — SAAE" },
      { name: "description", content: "Private SAAE super-admin console for managing the CMS, LMS, and AMS systems." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Super Admin — SAAE" },
      { property: "og:description", content: "Private SAAE super-admin console." },
    ],
  }),
  component: SuperAdminDashboard,
});

function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/admin/login" });
    else if (!isAdmin) navigate({ to: "/" });
  }, [loading, user, isAdmin, navigate]);

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
        </div>
      </main>
    </div>
  );
}
