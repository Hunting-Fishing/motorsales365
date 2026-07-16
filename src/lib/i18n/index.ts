import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import fil from "./locales/fil.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import zh from "./locales/zh.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";
import ceb from "./locales/ceb.json";
import ilo from "./locales/ilo.json";
import hil from "./locales/hil.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "fil", label: "Filipino", native: "Filipino" },
  { code: "ceb", label: "Cebuano", native: "Bisaya" },
  { code: "ilo", label: "Ilocano", native: "Ilokano" },
  { code: "hil", label: "Hiligaynon", native: "Ilonggo" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "zh", label: "Chinese", native: "中文" },
  { code: "fr", label: "French", native: "Français" },
  { code: "es", label: "Spanish", native: "Español" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const resources = {
  en: { translation: en },
  fil: { translation: fil },
  ja: { translation: ja },
  ko: { translation: ko },
  zh: { translation: zh },
  fr: { translation: fr },
  es: { translation: es },
  ceb: { translation: ceb },
  ilo: { translation: ilo },
  hil: { translation: hil },
};

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: "en",
      supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
      nonExplicitSupportedLngs: true,
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator", "htmlTag"],
        caches: ["localStorage"],
        lookupLocalStorage: "365ms.lang",
      },
      react: { useSuspense: false },
    });

  // Sync <html lang="…"> when language changes (client only).
  if (typeof document !== "undefined") {
    const applyLang = (lng: string) => {
      const base = lng.split("-")[0];
      document.documentElement.setAttribute("lang", base);
    };
    applyLang(i18n.language || "en");
    i18n.on("languageChanged", applyLang);
  }
}

export default i18n;
