import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitDirectPayment } from "@/lib/initiative.functions";

const schema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(6).max(30),
});
type FormData = z.infer<typeof schema>;

export function DirectPaymentDialog({ open, onOpenChange, lang }: { open: boolean; onOpenChange: (v: boolean) => void; lang: "ar" | "en" }) {
  const submit = useServerFn(submitDirectPayment);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({ resolver: zodResolver(schema) });

  const t = lang === "ar"
    ? { title: "ادفع وابدأ", desc: "ادفع $1 لمقعدك وابدأ الكورس فوراً. سترسل بوابة الدفع قريباً.", name: "الاسم الكامل", email: "البريد الإلكتروني", phone: "الهاتف", pay: "متابعة إلى الدفع", soon: "سيتم ربط بوابة الدفع قريباً — تم حفظ طلبك." }
    : { title: "Pay & Start", desc: "Pay $1 for your seat and start instantly. Payment gateway coming soon.", name: "Full name", email: "Email", phone: "Phone", pay: "Continue to payment", soon: "Payment gateway coming soon — request saved." };

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.desc}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div><Label>{t.name}</Label><Input {...register("full_name")} />{errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name.message}</p>}</div>
          <div><Label>{t.email}</Label><Input type="email" dir="ltr" {...register("email")} />{errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}</div>
          <div><Label>{t.phone}</Label><Input dir="ltr" {...register("phone")} />{errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}</div>
          <Button type="submit" disabled={loading} className="w-full">{loading ? "..." : t.pay}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
