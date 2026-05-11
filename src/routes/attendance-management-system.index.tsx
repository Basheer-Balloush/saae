import { createFileRoute } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import { amsT } from "@/lib/ams-i18n";

export const Route = createFileRoute("/attendance-management-system/")({
  component: AmsDashboard,
});

function AmsDashboard() {
  const { lang } = useLang();
  const tr = amsT[lang];
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">{tr.dashboard}</h1>
        <p className="mt-3 text-muted-foreground">{tr.welcome}</p>
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">{tr.noSections}</p>
        </div>
      </div>
    </div>
  );
}
