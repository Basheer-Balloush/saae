import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listContacts } from "@/lib/crm.functions";
import { toUserMessage } from "@/lib/safe-error";
import { useLang } from "@/lib/i18n";
import { CrmNewContactDialog } from "./CrmNewContactDialog";
import { exportRowsToXlsx } from "@/lib/admin-xlsx-export";

type Contact = Awaited<ReturnType<typeof listContacts>>["contacts"][number];

const STATUS_LABELS: Record<string, { ar: string; en: string; className: string }> = {
  new: { ar: "جديد", en: "New", className: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  contacted: { ar: "تم التواصل", en: "Contacted", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  qualified: { ar: "مؤهل", en: "Qualified", className: "bg-purple-500/15 text-purple-700 dark:text-purple-300" },
  converted: { ar: "محوّل", en: "Converted", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  archived: { ar: "مؤرشف", en: "Archived", className: "bg-muted text-muted-foreground" },
};

export function CrmContactsList() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const fetchContacts = useServerFn(listContacts);
  const [rows, setRows] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = () => {
    setLoading(true);
    fetchContacts({
      data: {
        search: search.trim() || undefined,
        status: status !== "all" ? (status as never) : undefined,
        type: type !== "all" ? (type as never) : undefined,
      },
    })
      .then((r) => setRows(r.contacts))
      .catch((e) => toast.error(toUserMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, type]);

  const stats = useMemo(() => {
    const total = rows.length;
    const individuals = rows.filter((r) => r.contact_type === "individual").length;
    const companies = rows.filter((r) => r.contact_type === "company").length;
    return { total, individuals, companies };
  }, [rows]);

  const onExport = () => {
    exportRowsToXlsx({
      filename: `crm-contacts-${new Date().toISOString().slice(0, 10)}`,
      sheetName: "Contacts",
      columns: [
        { header: "Name", key: "display_name" },
        { header: "Type", key: "contact_type" },
        { header: "Email", key: "primary_email" },
        { header: "Phone", key: "primary_phone" },
        { header: "Organization", key: "organization" },
        { header: "Status", key: "status" },
        { header: "Tags", key: "tags" },
        { header: "Created", key: "created_at" },
      ],
      rows: rows.map((r) => ({
        ...r,
        tags: (r.tags ?? []).join(", "),
        created_at: new Date(r.created_at).toISOString(),
      })),
      dir: ar ? "rtl" : "ltr",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{ar ? "جهات الاتصال" : "Contacts"}</h1>
          <p className="text-sm text-muted-foreground">
            {ar ? "الإجمالي" : "Total"}: <span className="font-semibold">{stats.total}</span> · {ar ? "أفراد" : "Individuals"}:{" "}
            <span className="font-semibold">{stats.individuals}</span> · {ar ? "شركات" : "Companies"}:{" "}
            <span className="font-semibold">{stats.companies}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onExport}>
            {ar ? "تصدير" : "Export"}
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> {ar ? "جهة جديدة" : "New contact"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder={ar ? "بحث بالاسم أو الإيميل أو الهاتف…" : "Search name, email, phone…"}
            className="ps-9"
          />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{ar ? "كل الأنواع" : "All types"}</SelectItem>
            <SelectItem value="individual">{ar ? "فرد" : "Individual"}</SelectItem>
            <SelectItem value="company">{ar ? "شركة" : "Company"}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{ar ? "كل الحالات" : "All statuses"}</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{ar ? v.ar : v.en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="secondary" size="sm" onClick={load}>{ar ? "بحث" : "Search"}</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-start">{ar ? "الاسم" : "Name"}</th>
              <th className="px-3 py-2 text-start">{ar ? "النوع" : "Type"}</th>
              <th className="px-3 py-2 text-start">{ar ? "إيميل" : "Email"}</th>
              <th className="px-3 py-2 text-start">{ar ? "هاتف" : "Phone"}</th>
              <th className="px-3 py-2 text-start">{ar ? "المؤسسة" : "Organization"}</th>
              <th className="px-3 py-2 text-start">{ar ? "الحالة" : "Status"}</th>
              <th className="px-3 py-2 text-start">{ar ? "آخر تحديث" : "Updated"}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-4 py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">{ar ? "لا توجد نتائج" : "No contacts"}</td></tr>
            )}
            {!loading && rows.map((r) => {
              const s = STATUS_LABELS[r.status] ?? STATUS_LABELS.new;
              return (
                <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <Link
                      to="/admin/crm/contacts/$contactId"
                      params={{ contactId: r.id }}
                      className="font-medium text-primary hover:underline"
                    >
                      {r.display_name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {r.contact_type === "company" ? (ar ? "شركة" : "Company") : (ar ? "فرد" : "Individual")}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.primary_email ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.primary_phone ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.organization ?? "—"}</td>
                  <td className="px-3 py-2"><Badge className={s.className} variant="secondary">{ar ? s.ar : s.en}</Badge></td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(r.updated_at).toLocaleDateString(ar ? "ar" : "en")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <CrmNewContactDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={load} />
    </div>
  );
}
