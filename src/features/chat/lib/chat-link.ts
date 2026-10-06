/* A link that opens the Abu Al-Joud chat on arrival: any page where the chat is
   mounted, with ?chat=<where the link was printed> (the QR code is ?chat=qr, the
   NFC tag ?chat=nfc). The parameter is dropped once the chat opens, so a reload,
   the back button or a shared link does not keep reopening it. */
export const CHAT_LINK_PARAM = "chat";

/** The address to show once the chat is open, or null when the link didn't ask for it. */
export function takeChatLink(href: string): string | null {
  const url = new URL(href);
  if (!url.searchParams.has(CHAT_LINK_PARAM)) return null;
  url.searchParams.delete(CHAT_LINK_PARAM);
  return url.pathname + url.search + url.hash;
}
