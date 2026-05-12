import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import de from "../locales/de/common.json";
import en from "../locales/en/common.json";
import es from "../locales/es/common.json";
import fr from "../locales/fr/common.json";
import ja from "../locales/ja/common.json";
import ko from "../locales/ko/common.json";
import zh from "../locales/zh/common.json";

export const supportedLanguages = ["es", "en", "de", "fr", "zh", "ko", "ja"] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { common: es },
      en: { common: en },
      de: { common: de },
      fr: { common: fr },
      zh: { common: zh },
      ko: { common: ko },
      ja: { common: ja },
    },
    defaultNS: "common",
    ns: ["common"],
    fallbackLng: "es",
    supportedLngs: supportedLanguages,
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
    returnNull: false,
  });

export default i18n;
