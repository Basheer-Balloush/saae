// Map raw DB / network errors to safe, generic user-facing messages.
// Prevents leaking table names, RLS policy text, constraint names, etc.
export function toUserMessage(err: unknown, fallback = "Operation failed — please try again"): string {
  // Log the raw detail for debugging only.
  // eslint-disable-next-line no-console
  if (err) console.error("[error]", err);
  const msg = typeof err === "string" ? err : (err as { message?: string })?.message;
  if (!msg) return fallback;
  const low = msg.toLowerCase();
  if (low.includes("row-level security") || low.includes("permission denied")) return "You don't have permission to perform this action.";
  if (low.includes("duplicate key") || low.includes("unique constraint")) return "This item already exists.";
  if (low.includes("violates foreign key")) return "Related record is missing or invalid.";
  if (low.includes("not null") || low.includes("invalid input")) return "Some required information is missing or invalid.";
  if (low.includes("network") || low.includes("fetch")) return "Network error — please check your connection.";
  if (low.includes("jwt") || low.includes("unauthenticated") || low.includes("not authenticated")) return "Please sign in to continue.";
  return fallback;
}
