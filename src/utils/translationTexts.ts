function isIgnoredTranslationText(value: string): boolean {
  const text = value.trim();

  if (!text) {
    return true;
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
    return true;
  }

  if (/^https?:\/\//i.test(text) || /^www\./i.test(text)) {
    return true;
  }

  if (/^\+?[\d\s().-]{7,}$/.test(text)) {
    return true;
  }

  if (/^[\d\s.,:/-]+$/.test(text)) {
    return true;
  }

  if (/^[a-f0-9-]{12,}$/i.test(text)) {
    return true;
  }

  return false;
}

export function collectTranslationTexts(values: Array<string | null | undefined>): string[] {
  const texts = values
    .map((value) => value?.trim() ?? "")
    .filter((value) => !isIgnoredTranslationText(value));

  return Array.from(new Set(texts));
}

export function combineTranslationTexts(
  baseTexts: string[],
  ...dynamicTextGroups: Array<Array<string | null | undefined>>
): string[] {
  return collectTranslationTexts([...baseTexts, ...dynamicTextGroups.flat()]);
}
