import { describe, expect, it } from "vitest";
import {
  asksForNamedCourse,
  courseAnswer,
  courseRegistrationStatus,
  enrichCourseOption,
  matchNamedCourse,
  messageLanguage,
} from "../../src/features/chat/lib/course-assistant";
import { toCourseOptions, type CatalogRow } from "../../src/features/chat/lib/chat-intake";
import { knownVisitorFacts } from "../../src/features/chat/lib/chat-profile";
import { formatMessage } from "../../src/features/chat/lib/chat-format";

const softwareCourse: CatalogRow = {
  id: "course-1",
  slug: "modern-software-engineering-methodology",
  title_ar: "المنهجية الحديثة في هندسة البرمجيات",
  title_en: "Modern Software Engineering Methodology",
  level: "beginner",
  is_free: true,
  price: 0,
  sale_price: null,
  delivery_mode: "onsite",
  end_date: "2026-07-16",
};

describe("course answers grounded in the LMS", () => {
  it("finds an archived course when the visitor changes its word order", () => {
    expect(matchNamedCourse([softwareCourse], "شو تفاصيل دورة هندسة البرمجيات الحديثة؟")?.id).toBe(
      softwareCourse.id,
    );
    expect(matchNamedCourse([softwareCourse], "المنهجية الحديثة في هندسة البر مجيات")?.id).toBe(
      softwareCourse.id,
    );
    expect(matchNamedCourse([softwareCourse], "دورة برمجة روبوتات تحت الماء")).toBeNull();
  });

  it("never presents an ended course as open for registration", () => {
    const option = enrichCourseOption(
      toCourseOptions([softwareCourse], "ar")[0],
      softwareCourse,
      {
        course: {
          start_date: "2026-07-12",
          end_date: "2026-07-16",
          enrollment_open: true,
          schedule_time_from: "15:00",
          schedule_time_to: "17:00",
          location_ar: "دمشق - مقر الجمعية",
        },
        sections: [{ title: "تحليل المتطلبات" }, { title: "تنفيذ المنتج واختباره" }],
      },
      "ar",
    );
    const answer = courseAnswer(softwareCourse, option, "ar");
    expect(option.registration_status).toBe("ended");
    expect(answer).toContain("انتهت الدورة؛ التسجيل فيها غير متاح");
    expect(answer).toContain("تحليل المتطلبات");
    expect(answer).toContain("15:00–17:00");
    expect(answer).not.toContain("يمكن تقديم طلب تسجيل");
  });

  it("distinguishes an application from a confirmed seat", () => {
    expect(
      courseRegistrationStatus(
        { enrollment_open: true, end_date: "2026-10-08" },
        new Date("2026-09-30"),
      ),
    ).toBe("open");
    expect(
      courseRegistrationStatus(
        { enrollment_open: true, end_date: "2026-07-16" },
        new Date("2026-09-30"),
      ),
    ).toBe("ended");
  });

  it("uses the visitor's latest language and keeps course links short", () => {
    expect(messageLanguage("What is the price?", "ar")).toBe("en");
    expect(asksForNamedCourse("شو تفاصيل دورة هندسة البرمجيات الحديثة؟")).toBe(true);
    expect(asksForNamedCourse("شو الدورات المتاحة للمبتدئين؟")).toBe(false);
    const segments = formatMessage(
      "شوف https://www.aisyria.org/learning-management-system/courses/modern-software-engineering-methodology",
    );
    expect(segments.find((segment) => segment.href)?.text).toBe("تفاصيل الدورة");
  });

  it("remembers facts stated before the intake begins", () => {
    expect(knownVisitorFacts(["أنا طالب طب وما بعرف برمجة"])).toEqual([
      "role=student_or_graduate",
      "field=healthcare",
      "programming_experience=none",
    ]);
  });
});
