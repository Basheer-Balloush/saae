import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type MouseEvent,
} from "react";
import {
  clampGuideOffset,
  GUIDE_DRAG_THRESHOLD,
  type GuideBounds,
  type GuideOffset,
} from "../lib/guide-drag";
import "../draggable-guide.css";

type DragSession = {
  element: HTMLElement;
  pointerId: number;
  startX: number;
  startY: number;
  offset: GuideOffset;
  origin: GuideBounds;
  moved: boolean;
};

/** Pointer capture keeps mouse, pen and touch dragging attached to the whole guide. */
export function useDraggableGuide<T extends HTMLElement>(resetKey: string) {
  const ref = useRef<T>(null);
  const session = useRef<DragSession | null>(null);
  const position = useRef<GuideOffset>({ x: 0, y: 0 });
  const suppressClick = useRef(false);
  const [offset, setOffset] = useState<GuideOffset>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const stop = useCallback(() => {
    const active = session.current;
    session.current = null;
    if (active?.moved) suppressClick.current = true;
    if (active?.element.hasPointerCapture(active.pointerId)) {
      active.element.releasePointerCapture(active.pointerId);
    }
    setIsDragging(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    if (!position.current.x && !position.current.y) return;
    position.current = { x: 0, y: 0 };
    setOffset(position.current);
  }, [stop]);

  useEffect(() => {
    // Capture also covers scrolling inside a nested panel; wheel resets before smooth scroll starts.
    window.addEventListener("scroll", reset, { passive: true, capture: true });
    window.addEventListener("wheel", reset, { passive: true });
    window.addEventListener("resize", reset);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("scroll", reset, true);
      window.removeEventListener("wheel", reset);
      window.removeEventListener("resize", reset);
      window.removeEventListener("blur", reset);
      const active = session.current;
      session.current = null;
      if (active?.element.hasPointerCapture(active.pointerId)) {
        active.element.releasePointerCapture(active.pointerId);
      }
    };
  }, [reset]);

  useEffect(reset, [reset, resetKey]);

  const onPointerDown = (event: PointerEvent<T>) => {
    if (!event.isPrimary || event.button !== 0 || session.current) return;
    suppressClick.current = false;
    const rect = event.currentTarget.getBoundingClientRect();
    const current = position.current;
    session.current = {
      element: event.currentTarget,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offset: current,
      origin: {
        left: rect.left - current.x,
        right: rect.right - current.x,
        top: rect.top - current.y,
        bottom: rect.bottom - current.y,
      },
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<T>) => {
    const active = session.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const dx = event.clientX - active.startX;
    const dy = event.clientY - active.startY;
    if (!active.moved && Math.hypot(dx, dy) < GUIDE_DRAG_THRESHOLD) return;
    active.moved = true;
    suppressClick.current = true;
    setIsDragging(true);
    event.preventDefault();
    position.current = clampGuideOffset(
      active.origin,
      { x: active.offset.x + dx, y: active.offset.y + dy },
      { width: window.innerWidth, height: window.innerHeight },
    );
    setOffset(position.current);
  };

  const onClickCapture = (event: MouseEvent<T>) => {
    // Keyboard activation remains available. Releasing a drag must never open the chat.
    if (!suppressClick.current || event.detail === 0) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick.current = false;
  };

  return {
    isDragging,
    isMoved: Boolean(offset.x || offset.y),
    bindings: {
      ref,
      "data-draggable-guide": "true",
      "data-guide-dragging": isDragging,
      style: { translate: `${offset.x}px ${offset.y}px` },
      onPointerDown,
      onPointerMove,
      onPointerUp: stop,
      onPointerCancel: stop,
      onLostPointerCapture: stop,
      onClickCapture,
      onDragStart: (event: { preventDefault: () => void }) => event.preventDefault(),
    },
  };
}
