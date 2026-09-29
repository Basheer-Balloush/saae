/* The training-course certificate as one self-contained A4 page.
 *
 * The designed certificate (border, logos, tree, heading, signatures, stamp)
 * is a background image; only the parts that change are written over it:
 * the serial and issue date in the top corners, the student's name between
 * the two diamonds, and the paragraph naming the course and its dates.
 *
 * Positions are in the template image's own pixels (1240 x 1748, A4 at
 * 150 dpi), turned into millimetres by --u, so they can be read straight off
 * the design. A headless browser prints this to PDF; a browser, not a PDF
 * library, because it joins Arabic letters correctly.
 */

export type CertificateGender = "male" | "female";

export type CertificateInput = {
  name: string;
  serial: string;
  gender: CertificateGender;
  courseTitleAr: string;
  /** Course start and end, as stored on lms_courses (date at midnight UTC). */
  startDate: string;
  endDate: string;
  issuedAt: string;
  /** Absolute URLs, so the page renders wherever the browser runs. */
  templateUrl: string;
  fontUrls: { regular: string; bold: string };
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/* Course dates are calendar days stored at midnight UTC: read them in UTC so
   no timezone moves them a day. The issue date is a real moment, shown as
   the day it was in Damascus. Written d/m/yyyy, as on the printed certificates. */
/* Accepts PostgREST's "2026-07-26T00:00:00+00:00" and Postgres's own
   "2026-07-26 00:00:00+00", so a date never prints as NaN. */
function parseTimestamp(value: string): Date {
  const d = new Date(value.trim().replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00"));
  if (Number.isNaN(d.getTime())) throw new Error(`certificate_bad_date ${value}`);
  return d;
}

export function formatCourseDate(iso: string): string {
  const d = parseTimestamp(iso);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
}

export function formatIssueDate(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Damascus",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(parseTimestamp(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${Number(get("day"))}/${Number(get("month"))}/${get("year")}`;
}

/* The certificate's wording, in the masculine or feminine form. */
function paragraphLines(gender: CertificateGender, course: string, from: string, to: string): string[] {
  const f = gender === "female";
  const date = (d: string) => `<bdi dir="ltr">${d}</bdi>`;
  return [
    `قد ${f ? "اتبعت" : "اتبع"} الدورة التدريبية الخاصة <b>(${course})</b>`,
    `والتي انعقدت خلال الفترة من ${date(from)} ولغاية ${date(to)} ${f ? "وكانت" : "وكان"} خلال الدورة`,
    f
      ? "مثابرة ومشاركة فعالة وملتزمة بالدوام والأنظمة الخاصة بالتدريب"
      : "مثابراً ومشاركاً فعالاً وملتزماً بالدوام والأنظمة الخاصة بالتدريب",
    `متمنين ${f ? "لها" : "له"} التوفيق في استثمار العلوم التي ${f ? "حصلت" : "حصل"} عليها`,
  ];
}

/* The name sits on one line between the diamonds; long names get smaller
   rather than wrapping into the paragraph. */
function nameSize(name: string): number {
  return Math.max(34, Math.min(60, Math.floor(1750 / Math.max([...name].length, 1))));
}

export function renderCertificateHtml(input: CertificateInput): string {
  const name = escapeHtml(input.name.trim());
  const lines = paragraphLines(
    input.gender,
    escapeHtml(input.courseTitleAr.trim()),
    formatCourseDate(input.startDate),
    formatCourseDate(input.endDate),
  );

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>${escapeHtml(input.serial)}</title>
<style>
  @font-face { font-family: "Cairo"; font-weight: 400; src: url("${input.fontUrls.regular}"); }
  @font-face { font-family: "Cairo"; font-weight: 700; src: url("${input.fontUrls.bold}"); }
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 210mm; height: 297mm; }
  body { font-family: "Cairo", sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { --u: calc(210mm / 1240); position: relative; width: 210mm; height: 297mm; overflow: hidden;
          background: #e9f6f9 url("${input.templateUrl}") center / 100% 100% no-repeat; }
  .corner { position: absolute; top: calc(var(--u) * 292); font-size: calc(var(--u) * 25); font-weight: 400;
            color: #3a4a4f; direction: ltr; line-height: 1; }
  .serial { left: calc(var(--u) * 186); }
  .issued { right: calc(var(--u) * 190); }
  .name { position: absolute; top: calc(var(--u) * 820); left: calc(var(--u) * 175); right: calc(var(--u) * 175);
          height: calc(var(--u) * 104); display: flex; align-items: center; justify-content: center;
          color: #6a903e; font-weight: 700; white-space: nowrap; line-height: 1; }
  .body { position: absolute; top: calc(var(--u) * 985); left: calc(var(--u) * 95); right: calc(var(--u) * 95);
          text-align: center; color: #111; font-size: calc(var(--u) * 31); line-height: calc(var(--u) * 62); text-wrap: balance; }
  .body b { font-weight: 700; }
</style>
</head>
<body>
<div class="page">
  <p class="corner serial">${escapeHtml(input.serial)}</p>
  <p class="corner issued">${formatIssueDate(input.issuedAt)}</p>
  <p class="name" style="font-size: calc(var(--u) * ${nameSize(input.name)})">${name}</p>
  <div class="body">${lines.map((l) => `<p>${l}</p>`).join("")}</div>
</div>
</body>
</html>`;
}
