import { useEffect, useRef, useState } from "react";
import { AlertTriangle, FileText, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UploadProgress } from "@/components/common/upload-progress";
import { uploadToSupabaseStorage } from "@/lib/upload-with-progress";
import { toUserMessage } from "@/lib/safe-error";
import { MAX_RECEIPTS, MAX_RECEIPT_MB, RECEIPT_ACCEPT, RECEIPTS_BUCKET, SHAM_CASH } from "./config";
import { formatAmount } from "./lib/format";

type Receipt = { path: string; name: string; preview: string | null };

/* Sham Cash step: the association's QR, the receipts (up to three) and "Pay".
   Receipts go to the student's own folder in a private bucket; the database
   re-checks every path when the request is submitted. */
export function ShamCashPayment({
  ar,
  userId,
  courseId,
  amount,
  busy,
  onPay,
  onBack,
}: {
  ar: boolean;
  userId: string;
  courseId: string;
  amount: number;
  busy: boolean;
  onPay: (receiptPaths: string[]) => void;
  onBack: () => void;
}) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [uploading, setUploading] = useState<{
    pct: number;
    loaded: number;
    total: number;
    name: string;
  } | null>(null);

  // Local previews are object URLs; release them when the step closes.
  const previews = useRef<string[]>([]);
  useEffect(
    () => () => {
      for (const u of previews.current) URL.revokeObjectURL(u);
    },
    [],
  );

  const slotsLeft = MAX_RECEIPTS - receipts.length;

  const addFiles = async (files: File[]) => {
    if (!files.length) return;
    if (files.length > slotsLeft) {
      toast.error(
        ar
          ? `يمكن إرفاق ${MAX_RECEIPTS} إيصالات كحدّ أقصى`
          : `You can attach up to ${MAX_RECEIPTS} receipts`,
      );
      files = files.slice(0, slotsLeft);
    }
    for (const file of files) {
      if (file.size > MAX_RECEIPT_MB * 1024 * 1024) {
        toast.error(
          ar
            ? `حجم الملف ${file.name} يتجاوز ${MAX_RECEIPT_MB} ميجا`
            : `${file.name} is larger than ${MAX_RECEIPT_MB} MB`,
        );
        continue;
      }
      const safeName = file.name.replace(/[^\w.-]+/g, "_").slice(-80);
      setUploading({ pct: 0, loaded: 0, total: file.size, name: file.name });
      try {
        const { path } = await uploadToSupabaseStorage({
          bucket: RECEIPTS_BUCKET,
          path: `${userId}/${courseId}/${Date.now()}-${safeName}`,
          file,
          upsert: false,
          contentType: file.type || undefined,
          onProgress: (pct, loaded, total) => setUploading({ pct, loaded, total, name: file.name }),
        });
        const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
        if (preview) previews.current.push(preview);
        setReceipts((r) => [...r, { path, name: file.name, preview }]);
      } catch (err) {
        toast.error(toUserMessage(err));
      } finally {
        setUploading(null);
      }
    }
  };

  const amountText = formatAmount(amount, "SYP", ar);

  return (
    <div className="space-y-4">
      {SHAM_CASH.isTest && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {ar
            ? "رمز تجريبي لاختبار النظام فقط — لا تحوّل عليه أي مبلغ حقيقي."
            : "Test code for trying the system only — do not send real money to it."}
        </p>
      )}

      <div className="flex flex-col items-center gap-3 rounded-xl border border-input bg-background/40 p-4 text-center">
        <div className="rounded-xl bg-white p-2.5">
          <img
            src={SHAM_CASH.qrSrc}
            alt={ar ? "رمز QR لحساب الجمعية في شام كاش" : "Association's Sham Cash QR code"}
            className="h-48 w-48"
          />
        </div>
        <div className="space-y-0.5 text-sm">
          <div className="font-semibold">
            {ar ? SHAM_CASH.accountName.ar : SHAM_CASH.accountName.en}
          </div>
          <div className="text-muted-foreground" dir="ltr">
            {SHAM_CASH.accountNumber}
          </div>
        </div>
        <div className="text-sm">
          {ar ? "المبلغ المطلوب: " : "Amount due: "}
          <strong dir="ltr" className="whitespace-nowrap text-base">
            {amountText}
          </strong>
        </div>
      </div>

      <ol className="list-decimal space-y-1 ps-5 text-sm text-muted-foreground">
        <li>
          {ar ? "افتح تطبيق شام كاش وامسح الرمز." : "Open the Sham Cash app and scan the code."}
        </li>
        <li>{ar ? "حوّل المبلغ المطلوب كاملاً." : "Transfer the full amount."}</li>
        <li>
          {ar
            ? `أرفق صورة إيصال التحويل (حتى ${MAX_RECEIPTS} صور).`
            : `Attach the transfer receipt (up to ${MAX_RECEIPTS} images).`}
        </li>
      </ol>

      <div className="space-y-2">
        <div className="text-sm font-medium">
          {ar ? "إيصال التحويل" : "Transfer receipt"} <span className="text-destructive">*</span>
          <span className="ms-2 text-xs font-normal text-muted-foreground">
            {receipts.length}/{MAX_RECEIPTS}
          </span>
        </div>

        {receipts.length > 0 && (
          <ul className="grid grid-cols-3 gap-2">
            {receipts.map((r) => (
              <li
                key={r.path}
                className="relative aspect-square overflow-hidden rounded-lg border border-input bg-muted"
              >
                {r.preview ? (
                  <img src={r.preview} alt={r.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full flex-col items-center justify-center gap-1 p-1 text-center text-[11px] text-muted-foreground">
                    <FileText className="h-6 w-6" />
                    <span className="line-clamp-2 break-all">{r.name}</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setReceipts((list) => list.filter((x) => x.path !== r.path))}
                  disabled={busy}
                  className="absolute end-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white hover:bg-black"
                  aria-label={ar ? "إزالة الإيصال" : "Remove receipt"}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {uploading && (
          <UploadProgress
            percent={uploading.pct}
            loaded={uploading.loaded}
            total={uploading.total}
            label={uploading.name}
          />
        )}

        {slotsLeft > 0 && (
          <label
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-input px-3 py-4 text-sm hover:bg-muted ${uploading || busy ? "pointer-events-none opacity-60" : ""}`}
          >
            <ImagePlus className="h-4 w-4" />
            <span>
              {receipts.length
                ? ar
                  ? "إضافة إيصال آخر"
                  : "Add another receipt"
                : ar
                  ? "رفع صورة الإيصال"
                  : "Upload the receipt"}
            </span>
            <input
              type="file"
              accept={RECEIPT_ACCEPT}
              multiple
              className="hidden"
              disabled={!!uploading || busy}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                void addFiles(files);
              }}
            />
          </label>
        )}
        <p className="text-xs text-muted-foreground">
          {ar
            ? `صور أو PDF، حتى ${MAX_RECEIPT_MB} ميجا لكل ملف.`
            : `Images or PDF, up to ${MAX_RECEIPT_MB} MB each.`}
        </p>
      </div>

      <div className="flex gap-2 border-t border-border pt-3">
        <Button
          className="flex-1"
          onClick={() => onPay(receipts.map((r) => r.path))}
          disabled={busy || !!uploading || receipts.length === 0}
        >
          {busy && <Loader2 className="mx-1 h-4 w-4 animate-spin" />}
          {ar ? "دفع" : "Pay"}
        </Button>
        <Button variant="outline" onClick={onBack} disabled={busy || !!uploading}>
          {ar ? "رجوع" : "Back"}
        </Button>
      </div>
    </div>
  );
}
