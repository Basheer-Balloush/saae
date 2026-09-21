import { supabase } from "@/integrations/supabase/client";
import { compressImage, webpPath } from "@/lib/image-compress";

export type ProgressCb = (percent: number, loaded: number, total: number) => void;

export interface UploadArgs {
  bucket: string;
  path: string;
  file: File | Blob;
  upsert?: boolean;
  contentType?: string;
  onProgress?: ProgressCb;
  signal?: AbortSignal;
}

export interface UploadResult {
  path: string;
  publicUrl: string;
}

/**
 * Upload a file to Supabase Storage with real XHR upload progress.
 * `supabase.storage.upload()` cannot report progress; fetch has no browser
 * upload progress either — XMLHttpRequest is the only option.
 */
export async function uploadToSupabaseStorage(args: UploadArgs): Promise<UploadResult> {
  const { bucket, upsert = true, onProgress, signal } = args;

  // Shrink photographs here rather than at each call site, so every picture the
  // site serves — news, covers, avatars, logos — is stored at a sensible size.
  // compressImage returns the original whenever it cannot do better.
  const original = args.file;
  const file =
    original instanceof File && typeof (original as File).type === "string"
      ? await compressImage(original as File)
      : original;
  const compressed = file !== original;
  const path = compressed ? webpPath(args.path) : args.path;
  const contentType = compressed ? "image/webp" : args.contentType;

  const SUPABASE_URL =
    import.meta.env.VITE_SUPABASE_URL || (typeof process !== "undefined" ? process.env.SUPABASE_URL : undefined);
  const SUPABASE_KEY =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    (typeof process !== "undefined" ? process.env.SUPABASE_PUBLISHABLE_KEY : undefined);
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase env is not configured");

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token || SUPABASE_KEY;

  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const url = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`;

  onProgress?.(0, 0, file.size);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", SUPABASE_KEY);
    xhr.setRequestHeader("x-upsert", upsert ? "true" : "false");
    xhr.setRequestHeader("cache-control", "max-age=3600");
    if (contentType || (file as File).type) {
      xhr.setRequestHeader("content-type", contentType || (file as File).type);
    }

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const pct = Math.min(100, Math.round((e.loaded / e.total) * 100));
      onProgress?.(pct, e.loaded, e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100, file.size, file.size);
        resolve();
      } else {
        let msg = `Upload failed (${xhr.status})`;
        try {
          const body = JSON.parse(xhr.responseText);
          msg = body.message || body.error || msg;
        } catch {
          /* ignore */
        }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("Network error while uploading"));
    xhr.onabort = () => reject(new Error("Upload aborted"));

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.send(file);
  });

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, publicUrl: pub.publicUrl };
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
