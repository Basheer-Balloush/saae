import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PublicInternshipDetail } from "@/lib/lms-internships-public.functions";
import type { ProfileRow, ProfileFileRow } from "@/lib/lms-profile";
import type { Database } from "@/integrations/supabase/types";

export type MyApplicationRow = {
  id: string;
  opportunity_id: string;
  opportunity_slug: string;
  opportunity_title_ar: string;
  opportunity_title_en: string | null;
  status: Database["public"]["Enums"]["internship_application_status"];
  attempt_number: number;
  submitted_at: string;
  withdrawn_at: string | null;
};

export type ApplyContextCourse = {
  id: string;
  title_ar: string;
  title_en: string | null;
  progress: number;
  completed: boolean;
  enrolled_at: string;
};

export type ApplyContextCert = {
  id: string;
  serial: string;
  issued_at: string;
  course_title_ar: string | null;
  course_title_en: string | null;
};

export type ApplyContext = {
  opportunity: PublicInternshipDetail;
  profile: ProfileRow;
  email: string | null;
  cv: Pick<ProfileFileRow, "id" | "original_filename" | "size_bytes" | "created_at"> | null;
  courses: ApplyContextCourse[];
  certificates: ApplyContextCert[];
  missing_required_profile_fields: string[];
  cv_missing: boolean;
  existing_application: {
    id: string;
    status: MyApplicationRow["status"];
    attempt_number: number;
    submitted_at: string;
  } | null;
  can_apply: boolean;
  block_reason:
    | null
    | "not_open"
    | "not_open_yet"
    | "deadline_passed"
    | "duplicate"
    | "active_application"
    | "profile_incomplete";
};

const SlugSchema = z.object({ slug: z.string().trim().min(3).max(80) });

export const getInternshipApplyContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SlugSchema.parse(input))
  .handler(async ({ data, context }): Promise<ApplyContext> => {
    const { supabase, userId, claims } = context as {
      supabase: any;
      userId: string;
      claims: { email?: string | null } | null;
    };

    const opp = (await getPublicInternshipBySlug({
      data: { slug: data.slug },
    })) as PublicInternshipDetail | null;
    if (!opp) throw new Error("opportunity_not_found");

    const { data: profile, error: pErr } = await supabase.rpc("lms_profile_get_or_init");
    if (pErr) throw new Error(pErr.message);
    const p = profile as ProfileRow;

    // CV row
    let cv: ApplyContext["cv"] = null;
    if (p.cv_file_id) {
      const { data: cvRow } = await supabase
        .from("lms_profile_files")
        .select("id, original_filename, size_bytes, created_at")
        .eq("id", p.cv_file_id)
        .maybeSingle();
      cv = (cvRow as any) ?? null;
    }

    // Enrollments + courses
    const { data: enrolls } = await supabase
      .from("lms_enrollments")
      .select("id, course_id, progress, enrolled_at, completed_at")
      .eq("student_id", userId);
    const enrollments = (enrolls ?? []) as {
      id: string;
      course_id: string;
      progress: number | null;
      enrolled_at: string;
      completed_at: string | null;
    }[];
    let courses: ApplyContextCourse[] = [];
    if (enrollments.length) {
      const { data: cRows } = await supabase
        .from("lms_courses")
        .select("id, title_ar, title_en")
        .in(
          "id",
          enrollments.map((e) => e.course_id),
        );
      const byId = new Map(((cRows ?? []) as any[]).map((c) => [c.id, c]));
      courses = enrollments.map((e) => {
        const c = byId.get(e.course_id);
        const prog = Number(e.progress ?? 0);
        return {
          id: e.course_id,
          title_ar: c?.title_ar ?? "",
          title_en: c?.title_en ?? null,
          progress: prog,
          completed: prog >= 100 || !!e.completed_at,
          enrolled_at: e.enrolled_at,
        };
      });
    }

    // Certificates
    const { data: certs } = await supabase
      .from("lms_certificates")
      .select("id, serial, issued_at, course_id")
      .eq("student_id", userId);
    const certRows = (certs ?? []) as {
      id: string;
      serial: string;
      issued_at: string;
      course_id: string;
    }[];
    let certificates: ApplyContextCert[] = [];
    if (certRows.length) {
      const { data: cRows } = await supabase
        .from("lms_courses")
        .select("id, title_ar, title_en")
        .in("id", certRows.map((c) => c.course_id));
      const byId = new Map(((cRows ?? []) as any[]).map((c) => [c.id, c]));
      certificates = certRows.map((c) => ({
        id: c.id,
        serial: c.serial,
        issued_at: c.issued_at,
        course_title_ar: byId.get(c.course_id)?.title_ar ?? null,
        course_title_en: byId.get(c.course_id)?.title_en ?? null,
      }));
    }

    // Existing application (latest)
    const { data: existing } = await supabase
      .from("internship_applications")
      .select("id, status, attempt_number, submitted_at")
      .eq("opportunity_id", opp.id)
      .eq("user_id", userId)
      .order("attempt_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const existing_application = (existing as any) ?? null;

    // Required profile fields
    const missing: string[] = [];
    for (const f of opp.required_profile_fields) {
      if (f === "full_name" && !p.full_name?.trim()) missing.push("full_name");
      else if (f === "phone" && !p.phone?.trim()) missing.push("phone");
      else if (f === "biography" && !p.biography?.trim()) missing.push("biography");
      else if (f === "organization" && !p.organization?.trim()) missing.push("organization");
      else if (f === "avatar" && !p.avatar_file_id) missing.push("avatar");
    }
    const cv_missing = opp.require_cv && !p.cv_file_id;

    // Block reason
    let block_reason: ApplyContext["block_reason"] = null;
    const now = Date.now();
    if (opp.status !== "published") block_reason = "not_open";
    else if (opp.opens_at && new Date(opp.opens_at).getTime() > now)
      block_reason = "not_open_yet";
    else if (opp.deadline_at && new Date(opp.deadline_at).getTime() < now)
      block_reason = "deadline_passed";
    else if (existing_application) {
      if (!opp.allow_reapply) block_reason = "duplicate";
      else if (!["withdrawn", "rejected"].includes(existing_application.status))
        block_reason = "active_application";
    }
    if (!block_reason && (missing.length || cv_missing)) block_reason = "profile_incomplete";

    return {
      opportunity: opp,
      profile: p,
      email: claims?.email ?? null,
      cv,
      courses,
      certificates,
      missing_required_profile_fields: missing,
      cv_missing,
      existing_application,
      can_apply: block_reason === null,
      block_reason,
    };
  });

const AnswerSchema = z.object({
  question_id: z.string().uuid(),
  answer_text: z.string().max(10000).optional().nullable(),
  answer_json: z.any().optional().nullable(),
});

const SubmitSchema = z.object({
  opportunity_id: z.string().uuid(),
  answers: z.array(AnswerSchema).max(50).default([]),
});

export const submitInternshipApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SubmitSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context as { supabase: any };
    const { data: appId, error } = await supabase.rpc("submit_internship_application", {
      _opportunity_id: data.opportunity_id,
      _answers: data.answers,
    });
    if (error) throw new Error(error.message);
    return { id: appId as string };
  });

export const withdrawInternshipApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ application_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context as { supabase: any };
    const { error } = await supabase.rpc("withdraw_internship_application", {
      _application_id: data.application_id,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listMyInternshipApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyApplicationRow[]> => {
    const { supabase } = context as { supabase: any };
    const { data, error } = await supabase.rpc("list_my_internship_applications");
    if (error) throw new Error(error.message);
    return (data ?? []) as MyApplicationRow[];
  });

// Map RPC error strings to user-facing localized keys.
export function mapApplyError(err: unknown, lang: "ar" | "en"): string {
  const raw = err instanceof Error ? err.message : String(err);
  const code = raw.split(":")[0]?.trim() ?? raw;
  const table: Record<string, { ar: string; en: string }> = {
    unauthorized: {
      ar: "سجّل الدخول للتقديم",
      en: "Please sign in to apply",
    },
    opportunity_not_found: {
      ar: "الفرصة غير متاحة",
      en: "Opportunity not available",
    },
    opportunity_not_open: {
      ar: "التقديم مغلق",
      en: "Applications are closed",
    },
    opportunity_not_open_yet: {
      ar: "لم يُفتح التقديم بعد",
      en: "Applications are not open yet",
    },
    opportunity_deadline_passed: {
      ar: "انقضى الموعد النهائي للتقديم",
      en: "The application deadline has passed",
    },
    opportunity_full: {
      ar: "اكتملت السّعة",
      en: "This opportunity is full",
    },
    duplicate_application: {
      ar: "لديك طلب سابق على هذه الفرصة",
      en: "You already have an application for this opportunity",
    },
    active_application_exists: {
      ar: "لديك طلب فعّال بالفعل",
      en: "You already have an active application",
    },
    profile_incomplete: {
      ar: "أكمل ملفّك الشخصي قبل التقديم",
      en: "Complete your profile before applying",
    },
    question_required: {
      ar: "بعض الأسئلة المطلوبة فارغة",
      en: "Please answer all required questions",
    },
    application_not_found: {
      ar: "الطلب غير موجود",
      en: "Application not found",
    },
    withdraw_not_allowed: {
      ar: "لا يمكن سحب الطلب في حالته الحالية",
      en: "Application cannot be withdrawn in its current status",
    },
  };
  return table[code]?.[lang] ?? raw;
}
