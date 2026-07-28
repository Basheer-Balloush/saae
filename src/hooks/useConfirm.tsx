import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLang } from "@/lib/i18n";

/**
 * Accessible replacement for native window.confirm() — Phase 10 (CF-06).
 *
 * Renders a shadcn AlertDialog (Radix) with proper focus trap, ESC handling,
 * localized default buttons, and destructive styling. Returns a Promise that
 * resolves to true on confirm, false on cancel/dismiss.
 *
 * Two call styles:
 *   const confirm = useConfirm();  // inside components
 *   await confirmDialog({ title }); // module-level, from anywhere
 */

export type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmFn = (opts: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

// Module-level handle so non-hook callers (event handlers importing `confirmDialog`)
// hit the same modal instance as the React tree.
let externalConfirm: ConfirmFn | null = null;

function normalize(opts: ConfirmOptions | string): ConfirmOptions {
  return typeof opts === "string" ? { title: opts } : opts;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((next) => {
    setOpts(normalize(next));
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  useEffect(() => {
    externalConfirm = confirm;
    return () => {
      if (externalConfirm === confirm) externalConfirm = null;
    };
  }, [confirm]);

  const settle = useCallback((value: boolean) => {
    const r = resolverRef.current;
    resolverRef.current = null;
    setOpen(false);
    if (r) r(value);
  }, []);

  const confirmLabel = opts?.confirmLabel ?? (isAr ? "تأكيد" : "Confirm");
  const cancelLabel = opts?.cancelLabel ?? (isAr ? "إلغاء" : "Cancel");

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (!next) settle(false);
        }}
      >
        <AlertDialogContent dir={isAr ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{opts?.title ?? ""}</AlertDialogTitle>
            {opts?.description && <AlertDialogDescription>{opts.description}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => settle(false)}>{cancelLabel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => settle(true)}
              className={
                opts?.destructive
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

/** Hook form — preferred inside React components. */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  return useMemo<ConfirmFn>(() => {
    if (ctx) return ctx;
    return async (opts) => {
      const o = normalize(opts);
      return typeof window !== "undefined" && window.confirm(o.title);
    };
  }, [ctx]);
}

/**
 * Module-level confirm — safe to import in any client file.
 * Falls back to window.confirm if the provider isn't mounted (SSR, tests, or
 * during hot reload before hydration).
 */
export function confirmDialog(opts: ConfirmOptions | string): Promise<boolean> {
  if (externalConfirm) return externalConfirm(opts);
  const o = normalize(opts);
  const ok = typeof window !== "undefined" && window.confirm(o.title);
  return Promise.resolve(ok);
}
