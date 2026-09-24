import { describe, expect, it } from "vitest";
import { formatCourseDate, formatIssueDate, renderCertificateHtml } from "@/lib/certificates/certificate-html";

const base = {
  name: "محمد أمين الناشف",
  serial: "C.TR.0.0",
  courseTitleAr: "الذكاء الاصطناعي التوليدي",
  startDate: "2026-07-26T00:00:00+00:00",
  endDate: "2026-07-30T00:00:00+00:00",
  issuedAt: "2026-07-31T22:30:00Z",
  templateUrl: "https://example.org/template.png",
  fontUrls: { regular: "https://example.org/r.ttf", bold: "https://example.org/b.ttf" },
};

describe("certificate page", () => {
  it("writes course dates as the stored calendar day, d/m/yyyy", () => {
    expect(formatCourseDate("2026-07-26T00:00:00+00:00")).toBe("26/7/2026");
  });

  it("reads dates in Postgres's own text form too", () => {
    expect(formatCourseDate("2026-09-25 00:00:00+00")).toBe("25/9/2026");
    expect(formatCourseDate("2026-09-25T00:00:00+00")).toBe("25/9/2026");
  });

  it("writes the issue date as the day it was in Damascus", () => {
    // 22:30 UTC on 31 July is already 1 August in Damascus.
    expect(formatIssueDate("2026-07-31T22:30:00Z")).toBe("1/8/2026");
  });

  it("uses the feminine wording for a female student", () => {
    const html = renderCertificateHtml({ ...base, gender: "female" });
    expect(html).toContain("قد اتبعت الدورة التدريبية الخاصة <b>(الذكاء الاصطناعي التوليدي)</b>");
    expect(html).toContain("مثابرة ومشاركة فعالة وملتزمة");
    expect(html).toContain("متمنين لها التوفيق");
  });

  it("uses the masculine wording for a male student", () => {
    const html = renderCertificateHtml({ ...base, gender: "male" });
    expect(html).toContain("قد اتبع الدورة");
    expect(html).toContain("مثابراً ومشاركاً فعالاً وملتزماً");
    expect(html).toContain("متمنين له التوفيق");
    expect(html).not.toContain("اتبعت");
  });

  it("keeps each date left-to-right inside the Arabic sentence", () => {
    const html = renderCertificateHtml({ ...base, gender: "female" });
    expect(html).toContain('من <bdi dir="ltr">26/7/2026</bdi> ولغاية <bdi dir="ltr">30/7/2026</bdi>');
  });

  it("escapes the name and course title", () => {
    const html = renderCertificateHtml({ ...base, gender: "male", name: "<script>x</script>", courseTitleAr: "A & B" });
    expect(html).not.toContain("<script>x");
    expect(html).toContain("&lt;script&gt;x&lt;/script&gt;");
    expect(html).toContain("(A &amp; B)");
  });
});
