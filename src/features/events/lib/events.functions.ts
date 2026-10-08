import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { eventInputSchema, eventSchema, eventDateSchema, orderedDays } from "./events";

const idSchema = z.object({ id: z.string().uuid() });
export const reportInputSchema = z.object({
  id: z.string().uuid(),
  date: eventDateSchema.nullable(),
});
const sourceSchema = z.object({
  event_id: z.string().uuid(),
  kind: z.enum(["registration", "survey", "attendance", "game"]),
  source_id: z.string().uuid(),
});
export const sourceCatalogSchema = z.array(
  z.object({
    kind: sourceSchema.shape.kind,
    source_id: z.string().uuid(),
    label: z.string(),
    url: z.string(),
    public_url: z.string().nullable(),
    event_id: z.string().uuid().nullable(),
  }),
);
export type EventSource = z.infer<typeof sourceCatalogSchema>[number];
const recordSchema = z.object({
  id: z.string(),
  kind: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  at: z.string(),
  detail: z.string(),
  labels: z.record(z.object({ ar: z.string(), en: z.string() })).default({}),
  values: z
    .record(z.unknown())
    .transform(
      (values): Record<string, string> =>
        Object.fromEntries(
          Object.entries(values).map(([key, value]) => [
            key,
            typeof value === "string" ? value : (JSON.stringify(value) ?? ""),
          ]),
        ),
    )
    .optional(),
});
export const eventReportSchema = z.object({
  registrations: z.number(),
  surveys: z.number(),
  attendance: z.number(),
  badges: z.number(),
  records: z.array(recordSchema),
  record_count: z.number(),
});
export type EventReport = z.infer<typeof eventReportSchema>;

async function adminDb(userId: string) {
  const { eventsAdminDb } = await import("./events-db.server");
  return eventsAdminDb(userId);
}

export const listEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await adminDb(context.userId);
    const { data, error } = await sb
      .from("organization_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(501);
    if (error) throw new Error("Could not load events. Check the Events migration.");
    if (data.length > 500) throw new Error("There are too many events to load at once");
    return z.array(eventSchema).parse(data);
  });
export const getEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => idSchema.parse(i))
  .handler(async ({ data, context }) => {
    const sb = await adminDb(context.userId);
    const { data: row, error } = await sb
      .from("organization_events")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error("Could not load the event");
    return eventSchema.parse(row);
  });
export const saveEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid().optional(), event: eventInputSchema }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = await adminDb(context.userId);
    const event = { ...data.event, schedule: orderedDays(data.event.schedule) };
    if (data.id) {
      const { data: old, error } = await sb
        .from("organization_events")
        .select("slug")
        .eq("id", data.id)
        .single();
      if (error || old.slug !== event.slug) throw new Error("The event URL cannot be changed");
    }
    const query = data.id
      ? sb.from("organization_events").update(event).eq("id", data.id)
      : sb.from("organization_events").insert({ ...event, created_by: context.userId });
    const { data: row, error } = await query.select("*").single();
    if (error)
      throw new Error(
        error.code === "23505" ? "This event URL is already in use" : "Could not save the event",
      );
    return eventSchema.parse(row);
  });
export const resolvePublishedEvent = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({ slug: eventInputSchema.innerType().shape.slug }).parse(i),
  )
  .handler(async ({ data }) => {
    const { eventsDb } = await import("./events-db.server");
    const { data: row, error } = await eventsDb()
      .from("organization_events")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error("Could not load the event");
    if (!row) return null;
    // Never return organizer identity, tool associations, or participant data publicly.
    const { id, created_at, updated_at, tools, badge, ...event } = eventSchema.parse(row);
    return {
      ...event,
      badge: badge
        ? {
            image: badge.image,
            name_ar: badge.name_ar,
            name_en: badge.name_en,
            description_ar: badge.description_ar,
            description_en: badge.description_en,
          }
        : null,
    };
  });
export const getEventReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => reportInputSchema.parse(i))
  .handler(async ({ data, context }) => {
    const sb = await adminDb(context.userId);
    const { data: result, error } = await sb.rpc("event_report", {
      p_event_id: data.id,
      p_date: data.date,
    });
    if (error) throw new Error("Could not load event data");
    return eventReportSchema.parse(result);
  });
export const getEventSources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await adminDb(context.userId);
    const { data, error } = await sb.rpc("event_source_catalog", {});
    if (error) throw new Error("Could not load event tools");
    return sourceCatalogSchema.parse(data);
  });
export const attachEventSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    sourceSchema.extend({ remove: z.boolean().default(false) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = await adminDb(context.userId);
    const query = data.remove
      ? sb
          .from("event_sources")
          .delete()
          .eq("event_id", data.event_id)
          .eq("kind", data.kind)
          .eq("source_id", data.source_id)
      : sb
          .from("event_sources")
          .insert({ event_id: data.event_id, kind: data.kind, source_id: data.source_id });
    const { error } = await query;
    if (error)
      throw new Error(
        error.code === "23505"
          ? "This tool already belongs to an event"
          : "Could not update the event tool",
      );
    return { ok: true };
  });
export const createEventLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        kind: z.enum(["registration", "game"]),
        label: z.string().trim().min(2).max(120),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = await adminDb(context.userId);
    const { data: result, error } = await sb.rpc("event_create_link", {
      p_event_id: data.id,
      p_kind: data.kind,
      p_label: data.label,
      p_user_id: context.userId,
    });
    if (error) throw new Error("Could not create the link");
    return result;
  });
export const awardEventBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({ id: z.string().uuid(), email: z.string().trim().toLowerCase().email().max(254) })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = await adminDb(context.userId);
    const { error } = await sb.rpc("event_award_badge", {
      p_event_id: data.id,
      p_email: data.email,
      p_admin_id: context.userId,
    });
    if (error)
      throw new Error(
        error.message.includes("not_eligible")
          ? "This member does not meet the badge rule"
          : error.message.includes("member_not_found")
            ? "No confirmed member account has this email"
            : "Could not award the badge",
      );
    return { ok: true };
  });
