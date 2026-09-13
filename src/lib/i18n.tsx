import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translations, type Lang, type Translations } from "./translations";

type Ctx = {
  lang: Lang;
  dir: "ltr" | "rtl";
  t: Translations;
  setLang: (l: Lang) => void;
  toggle: () => void;
};

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Match the server on the first client render; restore a saved preference
  // after hydration so translated content cannot mismatch the SSR markup.
  const [lang, setLangState] = useState<Lang>("ar");
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("saae-lang");
      if (saved === "ar" || saved === "en") setLangState(saved);
    } catch {
      // Storage may be disabled; the language control still works in memory.
    }
    setPreferenceLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferenceLoaded) return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    try {
      localStorage.setItem("saae-lang", lang);
    } catch {
      // Persisting a preference is optional when browser storage is blocked.
    }
  }, [lang, preferenceLoaded]);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      dir: lang === "ar" ? "rtl" : "ltr",
      t: translations[lang],
      setLang: setLangState,
      toggle: () => setLangState((l) => (l === "en" ? "ar" : "en")),
    }),
    [lang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
}
