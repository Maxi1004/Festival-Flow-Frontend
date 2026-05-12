import { useTranslation } from "react-i18next";
import { supportedLanguages } from "../i18n";

const languageOptions = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
  { value: "zh", label: "中文" },
  { value: "ko", label: "한국어" },
  { value: "ja", label: "日本語" },
] as const;

function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;

  return (
    <label className="language-selector">
      <span className="language-selector__label">{t("layout.language")}</span>
      <select
        className="language-selector__select"
        value={supportedLanguages.find((language) => currentLanguage.startsWith(language)) ?? "es"}
        onChange={(event) => void i18n.changeLanguage(event.target.value)}
      >
        {languageOptions.map((language) => (
          <option key={language.value} value={language.value}>
            {language.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default LanguageSelector;
