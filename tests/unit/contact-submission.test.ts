import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const script = readFileSync(new URL("../../public/cinematic/js/contact.js", import.meta.url), "utf8");

// Run the shipped script with only its DOM surface mocked, keeping its actual
// submit handler and promise lifecycle under test. No database requests occur.
function mount(send: (row: unknown) => Promise<void>) {
  const handlers = new Map<string, (event: { preventDefault(): void }) => Promise<void>>();
  const attrs = new Map<string, string>();
  const button = { disabled: false };
  const form = {
    addEventListener: (type: string, fn: (event: { preventDefault(): void }) => Promise<void>) => handlers.set(type, fn),
    querySelectorAll: () => [button],
    setAttribute: (name: string, value: string) => attrs.set(name, value),
    removeAttribute: (name: string) => attrs.delete(name),
    reset: vi.fn(),
  };
  const status = { textContent: "", classList: { toggle: vi.fn() } };
  const input = (value: string) => ({ value, addEventListener: vi.fn(), focus: vi.fn() });
  const nodes: Record<string, unknown> = {
    write: form, "form-status": status,
    "f-name": input("Test Person"), "f-email": input("test@example.com"),
    "f-phone": input(""), "f-context": input(""),
    "f-subject": input("Test enquiry"), "f-message": input("Please contact me."),
    "f-count": { textContent: "18" },
  };
  runInNewContext(script, {
    document: {
      getElementById: (id: string) => nodes[id] ?? null,
      querySelectorAll: () => [], documentElement: { lang: "en", dir: "ltr" },
    },
    window: { saaeContactSubmit: send, dispatchEvent: vi.fn(), location: { href: "" } },
    localStorage: { getItem: () => "en", setItem: vi.fn() },
    CustomEvent: class { constructor(public type: string, public options: unknown) {} },
  });
  return { button, attrs, form, status, submit: () => handlers.get("submit")!({ preventDefault() {} }) };
}

describe("contact submission", () => {
  it("sends once for repeated submits until the first request completes", async () => {
    let resolve!: () => void;
    const send = vi.fn(() => new Promise<void>(done => { resolve = done; }));
    const ui = mount(send);
    const first = ui.submit();
    await ui.submit();
    expect(send).toHaveBeenCalledTimes(1);
    expect(ui.button.disabled).toBe(true);
    expect(ui.attrs.get("aria-busy")).toBe("true");
    expect(ui.form.reset).not.toHaveBeenCalled();
    resolve();
    await first;
    expect(ui.button.disabled).toBe(false);
    expect(ui.attrs.has("aria-busy")).toBe(false);
    expect(ui.form.reset).toHaveBeenCalledTimes(1);
    expect(ui.status.textContent).toContain("received");
  });

  it.each(["rejection", "synchronous exception"])("allows retry and preserves fields after a %s", async kind => {
    const send = vi.fn(() => Promise.resolve());
    send.mockImplementationOnce(() => {
      if (kind === "synchronous exception") throw new Error("unavailable");
      return Promise.reject(new Error("unavailable"));
    });
    const ui = mount(send);
    await ui.submit();
    expect(ui.status.textContent).toContain("could not be sent");
    expect(ui.form.reset).not.toHaveBeenCalled();
    expect(ui.button.disabled).toBe(false);
    expect(ui.attrs.has("aria-busy")).toBe(false);
    await ui.submit();
    expect(send).toHaveBeenCalledTimes(2);
    expect(ui.form.reset).toHaveBeenCalledTimes(1);
  });
});
