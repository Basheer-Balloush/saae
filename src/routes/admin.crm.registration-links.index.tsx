import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Eye, Loader2, Plus, RefreshCw } from "lucide-react";

import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IconActionButton } from "@/components/admin/IconActionButton";
import {
  adminCreateRegistrationLink,
  adminListRegistrationLinks,
  adminSetRegistrationLinkActive,
  type RegistrationLink,
} from "@/lib/crm-registration-links.functions";

export const Route = createFileRoute("/admin/crm/registration-links/")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Registration links — CRM" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RegistrationLinksPage,
});

export function publicJoinUrl(token: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/join/${token}`;
}

function RegistrationLinksPage() {
  const { lang, dir } = useLang();
  const ar = lang === "ar";

  const listFn = useServerFn(adminListRegistrationLinks);
  const createFn = useServerFn(adminCreateRegistrationLink);
  const toggleFn = useServerFn(adminSetRegistrationLinkActive);

  const [rows, setRows] = useState<RegistrationLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listFn({ data: undefined }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, [listFn]);

  useEffect(() => {
    void load();
  }, [load]);

  const onCreate = async () => {
    const trimmed = label.trim();
    if (trimmed.length < 2) {
      toast.error(ar ? "أدخل اسمًا للرابط" : "Enter a link name");
      return;
    }
    setSaving(true);
    try {
      const link = await createFn({ data: { label: trimmed } });
      setRows((p) => [link, ...p]);
      setOpen(false);
      setLabel("");
      toast.success(ar ? "تم إنشاء الرابط" : "Link created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "error");
    } finally {
      setSaving(false);
    }
  };

  const onToggle = async (row: RegistrationLink) => {
    setBusyId(row.id);
    try {
      await toggleFn({ data: { id: row.id, is_active: !row.is_active } });
      setRows((p) => p.map((r) => (r.id === row.id ? { ...r, is_active: !r.is_active } : r)));
      toast.success(
        row.is_active
          ? ar
            ? "تم إيقاف الرابط"
            : "Link deactivated"
          : ar
            ? "تم تفعيل الرابط"
            : "Link activated",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "error");
    } finally {
      setBusyId(null);
    }
  };

  const onCopy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(publicJoinUrl(token));
      toast.success(ar ? "تم نسخ الرابط" : "Link copied");
    } catch {
      toast.error(ar ? "تعذّر النسخ" : "Could not copy");
    }
  };

  return (
    <section className="space-y-4" dir={dir}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {ar ? "روابط التسجيل" : "Registration links"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {ar
              ? "أنشئ روابط تسجيل للفعاليات وشاركها لجمع بيانات المنضمين الجدد."
              : "Create shareable event links to capture new members directly into the CRM."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <IconActionButton
            icon={RefreshCw}
            label={ar ? "تحديث" : "Refresh"}
            onClick={() => void load()}
            variant="outline"
          />
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="mx-1">{ar ? "إنشاء رابط" : "Create link"}</span>
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
        >
          <span>{ar ? "تعذّر تحميل الروابط." : "Could not load registration links."}</span>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            {ar ? "إعادة المحاولة" : "Retry"}
          </Button>
        </div>
      )}

      <Card className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {ar ? "لا توجد روابط بعد." : "No registration links yet."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{ar ? "الاسم" : "Name"}</TableHead>
                <TableHead>{ar ? "الحالة" : "Status"}</TableHead>
                <TableHead>{ar ? "عدد التسجيلات" : "Submissions"}</TableHead>
                <TableHead>{ar ? "تاريخ الإنشاء" : "Created"}</TableHead>
                <TableHead className="text-end">{ar ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium" dir="auto">
                    {r.label}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={r.is_active}
                        disabled={busyId === r.id}
                        onCheckedChange={() => void onToggle(r)}
                        aria-label={ar ? "تفعيل الرابط" : "Toggle link"}
                      />
                      <Badge variant={r.is_active ? "default" : "secondary"}>
                        {r.is_active ? (ar ? "فعّال" : "Active") : ar ? "متوقف" : "Inactive"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{r.submissions_count}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString(ar ? "ar" : "en-GB")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <IconActionButton
                        icon={Copy}
                        label={ar ? "نسخ الرابط" : "Copy link"}
                        onClick={() => void onCopy(r.token)}
                      />
                      <Button asChild variant="ghost" size="icon" aria-label={ar ? "عرض التسجيلات" : "View submissions"}>
                        <Link to="/admin/crm/registration-links/$id" params={{ id: r.id }}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir={dir}>
          <DialogHeader>
            <DialogTitle>{ar ? "إنشاء رابط تسجيل" : "Create registration link"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="link-label">{ar ? "اسم الرابط" : "Link name"}</Label>
            <Input
              id="link-label"
              value={label}
              autoFocus
              placeholder={ar ? "مثال: معرض الربيع 2026" : "e.g. Spring Fair 2026"}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              {ar ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={() => void onCreate()} disabled={saving}>
              {saving && <Loader2 className="mx-2 h-4 w-4 animate-spin" />}
              {ar ? "إنشاء" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
