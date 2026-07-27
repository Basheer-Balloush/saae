import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createHash } from "crypto";

/**
 * Bunny Stream integration.
 *
 * Two server functions:
 *  - createBunnyUpload: instructor-only. Creates a Bunny video and returns TUS upload credentials.
 *  - getBunnyPlayback: any enrolled student. Returns a short-lived signed embed URL.
 *
 * Secrets required (all server-only):
 *   BUNNY_STREAM_LIBRARY_ID
 *   BUNNY_STREAM_API_KEY
 *   BUNNY_STREAM_CDN_HOSTNAME       (e.g. vz-abc123-xyz.b-cdn.net)
 *   BUNNY_STREAM_TOKEN_KEY          (Token Authentication Key from Library security settings)
 */

function getBunnyEnv() {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey = process.env.BUNNY_STREAM_API_KEY;
  const cdnHostname = process.env.BUNNY_STREAM_CDN_HOSTNAME;
  const tokenKey = process.env.BUNNY_STREAM_TOKEN_KEY;
  if (!libraryId || !apiKey || !cdnHostname || !tokenKey) {
    throw new Error("Bunny Stream is not configured (missing secrets)");
  }
  return { libraryId, apiKey, cdnHostname, tokenKey };
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
    const { libraryId, apiKey } = getBunnyEnv();

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
      throw new Error("Failed to create Bunny video");
    }
    const created = (await createRes.json()) as { guid: string };
    const videoId = created.guid;

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
    const { libraryId, tokenKey } = getBunnyEnv();

    // Load the lesson + course context.
    const { data: lesson, error } = await supabase
      .from("lms_lessons")
      .select(
        "id, video_provider, video_uid, lms_sections!inner(course_id, lms_courses!inner(instructor_id))",
      )
      .eq("id", data.lessonId)
      .maybeSingle();
    if (error || !lesson) throw new Error("Lesson not found");

    const l = lesson as unknown as {
      video_provider: string;
      video_uid: string | null;
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

    // Bunny Stream embed token authentication. Direct HLS URLs are blocked when
    // "Block direct url file access" is enabled, so students must use the
    // secure iframe player instead of the raw CDN playlist.
    const expires = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour
    const token = createHash("sha256")
      .update(tokenKey + l.video_uid + expires)
      .digest("hex");

    const playbackUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${l.video_uid}?token=${token}&expires=${expires}`;
    return { playbackUrl, expires };
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
    const { libraryId, apiKey } = getBunnyEnv();

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

    const res = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${l.video_uid}`, {
      headers: { AccessKey: apiKey, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Bunny fetch failed (${res.status})`);
    const body = (await res.json()) as { status?: number; guid?: string };

    // Bunny status codes: 0 Created, 1 Uploaded, 2 Processing, 3 Transcoding,
    // 4 Finished, 5 Error, 6 UploadFailed, 7 JitSegmenting, 8 JitPlaylistsCreated.
    const s =
      body.status === 4 || body.status === 8
        ? "ready"
        : body.status === 5 || body.status === 6
          ? "failed"
          : "processing";

    // Guard against stale identifiers: only update the row that still matches.
    const { data: updated, error: upErr } = await supabase
      .from("lms_lessons")
      .update({ video_status: s, video_ready: s === "ready" })
      .eq("id", data.lessonId)
      .eq("video_uid", l.video_uid)
      .select("id")
      .maybeSingle();
    if (upErr) throw new Error(upErr.message);

    return { status: s, changed: !!updated };
  });
