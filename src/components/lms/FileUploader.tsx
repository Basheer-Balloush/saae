import { useRef, useState } from "react";
import { Upload, X, FileIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { uploadToSupabaseStorage } from "@/lib/upload-with-progress";
import { UploadProgress } from "@/components/ui/upload-progress";

const ALLOWED_EXTS = ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "zip", "rar", "7z", "txt", "md", "png", "jpg", "jpeg", "webp"];
const MAX_BYTES = 25 * 1024 * 1024; // 25MB

export interface FileUploaderProps {
  bucket: string;
  /** Folder path WITHOUT trailing slash, e.g. "brief/<assignmentId>" or "submissions/<assignmentId>/<studentId>" */
  pathPrefix: string;
  /** Current file path stored (so we can show it), null if none yet */
  currentPath?: string | null;
  /** Called with new path after successful upload */
  onUploaded: (path: string) => void | Promise<void>;
  /** Optional: called after current file is removed */
  onRemoved?: () => void | Promise<void>;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function FileUploader({
  bucket,
  pathPrefix,
  currentPath,
  onUploaded,
  onRemoved,
  disabled,
  label = "Upload file",
  className,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<{ pct: number; loaded: number; total: number; name: string } | null>(null);

  const currentName = currentPath ? currentPath.split("/").pop() : null;

  const handlePick = () => inputRef.current?.click();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // reset for re-upload of same name
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTS.includes(ext)) {
      toast.error(`Unsupported file type: .${ext}`);
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("File too large (max 25MB)");
      return;
    }
    setUploading(true);
    setProgress({ pct: 0, loaded: 0, total: file.size, name: file.name });
    try {
      const safeName = `${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const fullPath = `${pathPrefix.replace(/\/+$/, "")}/${safeName}`;
      await uploadToSupabaseStorage({
        bucket,
        path: fullPath,
        file,
        upsert: true,
        contentType: file.type || undefined,
        onProgress: (pct, loaded, total) =>
          setProgress({ pct, loaded, total, name: file.name }),
      });
      // Best-effort: remove previous file if it had the same prefix and a different name
      if (currentPath && currentPath !== fullPath) {
        await supabase.storage.from(bucket).remove([currentPath]).catch(() => {});
      }
      await onUploaded(fullPath);
      toast.success("Uploaded");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const handleDownload = async () => {
    if (!currentPath) return;
    setDownloading(true);
    try {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(currentPath, 60 * 10);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to open file";
      toast.error(msg);
    } finally {
      setDownloading(false);
    }
  };

  const handleRemove = async () => {
    if (!currentPath || !onRemoved) return;
    if (!confirm("Remove this file?")) return;
    await supabase.storage.from(bucket).remove([currentPath]).catch(() => {});
    await onRemoved();
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ALLOWED_EXTS.map((e) => `.${e}`).join(",")}
          onChange={handleChange}
          disabled={disabled || uploading}
        />
        {currentPath ? (
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-border bg-muted/40 hover:bg-muted text-foreground max-w-[260px] truncate"
            title={currentName ?? undefined}
          >
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileIcon className="h-3.5 w-3.5" />}
            <span className="truncate">{currentName}</span>
          </button>
        ) : null}
        <Button type="button" size="sm" variant="outline" onClick={handlePick} disabled={disabled || uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin mx-1" /> : <Upload className="h-4 w-4 mx-1" />}
          {label}
        </Button>
        {currentPath && onRemoved && (
          <Button type="button" size="sm" variant="ghost" onClick={handleRemove} disabled={disabled || uploading}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {progress && (
        <UploadProgress
          percent={progress.pct}
          loaded={progress.loaded}
          total={progress.total}
          label={progress.name}
        />
      )}
    </div>
  );
}
