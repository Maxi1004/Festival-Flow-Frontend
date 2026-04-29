import { useEffect, useMemo, useState } from "react";
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
  const { user, profile } = useCurrentProfile();
  const fallbackDisplayName = profile?.name?.trim() || user?.displayName?.trim() || "Talento";
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
              : "No se pudo cargar tu perfil."
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
  }, [fallbackDisplayName]);

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
      setSuccessMessage("Perfil guardado correctamente.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo guardar el perfil."
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
            <p className="talent-page__eyebrow">Mi perfil</p>
            <h1 className="talent-page__title">{displayName}</h1>
            <p className="talent-page__subtitle">
              {formData.main_specialty.trim() || "Completa tu especialidad principal"}
            </p>
          </div>

          <div className="talent-meta-list">
            <span>{formData.location.trim() || "Ubicacion pendiente"}</span>
            <span>{profileCompletion}% completado</span>
            <span>{formData.is_public ? "Perfil publico" : "Perfil privado"}</span>
          </div>
        </div>

        <div className="talent-actions">
          <button
            className="talent-button talent-button--primary"
            type="submit"
            form="talent-profile-form"
            disabled={isLoading || isSaving}
          >
            {isSaving ? "Guardando..." : "Guardar perfil"}
          </button>
        </div>
      </section>

      {isLoading ? (
        <section className="talent-card">
          <p className="talent-feedback">Cargando perfil...</p>
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
                <h2 className="section-heading__title">Informacion profesional</h2>
                <p className="section-heading__text">
                  Edita los datos base que veran productores y equipos al revisar tu perfil.
                </p>
              </div>

              <div className="talent-form-grid">
                <label className="talent-input-group">
                  <span>Nombre para mostrar</span>
                  <input
                    name="display_name"
                    value={formData.display_name}
                    onChange={handleChange}
                    placeholder="Tu nombre profesional"
                  />
                </label>

                <label className="talent-input-group">
                  <span>Especialidad principal</span>
                  <input
                    name="main_specialty"
                    value={formData.main_specialty}
                    onChange={handleChange}
                    placeholder="Actriz, montajista, sonidista..."
                  />
                </label>

                <label className="talent-input-group">
                  <span>Ubicacion</span>
                  <input
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="Santiago, Chile"
                  />
                </label>

                <label className="talent-input-group">
                  <span>Años de experiencia</span>
                  <input
                    type="number"
                    min="0"
                    name="experience_years"
                    value={formData.experience_years}
                    onChange={handleChange}
                  />
                </label>

                <label className="talent-input-group">
                  <span>Especialidades</span>
                  <input
                    name="specialties"
                    value={formData.specialties}
                    onChange={handleChange}
                    placeholder="Separadas por coma"
                  />
                </label>

                <label className="talent-input-group">
                  <span>Idiomas</span>
                  <input
                    name="languages"
                    value={formData.languages}
                    onChange={handleChange}
                    placeholder="Separados por coma"
                  />
                </label>

                <label className="talent-input-group">
                  <span>Skills</span>
                  <input
                    name="skills"
                    value={formData.skills}
                    onChange={handleChange}
                    placeholder="Separados por coma"
                  />
                </label>

                <label className="talent-input-group">
                  <span>Completitud del perfil</span>
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
                  <span>Perfil publico</span>
                </label>

                <label className="talent-input-group talent-input-group--full">
                  <span>Biografia</span>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={5}
                    placeholder="Cuenta tu experiencia, enfoque y tipo de proyectos."
                  />
                </label>

                <label className="talent-input-group talent-input-group--full">
                  <span>Portfolio links</span>
                  <textarea
                    name="portfolio_links"
                    value={formData.portfolio_links}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Un link por linea"
                  />
                </label>
              </div>
            </article>

            <aside className="talent-card">
              <div className="section-heading">
                <h2 className="section-heading__title">Estado del perfil</h2>
                <p className="section-heading__text">
                  Resumen en vivo de los datos que se estan guardando en backend.
                </p>
              </div>

              <div className="talent-progress">
                <div className="talent-progress__track" aria-hidden="true">
                  <span
                    className="talent-progress__bar"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
                <strong>{profileCompletion}% completado</strong>
              </div>

              <ul className="talent-chip-list">
                {specialties.length > 0 ? (
                  specialties.map((specialty) => (
                    <li key={specialty} className="talent-chip-list__item">
                      {specialty}
                    </li>
                  ))
                ) : (
                  <li className="talent-chip-list__item">Sin especialidades aun</li>
                )}
              </ul>
            </aside>
          </section>

          <section className="talent-grid">
            <article className="talent-card">
              <div className="section-heading">
                <h2 className="section-heading__title">Portafolio</h2>
                <p className="section-heading__text">
                  Links reales guardados en tu perfil para compartir material y referencias.
                </p>
              </div>

              <div className="talent-list">
                {portfolioLinks.length > 0 ? (
                  portfolioLinks.map((link) => (
                    <div key={link} className="talent-list__item">
                      <div>
                        <h3 className="talent-list__title">{link}</h3>
                        <p className="talent-list__text">Recurso vinculado a tu perfil real.</p>
                      </div>
                      <a
                        className="talent-inline-link"
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ver recurso
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="talent-list__item">
                    <div>
                      <h3 className="talent-list__title">Sin links registrados</h3>
                      <p className="talent-list__text">
                        Puedes agregar enlaces a reels, portafolios o redes profesionales.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </article>

            <article className="talent-card">
              <div className="section-heading">
                <h2 className="section-heading__title">Visibilidad del perfil</h2>
                <p className="section-heading__text">
                  Esta seccion usa datos reales del formulario actual en lugar de contenido mock.
                </p>
              </div>

              <div className="talent-stack">
                <div className="talent-field">
                  <span className="talent-field__label">Nombre visible</span>
                  <p className="talent-field__text">{displayName}</p>
                </div>
                <div className="talent-field">
                  <span className="talent-field__label">Bio</span>
                  <p className="talent-field__text">
                    {formData.bio.trim() || "Todavia no has agregado una biografia."}
                  </p>
                </div>
                <div className="talent-field">
                  <span className="talent-field__label">Visibilidad</span>
                  <p className="talent-field__text">
                    {formData.is_public
                      ? "Tu perfil esta visible para nuevas oportunidades."
                      : "Tu perfil esta marcado como privado."}
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
