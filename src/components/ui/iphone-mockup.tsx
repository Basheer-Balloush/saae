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
          <div data-iphone-content style={contentStyle}>
            {children}
          </div>
          {showHomeIndicator && (
            <div
              aria-hidden
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
