import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { adminInternshipsOverview } from "@/lib/lms-internships-admin.functions";

/* Everything that waits for an admin's decision, counted in one place so the
   sidebar badges, the admin home and the LMS overview always agree. */
export type ConsoleCounts = {
  instructorRequests: number;
  coursesToReview: number;
  enrollmentRequests: number;
  reviewsToModerate: number;
  trainerApplications: number;
  internshipApplications: number;
  chatFeedback: number;
  newLeads: number;
  newMessages: number;
};

export type CountKey = keyof ConsoleCounts;

const EMPTY: ConsoleCounts = {
  instructorRequests: 0,
  coursesToReview: 0,
  enrollmentRequests: 0,
  reviewsToModerate: 0,
  trainerApplications: 0,
  internshipApplications: 0,
  chatFeedback: 0,
  newLeads: 0,
  newMessages: 0,
};

export const CONSOLE_COUNTS_KEY = ["console-counts"] as const;

async function count(
  query: PromiseLike<{ count: number | null; error: unknown }>,
): Promise<number> {
  try {
    const { count: n, error } = await query;
    return error ? 0 : (n ?? 0);
  } catch {
    return 0;
  }
}

export function useConsoleCounts(enabled: boolean) {
  const overview = useServerFn(adminInternshipsOverview);
  return useQuery({
    queryKey: CONSOLE_COUNTS_KEY,
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    placeholderData: EMPTY,
    queryFn: async (): Promise<ConsoleCounts> => {
      const head = { count: "exact" as const, head: true };
      const [
        instructorRequests,
        coursesToReview,
        enrollmentRequests,
        reviewsToModerate,
        trainerApplications,
        chatFeedback,
        newLeads,
        newMessages,
        internships,
      ] = await Promise.all([
        count(supabase.from("lms_instructors").select("user_id", head).eq("approved", false)),
        count(supabase.from("lms_courses").select("id", head).eq("status", "pending")),
        count(supabase.from("lms_enrollment_requests").select("id", head).eq("status", "pending")),
        count(supabase.from("lms_reviews").select("id", head).eq("status", "pending")),
        count(
          supabase.from("trainer_applications").select("id", head).eq("status", "pending_review"),
        ),
        count(supabase.from("chat_feedback").select("id", head).eq("handled", false)),
        count(supabase.from("individual_leads").select("id", head).eq("status", "new")),
        count(supabase.from("contact_messages").select("id", head).eq("status", "new")),
        overview().catch(() => null),
      ]);
      return {
        instructorRequests,
        coursesToReview,
        enrollmentRequests,
        reviewsToModerate,
        trainerApplications,
        internshipApplications: internships?.applications?.pending_review ?? 0,
        chatFeedback,
        newLeads,
        newMessages,
      };
    },
  });
}
