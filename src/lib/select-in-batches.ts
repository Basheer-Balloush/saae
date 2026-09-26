import { supabase } from "@/integrations/supabase/client";

/** `select … where column in (ids)` for long id lists. PostgREST puts the ids
    in the URL, so a few hundred of them make the request fail outright;
    asking 100 at a time keeps every URL short. */
export async function selectInBatches<Row>(
  table: string,
  columns: string,
  column: string,
  ids: string[],
  size = 100,
): Promise<Row[]> {
  const batches = Array.from({ length: Math.ceil(ids.length / size) }, (_, i) =>
    ids.slice(i * size, (i + 1) * size),
  );
  const results = await Promise.all(
    batches.map((b) =>
      (
        supabase.from(table as never) as unknown as {
          select: (c: string) => { in: (k: string, v: string[]) => PromiseLike<{ data: unknown }> };
        }
      )
        .select(columns)
        .in(column, b),
    ),
  );
  return results.flatMap((r) => (r.data as Row[] | null) ?? []);
}
