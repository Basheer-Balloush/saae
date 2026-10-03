import { describe, expect, it } from "vitest";
import {
  courseList,
  internshipStatus,
  isPlausiblePhone,
  registrationStatus,
  toCourseDetails,
  toInitiativeStatus,
  toInternship,
  toNewsList,
  type InternshipRow,
  type PublicCoursePayload,
} from "@/features/chat/lib/chat-data";
import type { CatalogRow } from "@/features/chat/lib/chat-intake";

const row = (over: Partial<CatalogRow>): CatalogRow => ({
  id: "id-1",
  slug: "course-1",
  title_ar: "دورة",
  title_en: "Course",
  level: "beginner",
  is_free: false,
  price: 1000,
  sale_price: 500,
  delivery_mode: "onsite",
  end_date: null,
  ...over,
});

describe("courseList", () => {
  const rows = [
    row({ slug: "old", title_ar: "قديمة", end_date: "2020-01-01" }),
    row({ slug: "new", title_ar: "جديدة", end_date: "2999-01-01" }),
    row({ slug: "online", title_ar: "أونلاين", delivery_mode: "online", end_date: "2020-01-01" }),
  ];

  it("hides ended courses unless asked, and online courses never end", () => {
    expect(courseList(rows, "ar", false).map((c) => c.ref)).toEqual(["new", "online"]);
    expect(courseList(rows, "ar", true).map((c) => c.ref)).toEqual(["new", "online", "old"]);
  });

  it("quotes the sale price in Syrian pounds and gives the ref and link", () => {
    const [c] = courseList([row({})], "ar", false);
    expect(c.price).toBe("ل.س 500");
    expect(c.ref).toBe("course-1");
    expect(c.url).toBe("https://www.aisyria.org/learning-management-system/courses/course-1");
  });
});

const course = (over: Partial<PublicCoursePayload["course"]>): PublicCoursePayload["course"] => ({
  id: "c1",
  slug: "generative-ai-09",
  title_ar: "الذكاء الاصطناعي التوليدي 09",
  title_en: "Generative AI 09",
  description_ar: "وصف",
  description_en: "Description",
  level: "beginner",
  price: 1000,
  sale_price: 500,
  is_free: false,
  students_count: 25,
  enrollment_open: true,
  enrollment_deadline: null,
  max_students: null,
  start_date: "2026-10-04T00:00:00+00:00",
  end_date: "2999-10-08T00:00:00+00:00",
  schedule_days: ["sun", "tue", "thu"],
  schedule_time_from: "14:00",
  schedule_time_to: "17:00",
  location_ar: "دمشق- مقر الجمعية ",
  location_en: "Damascus SAAE HQ",
  duration_hours: 9,
  delivery_mode: "onsite",
  ...over,
});

describe("registrationStatus", () => {
  const now = new Date("2026-10-03T12:00:00Z");
  it("follows the course page's order", () => {
    expect(registrationStatus(course({ end_date: "2026-07-16" }), now)).toBe("ended");
    expect(registrationStatus(course({ enrollment_open: false }), now)).toBe("closed");
    expect(registrationStatus(course({ enrollment_deadline: "2026-10-01T00:00:00Z" }), now)).toBe(
      "deadline_passed",
    );
    expect(registrationStatus(course({ max_students: 25 }), now)).toBe("full");
    expect(registrationStatus(course({}), now)).toBe("open");
  });
});

describe("toCourseDetails", () => {
  it("gives dates, days, time, place, instructors and sections in the visitor's language", () => {
    const details = toCourseDetails(
      {
        course: course({}),
        instructors: [
          {
            slug: "saae",
            full_name: "الجمعية",
            full_name_ar: "الجمعية",
            full_name_en: "SAAE",
            specialty: null,
            specialty_ar: null,
            specialty_en: null,
          },
        ],
        sections: [{ title: "مقدمة", title_en: "Introduction" }],
      },
      "en",
    );
    expect(details.start_date).toBe("2026-10-04");
    expect(details.days).toEqual(["Sunday", "Tuesday", "Thursday"]);
    expect(details.time_from).toBe("14:00");
    expect(details.location).toBe("Damascus SAAE HQ");
    expect(details.price).toBe("500 SYP");
    expect(details.instructors[0].name).toBe("SAAE");
    expect(details.sections).toEqual(["Introduction"]);
  });
});

const internship = (over: Partial<InternshipRow>): InternshipRow => ({
  slug: "multiomics",
  title_ar: '"تدريب بحثي',
  title_en: "Research internship",
  summary_ar: "ملخص",
  summary_en: "Summary",
  requirements_ar: null,
  requirements_en: null,
  location_ar: "عن بُعد",
  location_en: "Remote",
  duration_ar: "6 أشهر",
  duration_en: "6 months",
  stipend_ar: null,
  stipend_en: null,
  opens_at: null,
  deadline_at: null,
  starts_at: null,
  capacity: 5,
  require_cv: true,
  ...over,
});

describe("internships", () => {
  const now = new Date("2026-10-03T12:00:00Z");
  it("is open without a deadline, closed after it, and not open before its opening", () => {
    expect(internshipStatus(internship({}), now)).toBe("open");
    expect(internshipStatus(internship({ deadline_at: "2026-08-01T00:00:00Z" }), now)).toBe(
      "deadline_passed",
    );
    expect(internshipStatus(internship({ opens_at: "2026-11-01T00:00:00Z" }), now)).toBe(
      "not_open_yet",
    );
  });

  it("links to the opportunity page and drops a stray leading quote from the title", () => {
    const i = toInternship(internship({}), "ar", now);
    expect(i.title).toBe("تدريب بحثي");
    expect(i.url).toBe("https://www.aisyria.org/learning-management-system/internships/multiomics");
    expect(i.capacity).toBe(5);
  });
});

describe("toNewsList", () => {
  it("keeps one copy of a story posted twice", () => {
    const story = {
      id: "a",
      title: null,
      title_ar: "تخريج المدربين",
      title_en: null,
      excerpt: null,
      excerpt_ar: null,
      excerpt_en: null,
      published_at: "2026-06-25T00:00:00Z",
    };
    const list = toNewsList([story, { ...story, id: "b" }], "ar");
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ date: "2026-06-25", url: "https://www.aisyria.org/news/a" });
  });
});

describe("toInitiativeStatus", () => {
  it("reports the live figures and sponsors", () => {
    const status = toInitiativeStatus(
      { target: 1_000_000, done: 24, waiting: 30, total_chairs_funded: 1200 },
      [{ donor_name: "elm", donor_display_name: null, total_chairs: 500 }],
    );
    expect(status).toMatchObject({ learners_done: 24, waiting_list: 30, sponsored_seats: 1200 });
    expect(status.top_sponsors).toEqual([{ name: "elm", seats: 500 }]);
  });
});

describe("isPlausiblePhone", () => {
  it("refuses placeholders and accepts real numbers", () => {
    expect(isPlausiblePhone("000000000000")).toBe(false);
    expect(isPlausiblePhone("123")).toBe(false);
    expect(isPlausiblePhone(null)).toBe(false);
    expect(isPlausiblePhone("+963 930 763 547")).toBe(true);
    expect(isPlausiblePhone("0944123456")).toBe(true);
  });
});
