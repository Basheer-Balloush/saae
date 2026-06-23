import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FlipCard({
  front,
  back,
  className,
}: {
  front: ReactNode;
  back: ReactNode;
  className?: string;
}) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setFlipped((v) => !v)}
      className={cn(
        "group relative w-full h-80 sm:h-96 [perspective:1200px] outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-3xl",
        className,
      )}
      aria-pressed={flipped}
    >
      <div
        className={cn(
          "relative h-full w-full transition-transform duration-700 [transform-style:preserve-3d]",
          flipped ? "[transform:rotateY(180deg)]" : "",
        )}
      >
        <div className="absolute inset-0 [backface-visibility:hidden] rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-8 shadow-soft flex flex-col items-center justify-center gap-4 text-center">
          {front}
          <span className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
            انقر للقلب · Tap to flip
          </span>
        </div>
        <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden] rounded-3xl border border-primary/30 bg-card p-6 sm:p-8 shadow-lg overflow-y-auto text-start">
          {back}
        </div>
      </div>
    </button>
  );
}
