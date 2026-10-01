import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en";
import fa from "./fa";
import ru from "./ru";
import ar from "./ar";
import tr from "./tr";

const savedLang = typeof window !== "undefined" ? localStorage.getItem("lang") : null;

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fa: { translation: fa },
    ru: { translation: ru },
    ar: { translation: ar },
    tr: { translation: tr },
  },
  lng: savedLang || "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
