import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  FinalizeUploadInputSchema,
  PrepareUploadInputSchema,
  SignedDownloadInputSchema,
  UpdateProfileInputSchema,
  PROFILE_BUCKET,
  ProfileFileKindSchema,
  detectMagicBytes,
  magicBytesMatchMime,
  validateFileAgainstKind,
  type FinalizeUploadInput,
  type PrepareUploadInput,
  type ProfileFileRow,
  type ProfileRow,
  type SignedDownloadInput,
  type UpdateProfileInput,
} from "@/lib/lms-profile";
import { z } from "zod";

// ---------- helpers (server-only, run inside handlers) ----------

function safeExtFromFilename(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return "";
  const ext = filename.slice(dot + 1).toLowerCase();
  if (!/^[a-z0-9]{1,8}$/.test(ext)) return "";
  return ext;
}

function extForKind(kind: "avatar" | "cv", mime: string): string {
  if (kind === "cv") return "pdf";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "bin";
}

function randomToken(): string {
  // 16 random bytes → 32 hex chars
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------- read / init ----------

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context as { supabase: any };
    const { data, error } = await supabase.rpc("lms_profile_get_or_init");
    if (error) throw new Error(error.message);
    return data as ProfileRow;
  });

// ---------- aggregated overview for the /profile page ----------

export type ProfileOverviewCourse = {
  id: string;
  title_ar: string;
  title_en: string | null;
  cover_url: string | null;
  slug: string | null;
  delivery_mode: string | null;
};

export type ProfileOverviewEnrollment = {
  id: string;
  course_id: string;
  progress: number;
  enrolled_at: string;
  completed_at: string | null;
};

export type ProfileOverviewCert = {
  id: string;
  serial: string;
  issued_at: string;
  course_id: string;
};

export type ProfileOverview = {
  profile: ProfileRow;
  email: string | null;
  enrollments: ProfileOverviewEnrollment[];
  certificates: ProfileOverviewCert[];
  courses: ProfileOverviewCourse[];
  attendance: {
    total: number;
    present: number;
    byCourse: Record<string, { total: number; present: number }>;
    linked: boolean;
  };
};

export const getMyProfileOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProfileOverview> => {
    const { supabase, userId, claims } = context as {
      supabase: any;
      userId: string;
      claims: { email?: string | null } | null;
    };

    const { data: profile, error: pErr } = await supabase.rpc("lms_profile_get_or_init");
    if (pErr) throw new Error(pErr.message);

    const [enrollRes, certRes] = await Promise.all([
      supabase
        .from("lms_enrollments")
        .select("id, course_id, progress, enrolled_at, completed_at")
        .eq("student_id", userId)
        .order("enrolled_at", { ascending: false }),
      supabase
        .from("lms_certificates")
        .select("id, serial, issued_at, course_id")
        .eq("student_id", userId)
        .order("issued_at", { ascending: false }),
    ]);

    const enrollments = (enrollRes.data ?? []) as ProfileOverviewEnrollment[];
    const certificates = (certRes.data ?? []) as ProfileOverviewCert[];

    const courseIds = Array.from(
      new Set([
        ...enrollments.map((e) => e.course_id),
        ...certificates.map((c) => c.course_id),
      ]),
    );

    let courses: ProfileOverviewCourse[] = [];
    if (courseIds.length) {
      const { data } = await supabase
        .from("lms_courses")
        .select("id, title_ar, title_en, cover_url, slug, delivery_mode")
        .in("id", courseIds);
      courses = (data ?? []) as ProfileOverviewCourse[];
    }

    const attendance = {
      total: 0,
      present: 0,
      byCourse: {} as Record<string, { total: number; present: number }>,
      linked: false,
    };
    const enrollmentIds = enrollments.map((e) => e.id);
    if (enrollmentIds.length) {
      const { data: regs } = await supabase
        .from("ams_registrants")
        .select("id, course_id, lms_enrollment_id")
        .in("lms_enrollment_id", enrollmentIds);
      const regRows = (regs ?? []) as {
        id: string;
        course_id: string;
        lms_enrollment_id: string | null;
      }[];
      if (regRows.length) {
        attendance.linked = true;
        const regIds = regRows.map((r) => r.id);
        const { data: att } = await supabase
          .from("ams_attendance")
          .select("registrant_id, present")
          .in("registrant_id", regIds);
        const regToCourse = new Map(regRows.map((r) => [r.id, r.course_id]));
        ((att ?? []) as { registrant_id: string; present: boolean }[]).forEach((a) => {
          attendance.total += 1;
          if (a.present) attendance.present += 1;
          const cid = regToCourse.get(a.registrant_id);
          if (cid) {
            const bucket = (attendance.byCourse[cid] ??= { total: 0, present: 0 });
            bucket.total += 1;
            if (a.present) bucket.present += 1;
          }
        });
      }
    }

    return {
      profile: profile as ProfileRow,
      email: claims?.email ?? null,
      enrollments,
      certificates,
      courses,
      attendance,
    };
  });

// ---------- update editable fields ----------

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateProfileInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context as { supabase: any };
    const input = data as UpdateProfileInput;
    const { data: row, error } = await supabase.rpc("lms_profile_update", {
      _full_name: input.full_name ?? null,
      _biography: input.biography ?? null,
      _organization: input.organization ?? null,
      _phone: input.phone ?? null,
      _locale: input.locale ?? null,
    });
    if (error) throw new Error(error.message);
    return row as ProfileRow;
  });

// ---------- prepare signed upload ----------

export const prepareProfileFileUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PrepareUploadInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    const input = data as PrepareUploadInput;

    const validation = validateFileAgainstKind(input.kind, input.mime, input.size);
    if (!validation.ok) {
      throw new Error(`file_rejected:${validation.reason}`);
    }

    // Ensure filename is representable & extension isn't smuggled
    const declaredExt = safeExtFromFilename(input.filename);
    const canonicalExt = extForKind(input.kind, input.mime);
    if (declaredExt && input.kind === "cv" && declaredExt !== "pdf") {
      throw new Error("file_rejected:cv_ext");
    }

    // Server-generated, unpredictable, user-scoped path
    const path = `${userId}/${input.kind}/${Date.now()}-${randomToken()}.${canonicalExt}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin
      .storage
      .from(PROFILE_BUCKET)
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message ?? "signed_upload_failed");

    return {
      bucket: PROFILE_BUCKET,
      path,
      token: signed.token,
      signed_url: signed.signedUrl,
      // Round-trip everything client → finalize
      kind: input.kind,
      mime: input.mime,
      size: input.size,
      original_filename: input.filename,
    };
  });

// ---------- finalize (server verifies object + magic bytes, then RPC inserts) ----------

export const finalizeProfileFileUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FinalizeUploadInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context as { userId: string; supabase: any };
    const input = data as FinalizeUploadInput;

    // Re-check declared caps
    const validation = validateFileAgainstKind(input.kind, input.mime, input.size);
    if (!validation.ok) throw new Error(`file_rejected:${validation.reason}`);

    // Path MUST be scoped to caller — RPC also checks this
    if (!input.path.startsWith(`${userId}/`)) {
      throw new Error("file_rejected:path_scope");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Confirm the object exists, matches declared size, and starts with expected magic bytes
    const { data: blob, error: dlErr } = await supabaseAdmin
      .storage
      .from(PROFILE_BUCKET)
      .download(input.path);
    if (dlErr || !blob) throw new Error("file_rejected:missing_object");

    if (blob.size !== input.size) {
      throw new Error("file_rejected:size_mismatch");
    }

    const head = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
    const detected = detectMagicBytes(head);
    if (!magicBytesMatchMime(input.kind, input.mime, detected)) {
      // Reject and remove the stray upload
      await supabaseAdmin.storage.from(PROFILE_BUCKET).remove([input.path]);
      throw new Error("file_rejected:magic_bytes");
    }

    // Persist immutable row + switch pointer transactionally
    const { data: row, error } = await supabase.rpc("lms_profile_finalize_file", {
      _kind: input.kind,
      _bucket: PROFILE_BUCKET,
      _path: input.path,
      _mime: input.mime,
      _size: input.size,
      _original_filename: input.original_filename,
    });
    if (error) {
      // Best-effort cleanup on RPC failure
      await supabaseAdmin.storage.from(PROFILE_BUCKET).remove([input.path]);
      throw new Error(error.message);
    }
    return row as ProfileFileRow;
  });

// ---------- clear pointer (safe: never deletes historical file rows) ----------

export const clearProfilePointer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ kind: ProfileFileKindSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context as { supabase: any };
    const { data: row, error } = await supabase.rpc("lms_profile_clear_pointer", {
      _kind: (data as { kind: "avatar" | "cv" }).kind,
    });
    if (error) throw new Error(error.message);
    return row as ProfileRow;
  });

// ---------- signed download URL (owner or LMS/global admin) ----------

export const getProfileFileSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SignedDownloadInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context as { supabase: any };
    const input = data as SignedDownloadInput;

    // Authorization + row lookup goes through the RPC (owner OR admin).
    const { data: fileRow, error } = await supabase.rpc("lms_profile_get_file", {
      _file_id: input.file_id,
    });
    if (error) throw new Error(error.message);
    const row = fileRow as ProfileFileRow;

    const ttl = Math.min(Math.max(input.expires_in ?? 60, 15), 300);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: signErr } = await supabaseAdmin
      .storage
      .from(row.bucket)
      .createSignedUrl(row.path, ttl, {
        download: row.original_filename ?? true,
      });
    if (signErr || !signed) throw new Error(signErr?.message ?? "sign_failed");

    return {
      signed_url: signed.signedUrl,
      expires_in: ttl,
      file: row,
    };
  });
