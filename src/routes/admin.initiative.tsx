import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Trash2, Plus, Upload, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getInitiativeStats, getInitiativeSettings,
  adminListDonations, adminListWaitlist, adminConfirmDonation,
  adminCreateDonation, adminDeleteDonation, adminUpdateSettings, adminListCourses,
} from "@/lib/initiative.functions";

export const Route = createFileRoute("/admin/initiative")({
  head: () => ({ meta: [{ title: "إدارة مبادرة المليون مستخدم" }] }),
  component: AdminInitiative,
});

function AdminInitiative() {
  const statsFn = useServerFn(getInitiativeStats);
  const settingsFn = useServerFn(getInitiativeSettings);
  const donationsFn = useServerFn(adminListDonations);
  const waitlistFn = useServerFn(adminListWaitlist);
  const confirmFn = useServerFn(adminConfirmDonation);
  const createFn = useServerFn(adminCreateDonation);
  const deleteFn = useServerFn(adminDeleteDonation);
  const updateFn = useServerFn(adminUpdateSettings);
  const coursesFn = useServerFn(adminListCourses);

  const [stats, setStats] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);

  const reloadAll = () => {
    statsFn().then(setStats).catch(() => {});
    settingsFn().then(setSettings).catch(() => {});
    donationsFn().then(setDonations).catch(() => {});
    waitlistFn().then(setWaitlist).catch(() => {});
    coursesFn().then(setCourses).catch(() => {});
  };
  useEffect(() => { reloadAll(); }, []);

  // donation form
  const [df, setDf] = useState({ donor_name: "", donor_display_name: "", donor_type: "company", email: "", phone: "", logo_url: "", chairs_count: 10, currency: "USD", confirm: true });
  const submitDonation = async () => {
    try {
      await createFn({ data: { ...df, chairs_count: Number(df.chairs_count), donor_type: df.donor_type as any, currency: df.currency as any } });
      toast.success("تم");
      setDf({ ...df, donor_name: "", donor_display_name: "", email: "", phone: "" });
      reloadAll();
    } catch (e: any) { toast.error(e?.message); }
  };

  const saveSettings = async () => {
    try {
      const payload = {
        seat_price_usd: Number(settings.seat_price_usd),
        usd_to_syp_rate: Number(settings.usd_to_syp_rate),
        total_target: Number(settings.total_target),
        course_id: settings.course_id || null,
        about_ar: settings.about_ar, about_en: settings.about_en,
        mission_ar: settings.mission_ar, mission_en: settings.mission_en,
        values_ar: settings.values_ar, values_en: settings.values_en,
      };
      await updateFn({ data: payload });
      toast.success("تم حفظ الإعدادات");
    } catch (e: any) { toast.error(e?.message); }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Link to="/admin"><Button variant="ghost"><ArrowLeft className="h-4 w-4 me-2" />العودة</Button></Link>
      <h1 className="text-3xl font-bold mt-4">إدارة مبادرة مليون مستخدم</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <Card label="متدرّبون" value={stats?.done ?? 0} />
        <Card label="قائمة الانتظار" value={stats?.waiting ?? 0} />
        <Card label="مقاعد متاحة (مغطاة)" value={stats?.coveredUnassigned ?? 0} />
        <Card label="إجمالي مقاعد ممولة" value={stats?.totalFunded ?? 0} />
      </div>

      <Tabs defaultValue="donations" className="mt-8">
        <TabsList>
          <TabsTrigger value="donations">التبرعات</TabsTrigger>
          <TabsTrigger value="waitlist">قائمة الانتظار</TabsTrigger>
          <TabsTrigger value="settings">الإعدادات</TabsTrigger>
        </TabsList>

        <TabsContent value="donations" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Plus className="h-4 w-4" />إضافة تبرع يدوي</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Input placeholder="اسم المتبرع" value={df.donor_name} onChange={(e) => setDf({ ...df, donor_name: e.target.value })} />
              <Input placeholder="اسم العرض (اختياري)" value={df.donor_display_name} onChange={(e) => setDf({ ...df, donor_display_name: e.target.value })} />
              <Select value={df.donor_type} onValueChange={(v) => setDf({ ...df, donor_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="company">شركة</SelectItem><SelectItem value="individual">فرد</SelectItem></SelectContent>
              </Select>
              <Input placeholder="البريد" value={df.email} onChange={(e) => setDf({ ...df, email: e.target.value })} />
              <Input placeholder="الهاتف" value={df.phone} onChange={(e) => setDf({ ...df, phone: e.target.value })} />
              <Input placeholder="رابط الشعار (URL)" value={df.logo_url} onChange={(e) => setDf({ ...df, logo_url: e.target.value })} />
              <Input type="number" placeholder="عدد المقاعد" value={df.chairs_count} onChange={(e) => setDf({ ...df, chairs_count: Number(e.target.value) })} />
              <Select value={df.currency} onValueChange={(v) => setDf({ ...df, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="SYP">SYP</SelectItem></SelectContent>
              </Select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={df.confirm} onChange={(e) => setDf({ ...df, confirm: e.target.checked })} />
                تأكيد فوري (يغطي قائمة الانتظار)
              </label>
            </div>
            <Button className="mt-4" onClick={submitDonation}>إضافة</Button>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>
                <th className="p-3 text-start">المتبرع</th><th className="p-3 text-start">المقاعد</th><th className="p-3 text-start">المبلغ</th><th className="p-3 text-start">الحالة</th><th className="p-3 text-start">إجراءات</th>
              </tr></thead>
              <tbody>
                {donations.map((d) => (
                  <tr key={d.id} className="border-t border-border">
                    <td className="p-3 font-medium">{d.donor_display_name || d.donor_name}</td>
                    <td className="p-3">{d.chairs_count}</td>
                    <td className="p-3">{Number(d.amount).toLocaleString()} {d.currency}</td>
                    <td className="p-3"><span className={d.status === "confirmed" ? "text-green-600" : "text-amber-600"}>{d.status}</span></td>
                    <td className="p-3 flex gap-2">
                      {d.status !== "confirmed" && (
                        <Button size="sm" variant="outline" onClick={async () => { try { await confirmFn({ data: { id: d.id } }); toast.success("تم التأكيد"); reloadAll(); } catch (e: any) { toast.error(e?.message); } }}>
                          <CheckCircle2 className="h-3 w-3 me-1" />تأكيد
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={async () => { if (!confirm("حذف؟")) return; await deleteFn({ data: { id: d.id } }); reloadAll(); }}><Trash2 className="h-3 w-3" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="waitlist">
          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>
                <th className="p-3 text-start">الاسم</th><th className="p-3 text-start">البريد</th><th className="p-3 text-start">الهاتف</th><th className="p-3 text-start">الحالة</th><th className="p-3 text-start">التسجيل</th>
              </tr></thead>
              <tbody>
                {waitlist.map((w) => (
                  <tr key={w.id} className="border-t border-border">
                    <td className="p-3">{w.full_name}</td><td className="p-3">{w.email}</td><td className="p-3">{w.phone}</td>
                    <td className="p-3">{w.status}</td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          {settings && (
            <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>سعر المقعد (USD)</Label><Input type="number" step="0.01" value={settings.seat_price_usd} onChange={(e) => setSettings({ ...settings, seat_price_usd: e.target.value })} /></div>
                <div><Label>سعر صرف USD→SYP</Label><Input type="number" value={settings.usd_to_syp_rate} onChange={(e) => setSettings({ ...settings, usd_to_syp_rate: e.target.value })} /></div>
                <div><Label>الهدف الإجمالي</Label><Input type="number" value={settings.total_target} onChange={(e) => setSettings({ ...settings, total_target: e.target.value })} /></div>
              </div>
              <div>
                <Label>كورس المبادرة</Label>
                <Select value={settings.course_id ?? ""} onValueChange={(v) => setSettings({ ...settings, course_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر كورس..." /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title_ar || c.title_en}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>حولنا (عربي)</Label><Textarea rows={4} value={settings.about_ar} onChange={(e) => setSettings({ ...settings, about_ar: e.target.value })} /></div>
                <div><Label>About (English)</Label><Textarea rows={4} value={settings.about_en} onChange={(e) => setSettings({ ...settings, about_en: e.target.value })} /></div>
                <div><Label>رسالتنا (عربي)</Label><Textarea rows={4} value={settings.mission_ar} onChange={(e) => setSettings({ ...settings, mission_ar: e.target.value })} /></div>
                <div><Label>Mission (English)</Label><Textarea rows={4} value={settings.mission_en} onChange={(e) => setSettings({ ...settings, mission_en: e.target.value })} /></div>
                <div><Label>قيمنا (عربي)</Label><Textarea rows={4} value={settings.values_ar} onChange={(e) => setSettings({ ...settings, values_ar: e.target.value })} /></div>
                <div><Label>Values (English)</Label><Textarea rows={4} value={settings.values_en} onChange={(e) => setSettings({ ...settings, values_en: e.target.value })} /></div>
              </div>
              <Button onClick={saveSettings}>حفظ</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold text-primary mt-1">{Number(value).toLocaleString()}</p>
    </div>
  );
}
