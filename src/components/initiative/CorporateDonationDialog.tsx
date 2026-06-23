import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitCorporateDonation, getInitiativeSettings } from "@/lib/initiative.functions";

const schema = z.object({
  donor_name: z.string().trim().min(2).max(160),
  donor_type: z.enum(["individual", "company"]),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(6).max(30),
  chairs: z.coerce.number().int().min(1).max(100000),
  currency: z.enum(["USD", "SYP"]),
});
type FormData = z.infer<typeof schema>;

export function CorporateDonationDialog({ open, onOpenChange, lang }: { open: boolean; onOpenChange: (v: boolean) => void; lang: "ar" | "en" }) {
  const submit = useServerFn(submitCorporateDonation);
  const fetchSettings = useServerFn(getInitiativeSettings);
  const [loading, setLoading] = useState(false);
  const [seatUsd, setSeatUsd] = useState(1);
  const [rate, setRate] = useState(14000);
  const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { donor_type: "company", currency: "USD", chairs: 10 },
  });

  useEffect(() => {
    fetchSettings().then((s: any) => {
      if (s) { setSeatUsd(Number(s.seat_price_usd ?? 1)); setRate(Number(s.usd_to_syp_rate ?? 14000)); }
    }).catch(() => {});
  }, [fetchSettings]);

  const chairs = Number(watch("chairs") || 0);
  const currency = watch("currency");
  const total = currency === "USD" ? chairs * seatUsd : chairs * seatUsd * rate;

  const t = lang === "ar"
    ? { title: "مسؤولية مجتمعية — تبرّع بمقاعد", desc: "ادعم تدريب السوريين بشراء مقاعد للمستفيدين على قائمة الانتظار.", name: "الاسم / الشركة", type: "النوع", individual: "فرد", company: "شركة", email: "البريد", phone: "الهاتف", chairs: "عدد المقاعد", currency: "العملة", total: "الإجمالي", pay: "متابعة إلى الدفع", soon: "تم حفظ تبرعك. سيتم ربط بوابة الدفع قريباً." }
    : { title: "Corporate Sponsorship — Donate Seats", desc: "Sponsor seats for waitlisted learners.", name: "Name / Company", type: "Type", individual: "Individual", company: "Company", email: "Email", phone: "Phone", chairs: "Chairs", currency: "Currency", total: "Total", pay: "Continue to payment", soon: "Donation saved. Payment gateway coming soon." };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await submit({ data });
      toast.success(t.soon);
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.desc}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t.name}</Label><Input {...register("donor_name")} />{errors.donor_name && <p className="text-xs text-destructive mt-1">{errors.donor_name.message}</p>}</div>
            <div>
              <Label>{t.type}</Label>
              <Select defaultValue="company" onValueChange={(v) => setValue("donor_type", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="company">{t.company}</SelectItem><SelectItem value="individual">{t.individual}</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t.email}</Label><Input type="email" dir="ltr" {...register("email")} />{errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}</div>
            <div><Label>{t.phone}</Label><Input dir="ltr" {...register("phone")} />{errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t.chairs}</Label><Input type="number" min={1} {...register("chairs")} />{errors.chairs && <p className="text-xs text-destructive mt-1">{errors.chairs.message}</p>}</div>
            <div>
              <Label>{t.currency}</Label>
              <Select defaultValue="USD" onValueChange={(v) => setValue("currency", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="SYP">SYP</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t.total}</span>
            <span className="text-2xl font-bold text-primary">{total.toLocaleString()} {currency}</span>
          </div>
          <Button type="submit" disabled={loading} className="w-full">{loading ? "..." : t.pay}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
