import { useCallback, useEffect, useRef, useState } from "react";
import { reusePendingRequest } from "../service/pendingRequest";
import {
  getCachedTranslation,
  setCachedTranslations,
} from "../service/translationCache";
import { translateTexts } from "../service/translationApi";

const LANGUAGE_STORAGE_KEY = "festival_flow_language";
const BASE_LANGUAGE = "es";

function getStoredLanguage(): string {
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || BASE_LANGUAGE;
  } catch {
    return BASE_LANGUAGE;
  }
}

function shouldTranslate(text: string): boolean {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return false;
  }

  if (/^[\d\s.,:/-]+$/.test(trimmedText)) {
    return false;
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedText)) {
    return false;
  }

  return /\p{L}/u.test(trimmedText);
}

function uniqueTranslatableTexts(texts: string[]): string[] {
  return Array.from(new Set(texts.map((text) => text.trim()).filter(shouldTranslate)));
}

function useStableTexts(texts: string[]): string[] {
  const stableRef = useRef<string[]>([]);
  const keyRef = useRef<string>("");

  const processed = uniqueTranslatableTexts(texts);
  const nextKey = processed.slice().sort().join("\x00");

  if (nextKey !== keyRef.current) {
    keyRef.current = nextKey;
    stableRef.current = processed;
  }

  return stableRef.current;
}

export function useFestivalFlowLanguage(): string {
  const [language, setLanguage] = useState(getStoredLanguage);

  useEffect(() => {
    const handleLanguageChange = (event: Event) => {
      const nextLanguage = (event as CustomEvent<{ language?: string }>).detail?.language;

      if (nextLanguage) {
        setLanguage(nextLanguage);
      }
    };

    window.addEventListener("festival-flow-language-change", handleLanguageChange);
    window.addEventListener("storage", handleLanguageChange);

    return () => {
      window.removeEventListener("festival-flow-language-change", handleLanguageChange);
      window.removeEventListener("storage", handleLanguageChange);
    };
  }, []);

  return language;
}

export function useAutoTranslate(
  baseTexts: string[],
  language: string,
  token?: string | null
): { tAuto: (text: string) => string; language: string } {
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const textsToTranslate = useStableTexts(baseTexts);

  useEffect(() => {
    setTranslations((current) => (Object.keys(current).length === 0 ? current : {}));

    if (language === BASE_LANGUAGE) {
      return;
    }

    const missingTexts: string[] = [];

    textsToTranslate.forEach((text) => {
      const cachedTranslation = getCachedTranslation(language, text);

      if (!cachedTranslation) {
        missingTexts.push(text);
      }
    });

    if (!missingTexts.length || !token) {
      return;
    }

    let isMounted = true;
    const requestKey = `auto-translate:${language}:${missingTexts.join("|")}`;

    reusePendingRequest(requestKey, () =>
      translateTexts(
        {
          texts: missingTexts,
          target_lang: language,
          source_language: BASE_LANGUAGE,
        },
        token
      )
    )
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setCachedTranslations(language, response.translations);
        setTranslations((current) => {
          const nextTranslations = { ...current };

          response.translations.forEach((translation) => {
            nextTranslations[translation.original] = translation.translated;
          });

          return nextTranslations;
        });
      })
      .catch(() => {
        // Keep base Spanish text if translation fails.
      });

    return () => {
      isMounted = false;
    };
  }, [language, textsToTranslate, token]);

  const tAuto = useCallback(
    (text: string): string => {
      if (language === BASE_LANGUAGE || !shouldTranslate(text)) {
        return text;
      }

      return translations[text.trim()] ?? getCachedTranslation(language, text.trim()) ?? text;
    },
    [language, translations]
  );

  return { tAuto, language };
}
