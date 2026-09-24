import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createHash } from "crypto";
import { lessonStatusFromBunnyVideo, type LessonVideoStatus } from "@/lib/bunny-webhook-status";

/**
 * Bunny Stream integration.
 *
 * Server functions:
 *  - createBunnyUpload: instructor-only. Creates a Bunny video and returns TUS upload credentials.
 *  - getBunnyPlayback: any enrolled student. Returns a short-lived signed embed URL.
 *  - setLessonBunnyVideo / refreshBunnyLessonStatus: instructor-only bookkeeping.
 *
 * Secrets (all server-only):
 *   BUNNY_STREAM_LIBRARY_ID         upload, status, playback
 *   BUNNY_STREAM_API_KEY            upload, status (the library's Stream API key)
 *   BUNNY_STREAM_TOKEN_KEY          playback (Token Authentication Key from Library security settings)
 *
 * Errors that the instructor page must explain carry a `bunny_…` prefix; see
 * `bunnyErrorMessage` in `bunny-errors.ts`.
 */

type BunnySecret = "BUNNY_STREAM_LIBRARY_ID" | "BUNNY_STREAM_API_KEY" | "BUNNY_STREAM_TOKEN_KEY";

// Values pasted into a secrets UI often carry a trailing newline or space,
// which silently breaks both the AccessKey header and the SHA-256 signatures.
function readBunnySecrets<K extends BunnySecret>(names: K[]): Record<K, string> {
  const out = {} as Record<K, string>;
  const missing: string[] = [];
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) out[name] = value;
    else missing.push(name);
  }
  if (missing.length) {
    console.error("[Bunny] missing secrets:", missing.join(", "));
    throw new Error(`bunny_not_configured: ${missing.join(", ")}`);
  }
  return out;
}

function getBunnyApiEnv() {
  const env = readBunnySecrets(["BUNNY_STREAM_LIBRARY_ID", "BUNNY_STREAM_API_KEY"]);
  return { libraryId: env.BUNNY_STREAM_LIBRARY_ID, apiKey: env.BUNNY_STREAM_API_KEY };
}

function getBunnyPlaybackEnv() {
  const env = readBunnySecrets(["BUNNY_STREAM_LIBRARY_ID", "BUNNY_STREAM_TOKEN_KEY"]);
  return { libraryId: env.BUNNY_STREAM_LIBRARY_ID, tokenKey: env.BUNNY_STREAM_TOKEN_KEY };
}

async function fetchBunnyVideoStatus(libraryId: string, apiKey: string, videoId: string): Promise<LessonVideoStatus> {
  const res = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`, {
    headers: { AccessKey: apiKey, Accept: "application/json" },
  });
  if (!res.ok) {
    console.error("[Bunny] get video failed", res.status, await res.text());
    throw new Error(`bunny_api_error: get video HTTP ${res.status}`);
  }
  const body = (await res.json()) as { status?: number };
  return lessonStatusFromBunnyVideo(body.status);
}

/**
 * Instructor-only: create a Bunny video object and return TUS upload credentials.
 * The client uploads the file bytes directly to Bunny via tus-js-client.
 */
export const createBunnyUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        lessonId: z.string().uuid(),
        title: z.string().min(1).max(255),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { libraryId, apiKey } = getBunnyApiEnv();

    // Verify the user is the instructor of this lesson's course (or an admin).
    const { data: lesson, error: lessonErr } = await supabase
      .from("lms_lessons")
      .select("id, section_id, lms_sections!inner(course_id, lms_courses!inner(instructor_id))")
      .eq("id", data.lessonId)
      .maybeSingle();
    if (lessonErr || !lesson) throw new Error("Lesson not found");

    const instructorId =
      (lesson as unknown as { lms_sections: { lms_courses: { instructor_id: string } } })
        .lms_sections?.lms_courses?.instructor_id;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (roles ?? []).some(
      (r) => r.role === "lms_admin" || r.role === "admin",
    );

    if (!isAdmin && instructorId !== userId) {
      throw new Error("Forbidden: you do not own this lesson");
    }

    // 1) Create the video object on Bunny.
    const createRes = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos`,
      {
        method: "POST",
        headers: {
          AccessKey: apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ title: data.title }),
      },
    );
    if (!createRes.ok) {
      const txt = await createRes.text();
      console.error("[Bunny] create video failed", createRes.status, txt);
      // 401 = wrong API key (the account key is not the library key),
      // 404 = wrong library id.
      throw new Error(`bunny_api_error: create video HTTP ${createRes.status}`);
    }
    const created = (await createRes.json()) as { guid?: string };
    const videoId = created.guid;
    if (!videoId) {
      console.error("[Bunny] create video returned no guid", created);
      throw new Error("bunny_api_error: create video returned no guid");
    }

    // 2) Build TUS authorization signature.
    //    signature = sha256(libraryId + apiKey + expirationTime + videoId)
    const expirationTime = Math.floor(Date.now() / 1000) + 60 * 60 * 6; // 6h window for upload
    const sigInput = `${libraryId}${apiKey}${expirationTime}${videoId}`;
    const authorizationSignature = createHash("sha256")
      .update(sigInput)
      .digest("hex");

    return {
      videoId,
      libraryId,
      tusEndpoint: "https://video.bunnycdn.com/tusupload",
      authorizationSignature,
      authorizationExpire: expirationTime,
    };
  });

/**
 * Authenticated: return a short-lived signed Bunny embed URL for the lesson's video.
 * Requires the student to be enrolled in the course (or be the instructor / admin).
 */
export const getBunnyPlayback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ lessonId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { libraryId, tokenKey } = getBunnyPlaybackEnv();

    // Load the lesson + course context.
    const { data: lesson, error } = await supabase
      .from("lms_lessons")
      .select(
        "id, video_provider, video_uid, video_status, lms_sections!inner(course_id, lms_courses!inner(instructor_id))",
      )
      .eq("id", data.lessonId)
      .maybeSingle();
    if (error || !lesson) throw new Error("Lesson not found");

    const l = lesson as unknown as {
      video_provider: string;
      video_uid: string | null;
      video_status: string;
      lms_sections: {
        course_id: string;
        lms_courses: { instructor_id: string };
      };
    };

    if (l.video_provider !== "bunny" || !l.video_uid) {
      throw new Error("This lesson is not a Bunny video");
    }

    // Authorization: admin OR instructor of the course OR active enrolled student.
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (roles ?? []).some(
      (r) => r.role === "lms_admin" || r.role === "admin",
    );
    const isInstructor = l.lms_sections.lms_courses.instructor_id === userId;

    if (!isAdmin && !isInstructor) {
      const { data: enr } = await supabase
        .from("lms_enrollments")
        .select("id")
        .eq("student_id", userId)
        .eq("course_id", l.lms_sections.course_id)
        .maybeSingle();
      if (!enr) throw new Error("Forbidden: not enrolled");
    }

    // The webhook can be missing or late. Before telling the viewer the video
    // is still processing, ask Bunny, and record a finished encode so the
    // next viewer does not have to.
    if (l.video_status !== "ready") {
      let status: LessonVideoStatus = l.video_status === "failed" ? "failed" : "processing";
      try {
        const { apiKey } = getBunnyApiEnv();
        status = await fetchBunnyVideoStatus(libraryId, apiKey, l.video_uid);
      } catch (e) {
        console.error("[Bunny] playback status check failed", e);
      }
      if (status !== "ready") return { status, playbackUrl: null, expires: null };
      // Students cannot update lessons under RLS; the service role write is
      // limited to this lesson and the identifier we just verified.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: upErr } = await supabaseAdmin
        .from("lms_lessons")
        .update({ video_status: "ready", video_ready: true, video_status_error: null })
        .eq("id", data.lessonId)
        .eq("video_uid", l.video_uid);
      if (upErr) console.error("[Bunny] could not record ready status", upErr.message);
    }

    // Bunny Stream embed token authentication. Direct HLS URLs are blocked when
    // "Block direct url file access" is enabled, so students must use the
    // secure iframe player instead of the raw CDN playlist.
    const expires = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour
    const token = createHash("sha256")
      .update(tokenKey + l.video_uid + expires)
      .digest("hex");

    const playbackUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${l.video_uid}?token=${token}&expires=${expires}`;
    return { status: "ready" as const, playbackUrl, expires };
  });

/**
 * Instructor/admin: mark the lesson as ready and store the Bunny video metadata
 * once the TUS upload finishes on the client. Optimistic — Bunny will encode
 * over the next few minutes; HLS playlist becomes available shortly after.
 */
export const setLessonBunnyVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        lessonId: z.string().uuid(),
        videoId: z.string().min(1).max(128),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: lesson, error } = await supabase
      .from("lms_lessons")
      .select(
        "id, lms_sections!inner(lms_courses!inner(instructor_id))",
      )
      .eq("id", data.lessonId)
      .maybeSingle();
    if (error || !lesson) throw new Error("Lesson not found");

    const instructorId =
      (lesson as unknown as { lms_sections: { lms_courses: { instructor_id: string } } })
        .lms_sections.lms_courses.instructor_id;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (roles ?? []).some(
      (r) => r.role === "lms_admin" || r.role === "admin",
    );

    if (!isAdmin && instructorId !== userId) {
      throw new Error("Forbidden");
    }

    // Phase 6: mark as processing (not ready). The trigger resets status when
    // video_uid changes; we explicitly set it here so the initial insert path
    // for a lesson with a fresh guid is also honest about readiness.
    const { error: upErr } = await supabase
      .from("lms_lessons")
      .update({
        video_provider: "bunny",
        video_uid: data.videoId,
        video_ready: false,
        video_status: "processing",
        video_status_error: null,
        video_url: null,
      })
      .eq("id", data.lessonId);
    if (upErr) throw new Error(upErr.message);

    return { ok: true, status: "processing" as const };
  });

/**
 * Phase 6: instructor/admin can ask the server to re-check a lesson's video
 * status directly from Bunny — recovery path when the webhook is missed.
 */
export const refreshBunnyLessonStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ lessonId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { libraryId, apiKey } = getBunnyApiEnv();

    const { data: lesson, error } = await supabase
      .from("lms_lessons")
      .select("id, video_provider, video_uid, video_status, lms_sections!inner(lms_courses!inner(instructor_id))")
      .eq("id", data.lessonId)
      .maybeSingle();
    if (error || !lesson) throw new Error("Lesson not found");

    const l = lesson as unknown as {
      video_provider: string;
      video_uid: string | null;
      video_status: string;
      lms_sections: { lms_courses: { instructor_id: string } };
    };

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "lms_admin" || r.role === "admin");
    const isInstructor = l.lms_sections.lms_courses.instructor_id === userId;
    if (!isAdmin && !isInstructor) throw new Error("Forbidden");

    if (l.video_provider !== "bunny" || !l.video_uid) {
      return { status: l.video_status, changed: false };
    }

    const s = await fetchBunnyVideoStatus(libraryId, apiKey, l.video_uid);

    // Guard against stale identifiers: only update the row that still matches.
    const { data: updated, error: upErr } = await supabase
      .from("lms_lessons")
      .update({ video_status: s, video_ready: s === "ready", video_status_error: null })
      .eq("id", data.lessonId)
      .eq("video_uid", l.video_uid)
      .select("id")
      .maybeSingle();
    if (upErr) throw new Error(upErr.message);

    return { status: s, changed: !!updated };
  });
