import { formatBytes } from "@/lib/upload-with-progress";
import { cn } from "@/lib/utils";

export interface UploadProgressProps {
  percent: number;
  loaded?: number;
  total?: number;
  label?: string;
  className?: string;
  compact?: boolean;
}

/**
 * Real-percentage upload progress bar. Pair with uploadToSupabaseStorage.
 */
export function UploadProgress({
  percent,
  loaded,
  total,
  label,
  className,
  compact = false,
}: UploadProgressProps) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className={cn("w-full", className)} dir="ltr">
      <div className="flex items-center justify-between gap-2 mb-1 text-xs">
        <span className="text-muted-foreground truncate max-w-[70%]" title={label}>
          {label ?? "Uploading…"}
        </span>
        <span className="tabular-nums font-medium text-foreground">{pct}%</span>
      </div>
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-muted",
          compact ? "h-1.5" : "h-2",
        )}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {total !== undefined && loaded !== undefined && !compact && (
        <div className="mt-1 text-[11px] text-muted-foreground tabular-nums">
          {formatBytes(loaded)} / {formatBytes(total)}
        </div>
      )}
    </div>
  );
}
