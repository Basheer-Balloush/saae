export type GuideOffset = { x: number; y: number };
export type GuideBounds = { left: number; top: number; right: number; bottom: number };

export const GUIDE_DRAG_THRESHOLD = 6;

/** Keep the entire character/card group within reach, including after a second drag. */
export function clampGuideOffset(
  origin: GuideBounds,
  desired: GuideOffset,
  viewport: { width: number; height: number },
): GuideOffset {
  const margin = 8;
  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(value, Math.max(min, max)));
  return {
    x: clamp(desired.x, margin - origin.left, viewport.width - margin - origin.right),
    y: clamp(desired.y, margin - origin.top, viewport.height - margin - origin.bottom),
  };
}
