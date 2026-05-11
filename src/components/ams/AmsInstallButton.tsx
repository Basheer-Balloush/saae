import { useEffect, useState } from "react";
import { Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";
import { amsT } from "@/lib/ams-i18n";
import { toast } from "sonner";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function AmsInstallButton({ className }: { className?: string }) {
  const { lang } = useLang();
  const tr = amsT[lang];
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Detect already installed (standalone mode)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) setInstalled(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const isIos = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  const handleClick = async () => {
    if (installed) return;
    if (isIos && !deferred) {
      toast.message(tr.iosInstallTitle, { description: tr.iosInstallSteps, duration: 7000 });
      return;
    }
    if (!deferred) {
      toast.info(tr.installNotAvailable, { duration: 6000 });
      return;
    }
    setBusy(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant={installed ? "ghost" : "default"}
      size="sm"
      onClick={handleClick}
      disabled={installed || busy}
      className={className}
    >
      {installed ? <Check className="h-4 w-4 mr-1" /> : <Download className="h-4 w-4 mr-1" />}
      {installed ? tr.installed : busy ? tr.installing : tr.install}
    </Button>
  );
}
