import { useState } from "react";
import { toast } from "sonner";
import { Loader2, MessageSquarePlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/safe-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FEEDBACK_CATEGORIES,
  feedbackCategoryLabel,
  type FeedbackCategory,
} from "@/lib/chat-feedback";

const T = {
  ar: {
    open: "إرسال ملاحظة / رأي",
    title: "شاركنا رأيك",
    desc: "اكتب ملاحظتك وسيصل رأيك مباشرةً إلى فريقنا.",
    category: "التصنيف",
    name: "الاسم (اختياري)",
    email: "البريد الإلكتروني (اختياري)",
    message: "ملاحظتك",
    placeholder: "اكتب ملاحظتك هنا...",
    send: "إرسال",
    cancel: "إلغاء",
    thanks: "شكراً لك! تم استلام ملاحظتك.",
    required: "الرجاء كتابة ملاحظتك",
  },
  en: {
    open: "Send feedback",
    title: "Share your feedback",
    desc: "Write your feedback and it goes straight to our team.",
    category: "Category",
    name: "Name (optional)",
    email: "Email (optional)",
    message: "Your feedback",
    placeholder: "Write your feedback here...",
    send: "Send",
    cancel: "Cancel",
    thanks: "Thank you! Your feedback was received.",
    required: "Please write your feedback",
  },
};

export function AssistantFeedbackForm({
  lang,
  sessionId,
  onClose,
}: {
  lang: "ar" | "en";
  sessionId: string;
  onClose: () => void;
}) {
  const tr = T[lang];
  const labels = feedbackCategoryLabel[lang];
  const [category, setCategory] = useState<FeedbackCategory>("suggestion");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (text.length < 2) {
      toast.error(tr.required);
      return;
    }
    setSending(true);
    const { error } = await supabase.from("chat_feedback").insert({
      session_id: sessionId,
      category,
      name: name.trim() || null,
      email: email.trim() || null,
      message: text.slice(0, 4000),
      lang,
    });
    setSending(false);
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    setDone(true);
    toast.success(tr.thanks);
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-foreground">
        <p>{tr.thanks}</p>
        <Button type="button" size="sm" variant="outline" className="mt-3" onClick={onClose}>
          {tr.cancel}
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4 text-start"
    >
      <div className="flex items-center justify-between">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
          <MessageSquarePlus className="h-4 w-4 text-primary" />
          {tr.title}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label={tr.cancel}
          className="rounded-full p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">{tr.desc}</p>

      <div>
        <Label className="text-xs">{tr.category}</Label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
          className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        >
          {FEEDBACK_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {labels[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">{tr.name}</Label>
          <Input
            className="mt-1 h-9"
            value={name}
            maxLength={200}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">{tr.email}</Label>
          <Input
            className="mt-1 h-9"
            type="email"
            dir="ltr"
            value={email}
            maxLength={320}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">{tr.message}</Label>
        <Textarea
          className="mt-1"
          rows={4}
          value={message}
          maxLength={4000}
          placeholder={tr.placeholder}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={sending}>
          {sending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {tr.send}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onClose}>
          {tr.cancel}
        </Button>
      </div>
    </form>
  );
}
