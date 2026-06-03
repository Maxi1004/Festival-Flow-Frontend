import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getSupportedLanguages, type SupportedLanguage } from "../service/translationApi";

const LANGUAGE_STORAGE_KEY = "festival_flow_language";

const fallbackLanguages: SupportedLanguage[] = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "zh", label: "中文" },
  { code: "ko", label: "한국어" },
  { code: "ja", label: "日本語" },
];

function getStoredLanguage(): string {
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || "es";
  } catch {
    return "es";
  }
}

function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const [languages, setLanguages] = useState<SupportedLanguage[]>(fallbackLanguages);
  const [selectedLanguage, setSelectedLanguage] = useState(getStoredLanguage);

  useEffect(() => {
    let isMounted = true;

    getSupportedLanguages()
      .then((nextLanguages) => {
        if (isMounted && nextLanguages.length) {
          setLanguages(nextLanguages);
        }
      })
      .catch(() => {
        // Keep fallback languages if the backend list is temporarily unavailable.
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLanguageChange = async (language: string) => {
    setSelectedLanguage(language);

    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Ignore localStorage failures.
    }

    window.dispatchEvent(
      new CustomEvent("festival-flow-language-change", {
        detail: { language },
      })
    );

    await i18n.changeLanguage(language);
  };

  return (
    <label className="language-selector">
      <span className="language-selector__label">{t("layout.language")}</span>
      <select
        className="language-selector__select"
        value={selectedLanguage}
        onChange={(event) => void handleLanguageChange(event.target.value)}
      >
        {languages.map((language) => (
          <option key={language.code} value={language.code}>
            {language.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default LanguageSelector;
