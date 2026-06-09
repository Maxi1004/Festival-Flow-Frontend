import type { CrewMember } from "../types/talent";

export const CREW_CATEGORIES = [
  "ACTOR",
  "CAMERA",
  "SOUND",
  "LIGHTING",
  "PRODUCTION",
  "ART",
  "FX",
  "MAKEUP",
  "HAIR",
  "WARDROBE",
  "STUNT",
  "CATERING",
  "OTHER",
] as const;

export type CrewCategory = (typeof CREW_CATEGORIES)[number];

export const CREW_CATEGORY_LABELS: Record<CrewCategory, string> = {
  ACTOR: "Actor / Actress",
  CAMERA: "Camera",
  SOUND: "Sound",
  LIGHTING: "Lighting",
  PRODUCTION: "Production",
  ART: "Art",
  FX: "FX",
  MAKEUP: "Makeup",
  HAIR: "Hair",
  WARDROBE: "Wardrobe",
  STUNT: "Stunt",
  CATERING: "Catering",
  OTHER: "Other",
};

function normalizeCategoryText(value?: string | null): string {
  return (
    value
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase() ?? ""
  );
}

const CATEGORY_ALIASES: Record<string, CrewCategory> = {
  actor: "ACTOR",
  actress: "ACTOR",
  "actor / actress": "ACTOR",
  camera: "CAMERA",
  camara: "CAMERA",
  sound: "SOUND",
  sonido: "SOUND",
  lighting: "LIGHTING",
  iluminacion: "LIGHTING",
  production: "PRODUCTION",
  produccion: "PRODUCTION",
  art: "ART",
  arte: "ART",
  fx: "FX",
  makeup: "MAKEUP",
  maquillaje: "MAKEUP",
  hair: "HAIR",
  peluqueria: "HAIR",
  wardrobe: "WARDROBE",
  vestuario: "WARDROBE",
  stunt: "STUNT",
  catering: "CATERING",
  other: "OTHER",
  otro: "OTHER",
  direccion: "OTHER",
};

const CATEGORY_RULES: Array<[CrewCategory, string[]]> = [
  ["ACTOR", ["actor principal", "actor secundario", "extra", "villano", "actriz", "actor"]],
  ["CAMERA", ["director de fotografia", "director fotografia", "operador de camara", "operador camara", "camarografo"]],
  ["SOUND", ["sonidista", "audio"]],
  ["LIGHTING", ["iluminacion", "gaffer"]],
  ["PRODUCTION", ["asistente de produccion", "productor", "produccion"]],
  ["ART", ["direccion de arte", "direccion arte", "arte"]],
  ["FX", ["efectos especiales", "fx"]],
  ["MAKEUP", ["maquillaje"]],
  ["HAIR", ["peluqueria"]],
  ["WARDROBE", ["vestuario"]],
  ["STUNT", ["doble de riesgo"]],
  ["CATERING", ["catering"]],
];

export function normalizeCrewCategory(value?: string | null): CrewCategory | null {
  const normalizedValue = normalizeCategoryText(value);

  if (!normalizedValue) {
    return null;
  }

  const officialCategory = CREW_CATEGORIES.find(
    (category) => category.toLowerCase() === normalizedValue
  );

  return officialCategory ?? CATEGORY_ALIASES[normalizedValue] ?? null;
}

export function inferCrewCategoryFromText(...values: Array<string | null | undefined>): CrewCategory {
  for (const value of values) {
    const normalizedValue = normalizeCategoryText(value);

    if (!normalizedValue) {
      continue;
    }

    const directCategory = normalizeCrewCategory(value);

    if (directCategory && directCategory !== "OTHER") {
      return directCategory;
    }

    const rule = CATEGORY_RULES.find(([, keywords]) =>
      keywords.some((keyword) => normalizedValue.includes(keyword))
    );

    if (rule) {
      return rule[0];
    }
  }

  return "OTHER";
}

export function getCrewMemberCategory(member: CrewMember): CrewCategory {
  const explicitCategory = normalizeCrewCategory(member.category ?? member.task_category);

  if (explicitCategory) {
    return explicitCategory;
  }

  return inferCrewCategoryFromText(
    member.role,
    member.role_needed,
    member.specialty,
    member.opportunity?.role_needed,
    member.opportunity?.specialty,
    member.main_specialty,
    member.profile?.main_specialty,
    member.talent_profile?.main_specialty,
    member.talent?.profile?.main_specialty,
    ...(member.specialties ?? []),
    ...(member.profile?.specialties ?? []),
    ...(member.talent_profile?.specialties ?? []),
    ...(member.talent?.profile?.specialties ?? [])
  );
}

export function getCrewCategoryLabel(category: CrewCategory): string {
  return CREW_CATEGORY_LABELS[category];
}
