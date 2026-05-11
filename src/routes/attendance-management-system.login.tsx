import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAmsAuth } from "@/hooks/useAmsAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Clock } from "lucide-react";

export const Route = createFileRoute("/attendance-management-system/login")({
  head: () => ({ meta: [{ title: "AMS · Sign in" }] }),
  component: AmsLogin,
});

const schema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});

function AmsLogin() {
  const navigate = useNavigate();
  const { user, hasAccess, loading } = useAmsAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && hasAccess) {
      navigate({ to: "/attendance-management-system" });
    }
  }, [loading, user, hasAccess, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
      if (error) throw error;

      // Verify AMS role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user!.id)
        .in("role", ["attendance_user", "attendance_admin"]);

      if (!roles || roles.length === 0) {
        await supabase.auth.signOut();
        toast.error("This account does not have access to the Attendance system.");
        return;
      }

      toast.success("Signed in");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-soft">
        <div className="flex items-center gap-2 text-primary">
          <Clock className="h-6 w-6" />
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            AMS
          </span>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-foreground">
          Attendance Management
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in with your attendance account.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
