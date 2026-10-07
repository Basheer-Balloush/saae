import { describe, expect, it } from "vitest";
import { takeChatLink } from "../../src/features/chat/lib/chat-link";

describe("links that open the chat", () => {
  it("opens it from the QR code and the NFC tag, then drops the parameter", () => {
    expect(takeChatLink("https://aisyria.org/?chat=qr")).toBe("/");
    expect(takeChatLink("https://aisyria.org/?chat=nfc")).toBe("/");
  });

  it("opens it with no value too", () => {
    expect(takeChatLink("https://aisyria.org/about?chat")).toBe("/about");
  });

  it("keeps the rest of the address", () => {
    expect(takeChatLink("https://aisyria.org/news?lang=en&chat=qr#top")).toBe("/news?lang=en#top");
  });

  it("leaves other pages alone", () => {
    expect(takeChatLink("https://aisyria.org/")).toBeNull();
    expect(takeChatLink("https://aisyria.org/initiative?action=pay")).toBeNull();
  });
});
