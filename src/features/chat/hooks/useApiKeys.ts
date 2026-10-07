import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listChatApiKeys, type ChatApiKey } from "@/features/chat/lib/chat-api-keys.functions";

export function keyState(k: ChatApiKey): "active" | "revoked" | "expired" {
  if (k.revoked_at) return "revoked";
  if (k.expires_at && new Date(k.expires_at).getTime() <= Date.now()) return "expired";
  return "active";
}

/** The chatbot page's API keys, loaded once and reloaded after each change. */
export function useApiKeys() {
  const listFn = useServerFn(listChatApiKeys);
  const [rows, setRows] = useState<ChatApiKey[] | null>(null);
  const [failed, setFailed] = useState(false);
  const reload = useCallback(
    () =>
      listFn()
        .then((r) => {
          setRows(r.keys);
          setFailed(false);
        })
        .catch(() => {
          setRows([]);
          setFailed(true);
        }),
    [listFn],
  );
  useEffect(() => {
    void reload();
  }, [reload]);
  const active = rows && !failed ? rows.filter((k) => keyState(k) === "active").length : null;
  return { rows, failed, active, reload };
}
