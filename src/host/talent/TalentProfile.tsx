import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCurrentProfile } from "../useCurrentProfile";
import {
  getMyTalentProfile,
  updateMyTalentProfile,
} from "../../service/talentApi";
import type { TalentProfileUpdatePayload } from "../../types/talent";
import "../../styles/talent.css";

type TalentProfileFormState = {
  display_name: string;
  bio: string;
  main_specialty: string;
  specialties: string;
  location: string;
  experience_years: string;
  languages: string;
  skills: string;
  profile_completion: string;
  is_public: boolean;
  portfolio_links: string;
};

const initialFormState: TalentProfileFormState = {
  display_name: "",
  bio: "",
  main_specialty: "",
  specialties: "",
  location: "",
  experience_years: "0",
  languages: "",
  skills: "",
  profile_completion: "0",
  is_public: true,
  portfolio_links: "",
};

function splitMultivalueField(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function clampPercentage(value: string): number {
  const parsedValue = Number(value);

  if (Number.isNaN(parsedValue)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(parsedValue)));
}

function mapProfileToFormState(
  profile: Partial<TalentProfileUpdatePayload> | null,
  fallbackDisplayName: string
): TalentProfileFormState {
  if (!profile) {
    return {
      ...initialFormState,
      display_name: fallbackDisplayName,
    };
  }

  return {
    display_name: profile.display_name ?? fallbackDisplayName,
    bio: profile.bio ?? "",
    main_specialty: profile.main_specialty ?? "",
    specialties: (profile.specialties ?? []).join(", "),
    location: profile.location ?? "",
    experience_years: String(profile.experience_years ?? 0),
    languages: (profile.languages ?? []).join(", "),
    skills: (profile.skills ?? []).join(", "),
    profile_completion: String(profile.profile_completion ?? 0),
    is_public: profile.is_public ?? true,
    portfolio_links: (profile.portfolio_links ?? []).join("\n"),
  };
}

function normalizeProfilePayload(
  formData: TalentProfileFormState
): TalentProfileUpdatePayload {
  return {
    display_name: formData.display_name.trim(),
    bio: formData.bio.trim(),
    main_specialty: formData.main_specialty.trim(),
    specialties: splitMultivalueField(formData.specialties),
    location: formData.location.trim(),
    experience_years: Math.max(0, Number(formData.experience_years) || 0),
    languages: splitMultivalueField(formData.languages),
    skills: splitMultivalueField(formData.skills),
    profile_completion: clampPercentage(formData.profile_completion),
    is_public: formData.is_public,
    portfolio_links: splitMultivalueField(formData.portfolio_links),
  };
}

function TalentProfile() {
  const { t } = useTranslation();
  const { user, profile } = useCurrentProfile();
  const fallbackDisplayName = profile?.name?.trim() || user?.displayName?.trim() || t("talent.profile.fallbackName");
  const [formData, setFormData] = useState<TalentProfileFormState>({
    ...initialFormState,
    display_name: fallbackDisplayName,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        setError("");
        setSuccessMessage("");
        const nextProfile = await getMyTalentProfile();

        if (!isMounted) {
          return;
        }

        setFormData(mapProfileToFormState(nextProfile, fallbackDisplayName));
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : t("talent.errors.loadProfile")
          );
          setFormData(mapProfileToFormState(null, fallbackDisplayName));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [fallbackDisplayName, t]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = event.target;
    const nextValue =
      type === "checkbox" && "checked" in event.target ? event.target.checked : value;

    setFormData((current) => ({
      ...current,
      [name]: nextValue,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSaving(true);
      setError("");
      setSuccessMessage("");
      const savedProfile = await updateMyTalentProfile(normalizeProfilePayload(formData));
      setFormData(mapProfileToFormState(savedProfile, fallbackDisplayName));
      setSuccessMessage(t("talent.profile.success"));
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("talent.errors.saveProfile")
      );
    } finally {
      setIsSaving(false);
    }
  };

  const specialties = useMemo(
    () => splitMultivalueField(formData.specialties),
    [formData.specialties]
  );
  const portfolioLinks = useMemo(
    () => splitMultivalueField(formData.portfolio_links),
    [formData.portfolio_links]
  );
  const displayName = formData.display_name.trim() || fallbackDisplayName;
  const avatarLetter = displayName.charAt(0).toUpperCase() || "T";
  const profileCompletion = clampPercentage(formData.profile_completion);

  return (
    <div className="talent-page">
      <section className="talent-card talent-profile-header">
        <div className="talent-avatar" aria-hidden="true">
          {avatarLetter}
        </div>

        <div className="talent-profile-header__content">
          <div>
            <p className="talent-page__eyebrow">{t("talent.profile.eyebrow")}</p>
            <h1 className="talent-page__title">{displayName}</h1>
            <p className="talent-page__subtitle">
              {formData.main_specialty.trim() || t("talent.profile.completeMainSpecialty")}
            </p>
          </div>

          <div className="talent-meta-list">
            <span>{formData.location.trim() || t("talent.profile.pendingLocation")}</span>
            <span>{profileCompletion}% {t("common.completed")}</span>
            <span>{formData.is_public ? t("talent.profile.public") : t("talent.profile.private")}</span>
          </div>
        </div>

        <div className="talent-actions">
          <button
            className="talent-button talent-button--primary"
            type="submit"
            form="talent-profile-form"
            disabled={isLoading || isSaving}
          >
            {isSaving ? t("common.saving") : t("talent.profile.save")}
          </button>
        </div>
      </section>

      {isLoading ? (
        <section className="talent-card">
          <p className="talent-feedback">{t("talent.profile.loading")}</p>
        </section>
      ) : (
        <form id="talent-profile-form" className="talent-stack" onSubmit={handleSubmit}>
          {error ? <p className="talent-feedback talent-feedback--error">{error}</p> : null}
          {successMessage ? (
            <p className="talent-feedback talent-feedback--success">{successMessage}</p>
          ) : null}

          <section className="talent-grid talent-grid--sidebar">
            <article className="talent-card">
              <div className="section-heading">
                <h2 className="section-heading__title">{t("talent.profile.professionalInfo")}</h2>
                <p className="section-heading__text">
                  {t("talent.profile.professionalInfoText")}
                </p>
              </div>

              <div className="talent-form-grid">
                <label className="talent-input-group">
                  <span>{t("talent.profile.displayName")}</span>
                  <input
                    name="display_name"
                    value={formData.display_name}
                    onChange={handleChange}
                    placeholder={t("talent.profile.displayNamePlaceholder")}
                  />
                </label>

                <label className="talent-input-group">
                  <span>{t("talent.profile.mainSpecialty")}</span>
                  <input
                    name="main_specialty"
                    value={formData.main_specialty}
                    onChange={handleChange}
                    placeholder={t("talent.profile.mainSpecialtyPlaceholder")}
                  />
                </label>

                <label className="talent-input-group">
                  <span>{t("talent.profile.location")}</span>
                  <input
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder={t("talent.profile.locationPlaceholder")}
                  />
                </label>

                <label className="talent-input-group">
                  <span>{t("talent.profile.experienceYears")}</span>
                  <input
                    type="number"
                    min="0"
                    name="experience_years"
                    value={formData.experience_years}
                    onChange={handleChange}
                  />
                </label>

                <label className="talent-input-group">
                  <span>{t("talent.profile.specialties")}</span>
                  <input
                    name="specialties"
                    value={formData.specialties}
                    onChange={handleChange}
                    placeholder={t("talent.profile.commaSeparated")}
                  />
                </label>

                <label className="talent-input-group">
                  <span>{t("talent.profile.languages")}</span>
                  <input
                    name="languages"
                    value={formData.languages}
                    onChange={handleChange}
                    placeholder={t("talent.profile.commaSeparatedMale")}
                  />
                </label>

                <label className="talent-input-group">
                  <span>{t("talent.profile.skills")}</span>
                  <input
                    name="skills"
                    value={formData.skills}
                    onChange={handleChange}
                    placeholder={t("talent.profile.commaSeparatedMale")}
                  />
                </label>

                <label className="talent-input-group">
                  <span>{t("talent.profile.completion")}</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    name="profile_completion"
                    value={formData.profile_completion}
                    onChange={handleChange}
                  />
                </label>

                <label className="talent-input-group talent-input-group--checkbox">
                  <input
                    type="checkbox"
                    name="is_public"
                    checked={formData.is_public}
                    onChange={handleChange}
                  />
                  <span>{t("talent.profile.public")}</span>
                </label>

                <label className="talent-input-group talent-input-group--full">
                  <span>{t("talent.profile.bio")}</span>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={5}
                    placeholder={t("talent.profile.bioPlaceholder")}
                  />
                </label>

                <label className="talent-input-group talent-input-group--full">
                  <span>{t("talent.profile.portfolioLinks")}</span>
                  <textarea
                    name="portfolio_links"
                    value={formData.portfolio_links}
                    onChange={handleChange}
                    rows={4}
                    placeholder={t("talent.profile.oneLinkPerLine")}
                  />
                </label>
              </div>
            </article>

            <aside className="talent-card">
              <div className="section-heading">
                <h2 className="section-heading__title">{t("talent.profile.profileStatus")}</h2>
                <p className="section-heading__text">
                  {t("talent.profile.profileStatusText")}
                </p>
              </div>

              <div className="talent-progress">
                <div className="talent-progress__track" aria-hidden="true">
                  <span
                    className="talent-progress__bar"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
                <strong>{profileCompletion}% {t("common.completed")}</strong>
              </div>

              <ul className="talent-chip-list">
                {specialties.length > 0 ? (
                  specialties.map((specialty) => (
                    <li key={specialty} className="talent-chip-list__item">
                      {specialty}
                    </li>
                  ))
                ) : (
                  <li className="talent-chip-list__item">{t("talent.profile.noSpecialties")}</li>
                )}
              </ul>
            </aside>
          </section>

          <section className="talent-grid">
            <article className="talent-card">
              <div className="section-heading">
                <h2 className="section-heading__title">{t("talent.profile.portfolio")}</h2>
                <p className="section-heading__text">
                  {t("talent.profile.portfolioText")}
                </p>
              </div>

              <div className="talent-list">
                {portfolioLinks.length > 0 ? (
                  portfolioLinks.map((link) => (
                    <div key={link} className="talent-list__item">
                      <div>
                        <h3 className="talent-list__title">{link}</h3>
                        <p className="talent-list__text">{t("talent.profile.linkedResource")}</p>
                      </div>
                      <a
                        className="talent-inline-link"
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t("talent.profile.viewResource")}
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="talent-list__item">
                    <div>
                      <h3 className="talent-list__title">{t("talent.profile.noLinks")}</h3>
                      <p className="talent-list__text">
                        {t("talent.profile.noLinksText")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </article>

            <article className="talent-card">
              <div className="section-heading">
                <h2 className="section-heading__title">{t("talent.profile.visibility")}</h2>
                <p className="section-heading__text">
                  {t("talent.profile.visibilityText")}
                </p>
              </div>

              <div className="talent-stack">
                <div className="talent-field">
                  <span className="talent-field__label">{t("talent.profile.visibleName")}</span>
                  <p className="talent-field__text">{displayName}</p>
                </div>
                <div className="talent-field">
                  <span className="talent-field__label">{t("talent.profile.bio")}</span>
                  <p className="talent-field__text">
                    {formData.bio.trim() || t("talent.profile.noBio")}
                  </p>
                </div>
                <div className="talent-field">
                  <span className="talent-field__label">{t("talent.profile.visibilityLabel")}</span>
                  <p className="talent-field__text">
                    {formData.is_public
                      ? t("talent.profile.publicText")
                      : t("talent.profile.privateText")}
                  </p>
                </div>
              </div>
            </article>
          </section>
        </form>
      )}
    </div>
  );
}

export default TalentProfile;
