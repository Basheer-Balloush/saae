import { useEffect, useState } from "react";

export interface SafeAreaInsets {
  top: number;
  bottom: number;
}

function parsePx(value: string): number {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function readVarInset(name: string): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return 0;
  return parsePx(raw);
}

function readEnvInset(): SafeAreaInsets {
  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.position = "fixed";
  probe.style.visibility = "hidden";
  probe.style.paddingTop = "env(safe-area-inset-top, 0px)";
  probe.style.paddingBottom = "env(safe-area-inset-bottom, 0px)";
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe);
  const insets: SafeAreaInsets = {
    top: parsePx(computed.paddingTop),
    bottom: parsePx(computed.paddingBottom),
  };
  probe.remove();
  return insets;
}

function readSafeArea(): SafeAreaInsets {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { top: 0, bottom: 0 };
  }
  if (!document.body) {
    return { top: 0, bottom: 0 };
  }
  const varTop = readVarInset("--safe-area-inset-top");
  const varBottom = readVarInset("--safe-area-inset-bottom");
  const env = readEnvInset();
  return {
    top: varTop > 0 ? varTop : env.top,
    bottom: varBottom > 0 ? varBottom : env.bottom,
  };
}

export function useSafeArea(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>({ top: 0, bottom: 0 });

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    setInsets(readSafeArea());
    const onChange = (): void => {
      setInsets(readSafeArea());
    };
    window.addEventListener("resize", onChange);
    window.addEventListener("orientationchange", onChange);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
    };
  }, []);

  return insets;
}

export default useSafeArea;
