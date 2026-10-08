import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import type { EventRecord } from "./events";

type EventRow = Omit<EventRecord, "schedule" | "badge"> & {
  schedule: Json;
  badge: Json;
  created_by: string | null;
};
type EventsDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables" | "Functions"> & {
    Tables: Database["public"]["Tables"] & {
      organization_events: {
        Row: EventRow;
        Insert: Omit<EventRow, "id" | "created_at" | "updated_at">;
        Update: Partial<EventRow>;
        Relationships: [];
      };
      event_sources: {
        Row: { event_id: string; kind: string; source_id: string };
        Insert: { event_id: string; kind: string; source_id: string };
        Update: never;
        Relationships: [];
      };
      game_links: {
        Row: {
          id: string;
          slug: string;
          game: string;
          label: string;
          is_active: boolean;
          created_at: string;
          created_by: string | null;
        };
        Insert: { slug: string; game: string; label: string; created_by?: string };
        Update: { is_active?: boolean };
        Relationships: [];
      };
    };
    Functions: Database["public"]["Functions"] & {
      event_report: { Args: { p_event_id: string; p_date: string | null }; Returns: Json };
      event_source_catalog: { Args: Record<string, never>; Returns: Json };
      event_create_link: {
        Args: {
          p_event_id: string;
          p_kind: string;
          p_label: string;
          p_user_id: string;
          p_slug?: string;
        };
        Returns: Json;
      };
      event_award_badge: {
        Args: { p_event_id: string; p_email: string; p_admin_id: string };
        Returns: Json;
      };
      event_texpo_report: { Args: { p_event_id: string; p_date: string | null }; Returns: Json };
      event_my_badges: { Args: { p_user_id: string }; Returns: Json };
    };
  };
};
let client: ReturnType<typeof createClient<EventsDatabase>> | undefined;
export function eventsDb() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Event storage is not configured");
    client = createClient<EventsDatabase>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(15_000) }),
      },
    });
  }
  return client;
}
export async function eventsAdminDb(userId: string) {
  const sb = eventsDb();
  const { data, error } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "lms_admin"]);
  if (error || !data?.length) throw new Error("Forbidden: admin role required");
  return sb;
}
