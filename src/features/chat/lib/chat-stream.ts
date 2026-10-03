/* The model sometimes writes a line before calling a tool ("بحث المعرفة عن
   Sync", "Let me check the courses") and that note reached the visitor. Each
   step's opening text is held back until it is clearly an answer: dropped if a
   tool call follows, released once it grows past `maxHold` characters or the
   step ends without a tool call. A real answer therefore still streams, a few
   words late at most. */

type Part = { type: string; id?: string; text?: string };

export function dropToolPreamble<T extends Part>(maxHold = 160) {
  return () => {
    let held: T[] = [];
    let heldChars = 0;
    let released = false;
    const dropped = new Set<string>();

    return new TransformStream<T, T>({
      transform(part, controller) {
        const isText =
          part.type === "text-start" || part.type === "text-delta" || part.type === "text-end";

        if (part.type === "start-step") {
          held = [];
          heldChars = 0;
          released = false;
          controller.enqueue(part);
          return;
        }

        if (isText) {
          // A text block already dropped as a preamble stays dropped to its end.
          if (part.id && dropped.has(part.id)) return;
          if (released) {
            controller.enqueue(part);
            return;
          }
          held.push(part);
          if (part.type === "text-delta") heldChars += part.text?.length ?? 0;
          if (heldChars > maxHold) {
            held.forEach((p) => controller.enqueue(p));
            held = [];
            released = true;
          }
          return;
        }

        if ((part.type === "tool-input-start" || part.type === "tool-call") && !released) {
          held.forEach((p) => p.id && dropped.add(p.id));
          held = [];
          heldChars = 0;
        }

        if (part.type === "finish-step" && !released) {
          held.forEach((p) => controller.enqueue(p));
          held = [];
        }

        controller.enqueue(part);
      },
      flush(controller) {
        held.forEach((p) => controller.enqueue(p));
      },
    });
  };
}
