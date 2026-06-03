import type { TranslationItem } from "./translationApi";

const TRANSLATION_CACHE_KEY = "festival_flow_translation_cache";

type TranslationCache = Record<string, Record<string, string>>;

function readTranslationCache(): TranslationCache {
  try {
    const rawValue = window.localStorage.getItem(TRANSLATION_CACHE_KEY);

    return rawValue ? JSON.parse(rawValue) as TranslationCache : {};
  } catch {
    return {};
  }
}

function writeTranslationCache(cache: TranslationCache) {
  try {
    window.localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Cache writes should never block the UI.
  }
}

export function getCachedTranslation(language: string, text: string): string | null {
  return readTranslationCache()[language]?.[text] ?? null;
}

export function setCachedTranslations(language: string, translations: TranslationItem[]) {
  const cache = readTranslationCache();
  const languageCache = cache[language] ?? {};

  translations.forEach((translation) => {
    if (translation.original && translation.translated) {
      languageCache[translation.original] = translation.translated;
    }
  });

  writeTranslationCache({
    ...cache,
    [language]: languageCache,
  });
}

export function clearTranslationCache() {
  try {
    window.localStorage.removeItem(TRANSLATION_CACHE_KEY);
  } catch {
    // Ignore localStorage failures.
  }
}
