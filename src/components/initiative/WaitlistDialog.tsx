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
import { submitWaitlist } from "@/lib/initiative.functions";

const schema = z.object({
  name: z.string().trim().min(2, "الاسم قصير جداً").max(120),
  email: z.string().trim().email("بريد غير صالح").max(200),
  phone: z.string().trim().min(6, "رقم الهاتف قصير").max(30),
});
type FormData = z.infer<typeof schema>;

export function WaitlistDialog({ open, onOpenChange, lang }: { open: boolean; onOpenChange: (v: boolean) => void; lang: "ar" | "en" }) {
  const submit = useServerFn(submitWaitlist);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({ resolver: zodResolver(schema) });

  const t = lang === "ar"
    ? { title: "سجّل على قائمة الانتظار", desc: "أدخل بياناتك وسنرسل لك دعوة فور تغطية مقعدك من إحدى الرعايات.", name: "الاسم الكامل", email: "البريد الإلكتروني", phone: "رقم الهاتف", submit: "تسجيل", sending: "جارٍ الإرسال...", success: "تم تسجيلك بنجاح. ستصلك دعوة عند تغطية مقعدك." }
    : { title: "Join the waitlist", desc: "Enter your details. You'll get an invitation as soon as your seat is sponsored.", name: "Full name", email: "Email", phone: "Phone", submit: "Register", sending: "Sending...", success: "Registered. You'll get an invitation as soon as your seat is covered." };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await submit({ data });
      toast.success(t.success);
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
          <div>
            <Label>{t.name}</Label>
            <Input {...register("name")} />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label>{t.email}</Label>
            <Input type="email" dir="ltr" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <Label>{t.phone}</Label>
            <Input dir="ltr" {...register("phone")} />
            {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? t.sending : t.submit}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
