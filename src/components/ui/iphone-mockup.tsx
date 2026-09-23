import type { CSSProperties, ReactNode } from "react";

type IPhoneModel = "14" | "14-pro" | "15" | "15-pro" | "x" | "plain";

export interface IPhoneMockupProps {
  model?: IPhoneModel;
  color?: string;
  orientation?: "portrait" | "landscape";
  scale?: number;
  bezel?: number;
  radius?: number;
  shadow?: boolean | string;
  screenBg?: string;
  wallpaper?: string;
  wallpaperFit?: "cover" | "contain" | "fill";
  wallpaperPosition?: string;
  showDynamicIsland?: boolean;
  showNotch?: boolean;
  islandWidth?: number;
  islandHeight?: number;
  islandRadius?: number;
  islandTop?: number;
  notchWidth?: number;
  notchHeight?: number;
  notchRadius?: number;
  safeArea?: boolean;
  safeAreaOverrides?: Partial<{ top: number; bottom: number; left: number; right: number }>;
  showHomeIndicator?: boolean;
  /** iOS status bar either side of the island: the time, then signal, Wi-Fi and battery. */
  statusBar?: boolean | { time?: string; top?: number; inset?: number; fontSize?: number };
  innerShadow?: boolean;
  style?: CSSProperties;
  className?: string;
  frameStyle?: CSSProperties;
  screenStyle?: CSSProperties;
  children?: ReactNode;
}

type DeviceSpec = {
  w: number;
  h: number;
  radius: number;
  bezel: number;
  topSafe: number;
  bottomSafe: number;
  notch?: { w: number; h: number; r: number };
  island?: { w: number; h: number; r: number };
};

const PRO_SPEC: DeviceSpec = {
  w: 393,
  h: 852,
  radius: 56,
  bezel: 12,
  topSafe: 59,
  bottomSafe: 34,
  island: { w: 126, h: 37, r: 20 },
};
const DEVICE_SPECS: Record<IPhoneModel, DeviceSpec> = {
  x: {
    w: 375,
    h: 812,
    radius: 50,
    bezel: 12,
    topSafe: 47,
    bottomSafe: 34,
    notch: { w: 210, h: 35, r: 18 },
  },
  "14": {
    w: 390,
    h: 844,
    radius: 56,
    bezel: 12,
    topSafe: 47,
    bottomSafe: 34,
    notch: { w: 225, h: 33, r: 18 },
  },
  "14-pro": PRO_SPEC,
  "15": PRO_SPEC,
  "15-pro": PRO_SPEC,
  plain: { w: 390, h: 844, radius: 56, bezel: 12, topSafe: 16, bottomSafe: 16 },
};
const PRESET_COLORS: Record<string, string> = {
  black: "#0b0b0d",
  midnight: "#0b0c10",
  silver: "#d7d8dc",
  starlight: "#f1eee9",
  "space-black": "#1c1e22",
  gold: "#f2dfb3",
  blue: "#2b4fa8",
  pink: "#ffbfd1",
  titanium: "#837a72",
  "natural-titanium": "#a69a8a",
  green: "#2b622e",
  red: "#c81f2f",
};

function shade(hex: string, percent: number) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!match) return hex;
  return `#${match
    .slice(1)
    .map((value) =>
      Math.max(0, Math.min(255, Math.round((parseInt(value, 16) * (100 + percent)) / 100)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function StatusBar({
  time = "9:41",
  top,
  height,
  inset = 22,
  fontSize = 11,
}: {
  time?: string;
  top: number;
  height: number;
  inset?: number;
  fontSize?: number;
}) {
  const icon = Math.round(fontSize * 0.95);
  return (
    <div
      aria-hidden
      dir="ltr"
      style={{
        position: "absolute",
        top,
        left: inset,
        right: inset,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        color: "#fff",
        fontFamily: '-apple-system, "SF Pro Text", system-ui, sans-serif',
        fontSize,
        fontWeight: 600,
        letterSpacing: "-0.01em",
        zIndex: 3,
        pointerEvents: "none",
      }}
    >
      <span style={{ minWidth: "3.2em", textAlign: "center" }}>{time}</span>
      <span style={{ display: "flex", alignItems: "center", gap: Math.round(icon * 0.3) }}>
        <svg width={icon * 1.15} height={icon * 0.72} viewBox="0 0 18 11" fill="currentColor">
          <rect x="0" y="7" width="3" height="4" rx="1" />
          <rect x="5" y="5" width="3" height="6" rx="1" />
          <rect x="10" y="2.5" width="3" height="8.5" rx="1" />
          <rect x="15" y="0" width="3" height="11" rx="1" />
        </svg>
        <svg width={icon * 1.05} height={icon * 0.76} viewBox="0 0 16 11.5" fill="currentColor">
          <path d="M8 2.3c2.3 0 4.4.9 6 2.4l1.2-1.2A10.2 10.2 0 0 0 8 .6C5.2.6 2.7 1.7.8 3.5L2 4.7a8.6 8.6 0 0 1 6-2.4Z" />
          <path d="M8 5.7c1.4 0 2.6.5 3.6 1.4l1.2-1.2A6.8 6.8 0 0 0 8 4c-1.9 0-3.5.7-4.8 1.9l1.2 1.2c1-.9 2.2-1.4 3.6-1.4Z" />
          <path d="M8 9.1c.5 0 1 .2 1.3.5L8 11 6.7 9.6c.3-.3.8-.5 1.3-.5Z" />
        </svg>
        <svg width={icon * 1.9} height={icon * 0.9} viewBox="0 0 27 13" fill="none">
          <rect
            x="0.5"
            y="0.5"
            width="23"
            height="12"
            rx="3.8"
            stroke="currentColor"
            strokeOpacity=".4"
          />
          <rect x="2" y="2" width="20" height="9" rx="2.5" fill="currentColor" />
          <path
            d="M25 4.5v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2Z"
            fill="currentColor"
            fillOpacity=".45"
          />
        </svg>
      </span>
    </div>
  );
}

export function IPhoneMockup({
  model = "14-pro",
  color = "space-black",
  orientation = "portrait",
  scale = 1,
  bezel,
  radius,
  shadow = true,
  screenBg = "#000",
  wallpaper,
  wallpaperFit = "cover",
  wallpaperPosition = "center",
  showDynamicIsland,
  showNotch,
  islandWidth,
  islandHeight,
  islandRadius,
  islandTop = 12,
  notchWidth,
  notchHeight,
  notchRadius,
  safeArea = true,
  safeAreaOverrides,
  showHomeIndicator = true,
  statusBar = false,
  innerShadow = true,
  style,
  className,
  frameStyle,
  screenStyle,
  children,
}: IPhoneMockupProps) {
  const spec = DEVICE_SPECS[model];
  const useIsland = showDynamicIsland ?? Boolean(spec.island);
  const useNotch = showNotch ?? (Boolean(spec.notch) && !useIsland);
  const resolvedRadius = radius ?? spec.radius;
  const resolvedBezel = bezel ?? spec.bezel;
  const landscape = orientation === "landscape";
  const screenWidth = landscape ? spec.h : spec.w;
  const screenHeight = landscape ? spec.w : spec.h;
  const colorHex = PRESET_COLORS[color] ?? color;
  const outerShadow =
    typeof shadow === "string"
      ? shadow
      : shadow
        ? "0 12px 30px rgba(0,0,0,.35), 0 2px 6px rgba(0,0,0,.22)"
        : "none";
  const finalIslandW = islandWidth ?? spec.island?.w ?? 0;
  const finalIslandH = islandHeight ?? spec.island?.h ?? 0;
  const finalNotchW = notchWidth ?? spec.notch?.w ?? 0;
  const finalNotchH = notchHeight ?? spec.notch?.h ?? 0;
  const cutoutCommon: CSSProperties = {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#000",
    zIndex: 2,
    boxShadow: "0 1px 2px rgba(0,0,0,.7)",
    pointerEvents: "none",
  };
  const contentStyle: CSSProperties = {
    position: "absolute",
    overflow: "hidden",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    top: safeArea ? (safeAreaOverrides?.top ?? spec.topSafe) : 0,
    bottom: safeArea ? (safeAreaOverrides?.bottom ?? spec.bottomSafe) : 0,
    left: safeArea ? (safeAreaOverrides?.left ?? 0) : 0,
    right: safeArea ? (safeAreaOverrides?.right ?? 0) : 0,
  };

  return (
    <div
      className={className}
      style={{
        boxSizing: "border-box",
        display: "inline-block",
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        ...style,
      }}
    >
      <div
        data-iphone-frame={model}
        style={{
          width: screenWidth + resolvedBezel * 2,
          height: screenHeight + resolvedBezel * 2,
          borderRadius: resolvedRadius + resolvedBezel,
          padding: resolvedBezel,
          background: `linear-gradient(135deg, ${shade(colorHex, 8)} 0%, ${colorHex} 40%, ${shade(colorHex, -14)} 100%)`,
          boxSizing: "border-box",
          boxShadow: outerShadow,
          position: "relative",
          overflow: "hidden",
          ...frameStyle,
        }}
      >
        <div
          data-iphone-screen
          style={{
            width: "100%",
            height: "100%",
            borderRadius: resolvedRadius,
            position: "relative",
            overflow: "hidden",
            background: screenBg,
            boxShadow: innerShadow
              ? "inset 0 0 0 1px rgba(255,255,255,.03), inset 0 10px 20px rgba(0,0,0,.35), inset 0 -8px 16px rgba(0,0,0,.28)"
              : "none",
            ...screenStyle,
          }}
        >
          {wallpaper && (
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url(${wallpaper})`,
                backgroundSize: wallpaperFit === "fill" ? "100% 100%" : wallpaperFit,
                backgroundPosition: wallpaperPosition,
                backgroundRepeat: "no-repeat",
                zIndex: 0,
              }}
            />
          )}
          {useIsland && finalIslandW > 0 && finalIslandH > 0 && (
            <div
              aria-hidden
              style={{
                ...cutoutCommon,
                top: islandTop,
                width: finalIslandW,
                height: finalIslandH,
                borderRadius: islandRadius ?? spec.island?.r ?? 0,
              }}
            />
          )}
          {!useIsland && useNotch && finalNotchW > 0 && finalNotchH > 0 && (
            <div
              aria-hidden
              style={{
                ...cutoutCommon,
                top: 8,
                width: finalNotchW,
                height: finalNotchH,
                borderRadius: notchRadius ?? spec.notch?.r ?? 0,
              }}
            />
          )}
          {statusBar && (
            <StatusBar
              {...(typeof statusBar === "object" ? statusBar : {})}
              top={(typeof statusBar === "object" ? statusBar.top : undefined) ?? islandTop}
              height={finalIslandH || 20}
            />
          )}
          <div data-iphone-content style={contentStyle}>
            {children}
          </div>
          {showHomeIndicator && (
            <div
              aria-hidden
              data-iphone-home-indicator
              style={{
                position: "absolute",
                bottom: 8,
                left: "50%",
                transform: "translateX(-50%)",
                width: Math.round(screenWidth * 0.34),
                maxWidth: 140,
                height: 5,
                borderRadius: 3,
                background: "linear-gradient(180deg, rgba(255,255,255,.7), rgba(255,255,255,.35))",
                opacity: 0.9,
                zIndex: 3,
                pointerEvents: "none",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default IPhoneMockup;
