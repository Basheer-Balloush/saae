import { describe, expect, it } from "vitest";
import { dropToolPreamble } from "@/features/chat/lib/chat-stream";

type Part = { type: string; id?: string; text?: string };

async function run(parts: Part[], maxHold = 160): Promise<Part[]> {
  const stream = new ReadableStream<Part>({
    start(controller) {
      parts.forEach((p) => controller.enqueue(p));
      controller.close();
    },
  }).pipeThrough(dropToolPreamble<Part>(maxHold)());
  const out: Part[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return out;
    out.push(value);
  }
}

const text = (out: Part[]) =>
  out
    .filter((p) => p.type === "text-delta")
    .map((p) => p.text)
    .join("");

describe("dropToolPreamble", () => {
  it("drops a note written before a tool call and keeps the answer after it", async () => {
    const out = await run([
      { type: "start-step" },
      { type: "text-start", id: "t0" },
      { type: "text-delta", id: "t0", text: "بحث المعرفة عن Sync" },
      { type: "text-end", id: "t0" },
      { type: "tool-input-start", id: "c1" },
      { type: "tool-call" },
      { type: "finish-step" },
      { type: "start-step" },
      { type: "text-start", id: "t1" },
      { type: "text-delta", id: "t1", text: "Sync غير مذكورة ضمن شركاء الجمعية." },
      { type: "text-end", id: "t1" },
      { type: "finish-step" },
    ]);
    expect(text(out)).toBe("Sync غير مذكورة ضمن شركاء الجمعية.");
    expect(out.some((p) => p.id === "t0")).toBe(false);
  });

  it("drops the rest of a dropped text block that ends after the tool call starts", async () => {
    const out = await run([
      { type: "start-step" },
      { type: "text-start", id: "t0" },
      { type: "text-delta", id: "t0", text: "Let me check" },
      { type: "tool-input-start", id: "c1" },
      { type: "text-end", id: "t0" },
      { type: "finish-step" },
    ]);
    expect(out.map((p) => p.type)).toEqual(["start-step", "tool-input-start", "finish-step"]);
  });

  it("releases a short answer when the step ends without a tool call", async () => {
    const out = await run([
      { type: "start-step" },
      { type: "text-start", id: "t0" },
      { type: "text-delta", id: "t0", text: "ولو، هاد واجبنا." },
      { type: "text-end", id: "t0" },
      { type: "finish-step" },
    ]);
    expect(text(out)).toBe("ولو، هاد واجبنا.");
    expect(out.map((p) => p.type)).toEqual([
      "start-step",
      "text-start",
      "text-delta",
      "text-end",
      "finish-step",
    ]);
  });

  it("streams a long answer once it passes the hold limit", async () => {
    const out = await run(
      [
        { type: "start-step" },
        { type: "text-start", id: "t0" },
        { type: "text-delta", id: "t0", text: "12345" },
        { type: "text-delta", id: "t0", text: "67890" },
        { type: "text-delta", id: "t0", text: "abc" },
        { type: "tool-input-start", id: "c1" },
        { type: "text-end", id: "t0" },
        { type: "finish-step" },
      ],
      8,
    );
    expect(text(out)).toBe("1234567890abc");
  });
});
