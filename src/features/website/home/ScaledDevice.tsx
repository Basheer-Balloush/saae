import { useEffect, useRef, useState, type ReactNode } from "react";

/* Lays its child out at one fixed design size and scales the whole thing to
   the width it is given. The FAQ phone's text, notch and padding are sized in
   pixels; laid out at whatever width a phone's screen leaves, the question
   ran under the notch and off the bottom on shorter screens. Scaled instead,
   it is the same picture on every phone, only larger or smaller. */
export function ScaledDevice({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children: ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const sync = () => {
      const w = box.clientWidth;
      if (w) setScale(w / width);
    };
    sync();
    if (typeof ResizeObserver === "undefined") return;
    const sizes = new ResizeObserver(sync);
    sizes.observe(box);
    return () => sizes.disconnect();
  }, [width]);

  return (
    <div
      ref={boxRef}
      className="mh-scaled-device"
      style={{ position: "relative", width: "100%", aspectRatio: `${width} / ${height}` }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: "0 0",
        }}
      >
        {children}
      </div>
    </div>
  );
}
