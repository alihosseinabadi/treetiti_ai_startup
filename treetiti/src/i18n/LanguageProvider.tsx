import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import i18n from "./i18n";

interface LanguageContextType {
  lang: string;
  dir: "ltr" | "rtl";
  setLang: (lang: string) => void;
}

const RTL_LANGS = new Set(["fa", "ar"]);

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  dir: "ltr",
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState(() => i18n.language);
  const [fading, setFading] = useState(false);
  const dir = RTL_LANGS.has(lang) ? "rtl" : "ltr";

  const setLang = useCallback((l: string) => {
    setFading(true);
    setTimeout(() => {
      i18n.changeLanguage(l);
      setLangState(l);
      localStorage.setItem("lang", l);
      document.documentElement.dir = RTL_LANGS.has(l) ? "rtl" : "ltr";
      document.documentElement.lang = l;
      requestAnimationFrame(() => setFading(false));
    }, 200);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("lang") || i18n.language;
    if (saved !== i18n.language) i18n.changeLanguage(saved);
    setLangState(saved);
    document.documentElement.dir = RTL_LANGS.has(saved) ? "rtl" : "ltr";
    document.documentElement.lang = saved;
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, dir, setLang }}>
      <div
        style={{
          opacity: fading ? 0 : 1,
          transition: "opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
