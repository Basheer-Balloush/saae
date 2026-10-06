import { describe, expect, it } from "vitest";
import { clampGuideOffset } from "../../src/features/chat/lib/guide-drag";

describe("dragging the character and card as one group", () => {
  const origin = { left: 40, top: 440, right: 500, bottom: 700 };
  const viewport = { width: 1280, height: 720 };

  it("moves freely in every direction while the whole group fits", () => {
    expect(clampGuideOffset(origin, { x: 300, y: -200 }, viewport)).toEqual({ x: 300, y: -200 });
    expect(clampGuideOffset(origin, { x: -20, y: 5 }, viewport)).toEqual({ x: -20, y: 5 });
  });

  it("keeps both the card and the character reachable at screen edges", () => {
    const leftTop = clampGuideOffset(origin, { x: -2000, y: -2000 }, viewport);
    expect(origin.left + leftTop.x).toBe(8);
    expect(origin.top + leftTop.y).toBe(8);
    const rightBottom = clampGuideOffset(origin, { x: 2000, y: 2000 }, viewport);
    expect(origin.right + rightBottom.x).toBe(1272);
    expect(origin.bottom + rightBottom.y).toBe(712);
  });

  it("lets a previously moved guide return to its original anchor", () => {
    expect(clampGuideOffset(origin, { x: 0, y: 0 }, viewport)).toEqual({ x: 0, y: 0 });
  });

  it("keeps a phone-sized group inside a narrow screen", () => {
    const phone = { left: 6, top: 620, right: 368, bottom: 828 };
    const moved = clampGuideOffset(phone, { x: -900, y: -500 }, { width: 390, height: 844 });
    expect(phone.left + moved.x).toBeGreaterThanOrEqual(8);
    expect(phone.right + moved.x).toBeLessThanOrEqual(382);
    expect(phone.top + moved.y).toBeGreaterThanOrEqual(8);
    expect(phone.bottom + moved.y).toBeLessThanOrEqual(836);
  });
});
