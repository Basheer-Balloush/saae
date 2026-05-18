import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/lms")({
  head: () => ({
    meta: [
      { title: "SAAE — Learning Platform" },
      { name: "description", content: "SAAE learning platform for professional and technical training." },
      { property: "og:title", content: "SAAE — Learning Platform" },
      { property: "og:description", content: "SAAE learning platform for professional and technical training." },
      { property: "og:url", content: "https://aisyria.org/lms" },
    ],
    links: [
      { rel: "canonical", href: "https://aisyria.org/lms" },
    ],
  }),
  component: LmsPage,
});

function LmsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-7xl px-6 py-24 lg:px-10">
        <h1
          className="text-display-1"
          style={{
            fontFamily: '"Cairo", system-ui, sans-serif',
            fontWeight: 900,
            letterSpacing: "-0.02em",
          }}
        >
          منصة الجمعية التعليمية
        </h1>
        <p className="mt-6 max-w-2xl text-body text-muted-foreground">
          قيد الإنشاء — قريبًا ستجدون هنا المسارات التدريبية والدورات التعليمية.
        </p>
      </main>
    </div>
  );
}
