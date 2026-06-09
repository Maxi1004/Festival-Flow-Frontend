import type {
  AvailableTalent,
  CrewMember,
  TalentApplication,
  TalentProfileFallback,
} from "../types/talent";

type TalentIdentitySource = {
  user_id?: string | null;
  user_uid?: string | null;
  talent_id?: string | null;
  talent_uid?: string | null;
  talent_user_id?: string | null;
  name?: string | null;
  display_name?: string | null;
  talent_name?: string | null;
  email?: string | null;
  talent_email?: string | null;
  photo_url?: string | null;
  picture?: string | null;
  avatar_url?: string | null;
  profile?: Partial<TalentProfileFallback> | null;
  talent_profile?: Partial<TalentProfileFallback> | null;
  talent?: {
    id?: string | null;
    user_id?: string | null;
    user_uid?: string | null;
    name?: string | null;
    display_name?: string | null;
    email?: string | null;
    profile?: Partial<TalentProfileFallback> | null;
  } | null;
  user?: {
    name?: string | null;
    display_name?: string | null;
    email?: string | null;
  } | null;
  application?: {
    talent_id?: string | null;
    talent_uid?: string | null;
  } | null;
};

function firstValue(...values: Array<string | null | undefined>): string {
  return values.find((value) => value?.trim())?.trim() ?? "";
}

export function getTalentIdentityEmail(
  item: TalentIdentitySource,
  fallback = "Sin correo"
): string {
  return firstValue(
    item.email,
    item.talent_email,
    item.talent?.email,
    item.user?.email
  ) || fallback;
}

export function getTalentIdentityName(
  item: TalentIdentitySource,
  fallback = "Talento sin nombre"
): string {
  return firstValue(
    item.name,
    item.display_name,
    item.talent_name,
    item.profile?.display_name,
    item.talent_profile?.display_name,
    item.talent?.name,
    item.talent?.display_name,
    item.user?.name,
    item.user?.display_name,
    item.email,
    item.talent_email
  ) || fallback;
}

export function getTalentIdentityPhoto(item: TalentIdentitySource): string {
  return firstValue(
    item.photo_url,
    item.picture,
    item.avatar_url,
    item.profile?.photo_url,
    item.talent_profile?.photo_url,
    item.talent?.profile?.photo_url
  );
}

export function resolveTalentUserId(source: TalentIdentitySource): string {
  return firstValue(
    source.user_id,
    source.user_uid,
    source.talent_user_id,
    source.talent_uid,
    source.talent_id,
    source.profile?.user_uid,
    source.talent?.user_uid,
    source.talent?.user_id,
    source.talent?.id,
    source.application?.talent_id,
    source.application?.talent_uid
  );
}

export const getCrewMemberEmail = getTalentIdentityEmail;
export const getCrewMemberName = getTalentIdentityName;
export const getCrewMemberPhoto = getTalentIdentityPhoto;

export function talentFallbackFromAvailableTalent(
  talent: AvailableTalent
): TalentProfileFallback {
  return {
    user_id: resolveTalentUserId(talent),
    display_name: getTalentIdentityName(talent),
    email: getTalentIdentityEmail(talent),
    photo_url: getTalentIdentityPhoto(talent),
    bio: talent.profile?.bio,
    main_specialty: talent.profile?.main_specialty ?? talent.main_specialty ?? undefined,
    specialties: talent.profile?.specialties ?? talent.specialties,
    skills: talent.profile?.skills,
    languages: talent.profile?.languages,
    experience_years: talent.profile?.experience_years,
    location: talent.location ?? talent.work_location ?? talent.profile?.location,
    work_modality: talent.work_modality,
    availability_status: talent.status,
    available_from: talent.available_from,
    availability_notes: talent.notes,
    portfolio_links: talent.profile?.portfolio_links,
    portfolio_items: talent.profile?.portfolio_items,
    portfolio_pdf_url: talent.profile?.portfolio_pdf_url,
  };
}

export function talentFallbackFromApplication(
  application: TalentApplication
): TalentProfileFallback {
  const profile =
    application.talent_profile ?? application.profile ?? application.talent?.profile;

  return {
    user_id: resolveTalentUserId(application),
    display_name: getTalentIdentityName(application),
    email: getTalentIdentityEmail(application),
    photo_url: getTalentIdentityPhoto(application),
    bio: profile?.bio,
    main_specialty: application.main_specialty ?? profile?.main_specialty,
    specialties: application.specialties ?? profile?.specialties,
    skills: profile?.skills,
    languages: profile?.languages,
    experience_years: profile?.experience_years,
    location: profile?.location,
    portfolio_links: profile?.portfolio_links,
    portfolio_items: profile?.portfolio_items,
    portfolio_pdf_url: profile?.portfolio_pdf_url,
  };
}

export function talentFallbackFromCrewMember(
  member: CrewMember
): TalentProfileFallback {
  const profile =
    member.talent?.profile ?? member.talent_profile ?? member.profile;

  return {
    user_id: resolveTalentUserId(member),
    display_name: getTalentIdentityName(member),
    email: getTalentIdentityEmail(member),
    photo_url: getTalentIdentityPhoto(member),
    bio: profile?.bio,
    main_specialty:
      profile?.main_specialty ??
      member.main_specialty ??
      member.specialty ??
      member.category ??
      undefined,
    specialties: profile?.specialties ?? member.specialties,
    skills: profile?.skills,
    languages: profile?.languages,
    experience_years: profile?.experience_years,
    location: profile?.location,
    portfolio_links: profile?.portfolio_links,
    portfolio_items: profile?.portfolio_items,
    portfolio_pdf_url: profile?.portfolio_pdf_url,
  };
}
