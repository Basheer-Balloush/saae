import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type OverlayKind = "nav" | "assistant" | "sheet" | "dialog" | "lightbox";

export interface OverlayContextValue {
  active: OverlayKind | null;
  open: (kind: OverlayKind) => void;
  close: () => void;
  isOpen: (kind: OverlayKind) => boolean;
}

const OverlayContext = createContext<OverlayContextValue | null>(null);

export interface OverlayProviderProps {
  children: ReactNode;
}

export function OverlayProvider({ children }: OverlayProviderProps): ReactNode {
  const [active, setActive] = useState<OverlayKind | null>(null);

  const open = useCallback((kind: OverlayKind): void => {
    setActive(kind);
  }, []);

  const close = useCallback((): void => {
    setActive(null);
  }, []);

  const isOpen = useCallback(
    (kind: OverlayKind): boolean => active === kind,
    [active],
  );

  const locked = active !== null;

  useEffect(() => {
    if (typeof document === "undefined" || !locked) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        setActive(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [locked]);

  useEffect(() => {
    if (typeof document === "undefined" || !locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked]);

  const value = useMemo<OverlayContextValue>(
    () => ({ active, open, close, isOpen }),
    [active, open, close, isOpen],
  );

  return (
    <OverlayContext.Provider value={value}>
      <div data-overlay-active={active ?? "none"}>{children}</div>
    </OverlayContext.Provider>
  );
}

export function useOverlay(): OverlayContextValue {
  const context = useContext(OverlayContext);
  if (context === null) {
    throw new Error("useOverlay must be used within OverlayProvider");
  }
  return context;
}

export default OverlayProvider;
