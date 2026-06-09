import { useEffect, useMemo, useState } from "react";
import { getTalentPublicProfile } from "../service/talentApi";
import type {
  PortfolioItem,
  TalentProfileFallback,
  TalentPublicProfile,
} from "../types/talent";
import { formatDisplayDate } from "../host/producer/utils";
import TalentAvatar from "./TalentAvatar";

type TalentProfileModalProps = {
  userId: string;
  fallback?: TalentProfileFallback | null;
  token?: string;
  onClose: () => void;
};

function text(value?: string | null): string {
  return value?.trim() ?? "";
}

function unique(values?: string[] | null): string[] {
  return Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean)));
}

function formatModality(value?: string | null): string {
  const labels: Record<string, string> = {
    FREELANCE: "Freelance",
    REMOTE: "Remoto",
    HYBRID: "Hibrido",
    ONSITE: "Presencial",
  };

  return labels[text(value).toUpperCase()] ?? text(value);
}

function formatAvailability(value?: string | null): string {
  const labels: Record<string, string> = {
    AVAILABLE: "Disponible",
    UNAVAILABLE: "No disponible",
  };

  return labels[text(value).toUpperCase()] ?? text(value);
}

function portfolioLinks(profile: TalentProfileFallback) {
  const links = (profile.portfolio_links ?? [])
    .map((link, index) =>
      typeof link === "string"
        ? { label: `Portafolio ${index + 1}`, url: link }
        : { label: text(link.label) || `Portafolio ${index + 1}`, url: link.url }
    )
    .filter((link) => text(link.url));

  if (text(profile.portfolio_url)) {
    links.unshift({ label: "Portafolio", url: profile.portfolio_url ?? "" });
  }

  return links.filter(
    (link, index, allLinks) =>
      allLinks.findIndex((candidate) => candidate.url === link.url) === index
  );
}

function portfolioItems(profile: TalentProfileFallback): PortfolioItem[] {
  return (profile.portfolio_items ?? []).filter(
    (item) => text(item.title) || text(item.url)
  );
}

function mergeProfile(
  fallback: TalentProfileFallback,
  loaded: TalentPublicProfile | null
): TalentProfileFallback {
  const availability = loaded?.availability;
  const loadedName = text(loaded?.display_name) || text(loaded?.name);

  return {
    ...fallback,
    ...loaded,
    display_name:
      loadedName ||
      fallback.display_name ||
      fallback.name ||
      undefined,
    email: text(loaded?.email) || fallback.email,
    photo_url:
      text(loaded?.photo_url) || text(loaded?.picture) || fallback.photo_url,
    bio: text(loaded?.bio) || fallback.bio,
    main_specialty:
      text(loaded?.main_specialty) || fallback.main_specialty,
    experience_years:
      loaded?.experience_years ?? fallback.experience_years,
    specialties: loaded?.specialties?.length
      ? loaded.specialties
      : fallback.specialties,
    skills: loaded?.skills?.length ? loaded.skills : fallback.skills,
    languages: loaded?.languages?.length ? loaded.languages : fallback.languages,
    portfolio_links: loaded?.portfolio_links?.length
      ? loaded.portfolio_links
      : fallback.portfolio_links,
    portfolio_items: loaded?.portfolio_items?.length
      ? loaded.portfolio_items
      : fallback.portfolio_items,
    portfolio_url: text(loaded?.portfolio_url) || fallback.portfolio_url,
    portfolio_pdf_url:
      text(loaded?.portfolio_pdf_url) || fallback.portfolio_pdf_url,
    location:
      text(availability?.location) ||
      text(loaded?.location) ||
      fallback.location,
    work_modality:
      text(availability?.work_modality) ||
      text(loaded?.work_modality) ||
      fallback.work_modality,
    availability_status:
      text(availability?.status) ||
      text(loaded?.availability_status) ||
      fallback.availability_status,
    available_from:
      text(availability?.available_from) ||
      text(loaded?.available_from) ||
      fallback.available_from,
    availability_notes:
      text(availability?.notes) ||
      text(loaded?.availability_notes) ||
      text(loaded?.notes) ||
      fallback.availability_notes,
  };
}

function Value({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  const visibleValue =
    value === 0 || (typeof value === "number" && Number.isFinite(value))
      ? String(value)
      : text(typeof value === "string" ? value : null);

  return (
    <div>
      <span>{label}</span>
      <strong>{visibleValue || "No informado"}</strong>
    </div>
  );
}

export default function TalentProfileModal({
  userId,
  fallback,
  token,
  onClose,
}: TalentProfileModalProps) {
  const [loadedProfile, setLoadedProfile] = useState<TalentPublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [error, setError] = useState(
    userId ? "" : "No se pudo identificar el user_id del talento."
  );

  useEffect(() => {
    let active = true;

    if (!userId) {
      return () => {
        active = false;
      };
    }

    void getTalentPublicProfile(userId, token)
      .then((profile) => {
        if (active) setLoadedProfile(profile);
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar la ficha completa del talento."
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, userId]);

  const profile = useMemo(
    () => mergeProfile(fallback ?? {}, loadedProfile),
    [fallback, loadedProfile]
  );
  const name = text(profile.display_name) || text(profile.name) || "Talento sin nombre";
  const photoUrl = text(profile.photo_url);
  const specialties = unique(profile.specialties);
  const skills = unique(profile.skills);
  const languages = unique(profile.languages);
  const links = portfolioLinks(profile);
  const items = portfolioItems(profile);

  return (
    <div className="producer-modal talent-profile-modal" role="presentation">
      <article
        className="producer-modal__panel producer-project-detail-modal talent-profile-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="talent-profile-title"
      >
        <div className="producer-project-detail-modal__header">
          <div className="talent-profile-modal__identity">
            <TalentAvatar src={photoUrl} name={name} size="lg" />
            <div>
              <p className="producer-page__eyebrow">Ficha de talento</p>
              <h2 id="talent-profile-title">{name}</h2>
              <p className="producer-record__eyebrow">
                {text(profile.email) || "Email no informado"}
              </p>
            </div>
          </div>
          <button className="producer-button producer-button--primary" type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>

        {isLoading ? (
          <p className="producer-muted">Cargando ficha completa...</p>
        ) : null}
        {error ? (
          <p className="talent-profile-modal__warning" role="status">
            No se pudo actualizar la ficha completa. Se muestran los datos disponibles.
          </p>
        ) : null}

        <p className="producer-record__text">
          {text(profile.bio) || "Bio no informada."}
        </p>

        <div className="producer-project-detail-grid">
          <Value label="Especialidad principal" value={profile.main_specialty} />
          <Value
            label="Anos de experiencia"
            value={
              profile.experience_years === undefined
                ? null
                : `${profile.experience_years} anos`
            }
          />
          <Value label="Ubicacion" value={profile.location} />
          <Value label="Modalidad de trabajo" value={formatModality(profile.work_modality)} />
          <Value
            label="Disponibilidad"
            value={formatAvailability(profile.availability_status)}
          />
          <Value
            label="Disponible desde"
            value={profile.available_from ? formatDisplayDate(profile.available_from) : null}
          />
        </div>

        {text(profile.availability_notes) ? (
          <div className="talent-profile-modal__notes">
            <strong>Notas de disponibilidad</strong>
            <p>{profile.availability_notes}</p>
          </div>
        ) : null}

        <div className="talent-profile-modal__sections">
          <ProfileChips label="Especialidades / categorias" values={specialties} />
          <ProfileChips label="Habilidades" values={skills} />
          <ProfileChips label="Idiomas" values={languages} />
        </div>

        <section className="talent-profile-modal__portfolio">
          <strong>Portafolio</strong>
          {links.length || items.length || text(profile.portfolio_pdf_url) ? (
            <div className="producer-talent-portfolio">
              {links.map((link) => (
                <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              ))}
              {items.map((item, index) =>
                text(item.url) ? (
                  <a key={`${item.url}-${index}`} href={item.url} target="_blank" rel="noreferrer">
                    {text(item.title) || `Trabajo ${index + 1}`}
                  </a>
                ) : (
                  <span key={`${item.title}-${index}`} className="producer-chip">
                    {item.title}
                  </span>
                )
              )}
              {text(profile.portfolio_pdf_url) ? (
                <a href={profile.portfolio_pdf_url ?? ""} target="_blank" rel="noreferrer">
                  Ver portfolio PDF
                </a>
              ) : null}
            </div>
          ) : (
            <span className="producer-muted">Sin portafolio informado.</span>
          )}
        </section>
      </article>
    </div>
  );
}

function ProfileChips({ label, values }: { label: string; values: string[] }) {
  return (
    <section>
      <strong>{label}</strong>
      {values.length ? (
        <div className="producer-chip-list">
          {values.map((value) => (
            <span key={value} className="producer-chip">{value}</span>
          ))}
        </div>
      ) : (
        <span className="producer-muted">No informado.</span>
      )}
    </section>
  );
}
