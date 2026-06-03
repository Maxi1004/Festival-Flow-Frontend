import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getMyTalentAvailability,
  getMyTalentCommitments,
  getMyTalentProfile,
  updateMyTalentAvailability,
} from "../../service/talentApi";
import { reusePendingRequest } from "../../service/pendingRequest";
import { useCurrentProfile } from "../useCurrentProfile";
import { WORK_MODALITY_OPTIONS } from "../../types/talent";
import type {
  AvailabilityStatus,
  TalentAvailability as TalentAvailabilityRecord,
  TalentAvailabilityUpdatePayload,
  TalentCommitment,
  TalentProfile,
  WorkModality,
} from "../../types/talent";
import "../../styles/talent.css";

type AvailabilityDisplayStatus = "IMMEDIATE" | "NOTICE" | "UNAVAILABLE";

type AvailabilityFormState = {
  display_status: AvailabilityDisplayStatus;
  travel_availability: "true" | "false";
  work_modality: WorkModality;
  city: string;
  country: string;
  available_from: string;
  notes: string;
};

const initialFormState: AvailabilityFormState = {
  display_status: "IMMEDIATE",
  travel_availability: "false",
  work_modality: "REMOTE",
  city: "",
  country: "",
  available_from: "",
  notes: "",
};

function toWorkModality(value: unknown): WorkModality {
  return WORK_MODALITY_OPTIONS.some((option) => option.value === value)
    ? (value as WorkModality)
    : "REMOTE";
}

function toTravelAvailabilityFormValue(value: unknown): AvailabilityFormState["travel_availability"] {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "string") {
    return ["si", "sí", "true", "1", "yes", "disponible"].includes(value.trim().toLowerCase())
      ? "true"
      : "false";
  }

  return "false";
}

function splitLocation(location: string | null | undefined): Pick<AvailabilityFormState, "city" | "country"> {
  const [city = "", ...countryParts] = (location ?? "").split(",");

  return {
    city: city.trim(),
    country: countryParts.join(",").trim(),
  };
}

function joinLocation(city: string, country: string): string {
  return [city.trim(), country.trim()].filter(Boolean).join(", ");
}

function toDateInputValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

function isFutureDate(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date.getTime() > today.getTime();
}

function isDateWithinRange(startDate: string | null, endDate: string | null): boolean {
  if (!startDate || !endDate) {
    return false;
  }

  const today = toDateInputValue(new Date());
  return startDate <= today && today <= endDate;
}

function formatDate(value: string | null, locale: string, fallback: string): string {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00`)
  );
}

function toDisplayStatus(
  status: AvailabilityStatus | string | null | undefined,
  availableFrom: string | null | undefined
): AvailabilityDisplayStatus {
  if (status === "UNAVAILABLE") {
    return "UNAVAILABLE";
  }

  return isFutureDate(availableFrom) ? "NOTICE" : "IMMEDIATE";
}

function mapAvailabilityToFormState(
  availability: Partial<TalentAvailabilityRecord> | null
): AvailabilityFormState {
  if (!availability) {
    return initialFormState;
  }

  const location = splitLocation(availability.location ?? availability.work_location);

  return {
    display_status: toDisplayStatus(availability.status, availability.available_from),
    travel_availability: toTravelAvailabilityFormValue(availability.travel_availability),
    work_modality: toWorkModality(availability.work_modality),
    city: location.city,
    country: location.country,
    available_from: availability.available_from ?? "",
    notes: availability.notes ?? "",
  };
}

function normalizeAvailabilityPayload(
  formData: AvailabilityFormState
): TalentAvailabilityUpdatePayload {
  return {
    status: formData.display_status === "UNAVAILABLE" ? "UNAVAILABLE" : "AVAILABLE",
    travel_availability: formData.travel_availability === "true",
    work_modality: formData.work_modality,
    location: joinLocation(formData.city, formData.country),
    available_from: formData.available_from || null,
    notes: formData.notes.trim(),
  };
}

function TalentAvailability() {
  const { t, i18n } = useTranslation();
  const { user, token, profile, isProfileLoading } = useCurrentProfile();
  const tRef = useRef(t);
  tRef.current = t;
  const [formData, setFormData] = useState<AvailabilityFormState>(initialFormState);
  const [talentProfile, setTalentProfile] = useState<Partial<TalentProfile> | null>(null);
  const [commitments, setCommitments] = useState<TalentCommitment[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (isProfileLoading) {
      setIsLoading(true);
      return;
    }

    if (!user || !token || !profile) {
      setError("");
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadAvailability() {
      try {
        setError("");
        setSuccessMessage("");
        const [nextAvailability, nextProfile, nextCommitments] = await Promise.all([
          reusePendingRequest(
            `talent-availability:${token}`,
            () => getMyTalentAvailability(token ?? undefined)
          ),
          reusePendingRequest(
            `talent-profile:${token}`,
            () => getMyTalentProfile(token ?? undefined, "TalentAvailability")
          ),
          reusePendingRequest(
            `talent-commitments:${token}`,
            () => getMyTalentCommitments(token ?? undefined)
          ),
        ]);

        if (!isMounted) {
          return;
        }

        setFormData(mapAvailabilityToFormState(nextAvailability));
        setUpdatedAt(nextAvailability?.updated_at ?? null);
        setTalentProfile(nextProfile);
        setCommitments(nextCommitments);
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : tRef.current("talent.errors.loadAvailability")
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAvailability();

    return () => {
      isMounted = false;
    };
  }, [isProfileLoading, profile, token, user]);

  const displayStatusOptions = useMemo(() => [
    {
      value: "IMMEDIATE" as const,
      label: t("talent.availability.statusImmediate", { defaultValue: "Disponible inmediatamente" }),
      tone: "available",
    },
    {
      value: "NOTICE" as const,
      label: t("talent.availability.statusNotice", { defaultValue: "Disponible con aviso previo" }),
      tone: "pending",
    },
    {
      value: "UNAVAILABLE" as const,
      label: t("talent.availability.statusUnavailable", { defaultValue: "No disponible" }),
      tone: "busy",
    },
  ], [t]);
  const selectedStatus = displayStatusOptions.find((option) => option.value === formData.display_status);
  const hasCurrentCommitment = commitments.some((commitment) =>
    isDateWithinRange(commitment.start_date, commitment.end_date)
  );
  const summaryStatus = hasCurrentCommitment
    ? {
        label: t("talent.availability.occupied", { defaultValue: "Ocupado por proyecto" }),
        tone: "busy",
      }
    : selectedStatus;
  const modalityLabel = WORK_MODALITY_OPTIONS.find((option) => option.value === formData.work_modality)?.label
    ?? formData.work_modality;
  const availableFromLabel = formData.available_from
    ? new Intl.DateTimeFormat(i18n.language, { day: "2-digit", month: "2-digit", year: "numeric" })
      .format(new Date(`${formData.available_from}T00:00:00`))
    : t("common.notProvided");
  const updatedLabel = useMemo(() => {
    if (!updatedAt) {
      return t("common.notProvided");
    }

    const updatedDate = new Date(updatedAt);
    const today = new Date();
    updatedDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const days = Math.max(0, Math.floor((today.getTime() - updatedDate.getTime()) / 86400000));

    return days === 0
      ? t("talent.availability.today", { defaultValue: "Hoy" })
      : t("talent.availability.daysAgo", { count: days, defaultValue: "Hace {{count}} días" });
  }, [t, updatedAt]);
  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData((current) => {
      if (name === "display_status") {
        const nextStatus = value as AvailabilityDisplayStatus;

        if (nextStatus === "NOTICE" && !current.available_from) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);

          return { ...current, display_status: nextStatus, available_from: toDateInputValue(tomorrow) };
        }

        return {
          ...current,
          display_status: nextStatus,
          available_from: nextStatus === "IMMEDIATE" ? "" : current.available_from,
        };
      }

      if (name === "available_from" && current.display_status !== "UNAVAILABLE") {
        return {
          ...current,
          available_from: value,
          display_status: isFutureDate(value) ? "NOTICE" : "IMMEDIATE",
        };
      }

      return { ...current, [name]: value };
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSaving(true);
      setError("");
      setSuccessMessage("");
      const savedAvailability = await updateMyTalentAvailability(
        normalizeAvailabilityPayload(formData),
        token ?? undefined
      );
      setFormData(mapAvailabilityToFormState(savedAvailability));
      setUpdatedAt(savedAvailability.updated_at ?? new Date().toISOString());
      setSuccessMessage(t("talent.availability.success"));
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("talent.errors.saveAvailability")
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="talent-page talent-availability-page">
      <section className="talent-card talent-availability-hero">
        <div>
          <p className="talent-page__eyebrow">{t("talent.availability.eyebrow")}</p>
          <h1 className="talent-page__title">{t("talent.availability.title")}</h1>
          <p className="talent-page__subtitle">
            {t("talent.availability.subtitle", {
              defaultValue: "Mantén visible cuándo y dónde estás disponible para nuevos proyectos.",
            })}
          </p>
        </div>
        <div className="talent-availability-updated">
          <span>{t("talent.availability.updatedLabel", { defaultValue: "Disponibilidad actualizada" })}</span>
          <strong>{updatedLabel}</strong>
        </div>
      </section>

      {isLoading ? (
        <section className="talent-card">
          <p className="talent-feedback">{t("talent.availability.loading")}</p>
        </section>
      ) : (
        <form id="talent-availability-form" className="talent-availability-layout" onSubmit={handleSubmit}>
          <article className="talent-card talent-availability-editor">
            <div className="talent-availability-editor__heading">
              <div>
                <h2 className="section-heading__title">
                  {t("talent.availability.editorTitle", { defaultValue: "Configura tu disponibilidad" })}
                </h2>
                <p className="section-heading__text">
                  {t("talent.availability.editorText", {
                    defaultValue: "Mantén esta información al día para recibir propuestas compatibles con tu agenda.",
                  })}
                </p>
              </div>
              <span className={`talent-availability-status talent-availability-status--${selectedStatus?.tone}`}>
                {selectedStatus?.label}
              </span>
            </div>

            {error ? <p className="talent-feedback talent-feedback--error">{error}</p> : null}
            {successMessage ? <p className="talent-feedback talent-feedback--success">{successMessage}</p> : null}

            <div className="talent-availability-status-options">
              {displayStatusOptions.map((option) => (
                <label key={option.value} className={`talent-availability-choice talent-availability-choice--${option.tone}`}>
                  <input
                    type="radio"
                    name="display_status"
                    value={option.value}
                    checked={formData.display_status === option.value}
                    onChange={handleChange}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>

            <div className="talent-form-grid">
              <label className="talent-input-group">
                <span>{t("talent.availability.city", { defaultValue: "Ciudad" })}</span>
                <input name="city" value={formData.city} onChange={handleChange} placeholder="Santiago" />
              </label>
              <label className="talent-input-group">
                <span>{t("talent.availability.country", { defaultValue: "País" })}</span>
                <input name="country" value={formData.country} onChange={handleChange} placeholder="Chile" />
              </label>
              <label className="talent-input-group">
                <span>{t("talent.availability.travel")}</span>
                <select name="travel_availability" value={formData.travel_availability} onChange={handleChange}>
                  <option value="true">{t("common.yes")}</option>
                  <option value="false">{t("common.no")}</option>
                </select>
              </label>
              <label className="talent-input-group">
                <span>{t("talent.availability.workModality")}</span>
                <select name="work_modality" value={formData.work_modality} onChange={handleChange}>
                  {WORK_MODALITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="talent-input-group">
                <span>{t("talent.availability.availableFrom")}</span>
                <input type="date" name="available_from" value={formData.available_from} onChange={handleChange} />
              </label>
              <label className="talent-input-group talent-input-group--full">
                <span>{t("talent.availability.producerInfo", { defaultValue: "Información para productores" })}</span>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={6}
                  placeholder={t("talent.availability.producerInfoPlaceholder", {
                    defaultValue: "Ejemplo:\n- Disponible fines de semana\n- Disponible para rodajes nocturnos\n- Pasaporte vigente\n- Licencia de conducir\n- Experiencia internacional",
                  })}
                />
              </label>
            </div>
            <div className="talent-availability-editor__actions">
              <button className="talent-button talent-button--primary" type="submit" disabled={isSaving}>
                {isSaving ? t("common.saving") : t("talent.availability.save")}
              </button>
            </div>
          </article>

          <aside className="talent-card talent-availability-summary">
            <div>
              <p className="talent-page__eyebrow">{t("talent.availability.quickView", { defaultValue: "Ficha rápida" })}</p>
              <h2 className="section-heading__title">
                {t("talent.availability.professionalSummary", { defaultValue: "Resumen profesional" })}
              </h2>
            </div>
            <div className="talent-availability-summary__status">
              <span className={`talent-availability-status talent-availability-status--${summaryStatus?.tone}`}>
                {summaryStatus?.label}
              </span>
              <small>{t("talent.availability.updatedValue", { value: updatedLabel, defaultValue: "Actualizado: {{value}}" })}</small>
            </div>
            <dl className="talent-availability-summary__list">
              <div><dt>📍 {t("talent.availability.city", { defaultValue: "Ciudad" })}</dt><dd>{formData.city || t("common.notProvided")}</dd></div>
              <div><dt>🌎 {t("talent.availability.country", { defaultValue: "País" })}</dt><dd>{formData.country || t("common.notProvided")}</dd></div>
              <div><dt>🎭 {t("talent.availability.specialty", { defaultValue: "Especialidad" })}</dt><dd>{talentProfile?.main_specialty || t("common.notProvided")}</dd></div>
              <div><dt>🎬 {t("talent.availability.experience", { defaultValue: "Experiencia" })}</dt><dd>{t("talent.availability.years", { count: talentProfile?.experience_years ?? 0, defaultValue: "{{count}} años" })}</dd></div>
              <div><dt>✈ {t("talent.availability.travel")}</dt><dd>{formData.travel_availability === "true" ? t("common.yes") : t("common.no")}</dd></div>
              <div><dt>💼 {t("talent.availability.workModality")}</dt><dd>{modalityLabel}</dd></div>
              <div><dt>📅 {t("talent.availability.availableFrom")}</dt><dd>{availableFromLabel}</dd></div>
              <div><dt>🕒 {t("talent.availability.lastUpdate", { defaultValue: "Última actualización" })}</dt><dd>{updatedLabel}</dd></div>
            </dl>
          </aside>
        </form>
      )}

      {!isLoading ? (
        <section className="talent-card talent-commitments">
          <div className="section-heading">
            <h2 className="section-heading__title">
              {t("talent.availability.commitmentsTitle", { defaultValue: "Compromisos actuales" })}
            </h2>
            <p className="section-heading__text">
              {t("talent.availability.commitmentsText", {
                defaultValue: "Proyectos confirmados que ya forman parte de tu agenda profesional.",
              })}
            </p>
          </div>
          {commitments.length ? (
            <div className="talent-commitments__list">
              {commitments.map((commitment) => (
                <article
                  key={`${commitment.project_id}-${commitment.opportunity_id ?? "project"}`}
                  className="talent-commitment"
                >
                  <div className="talent-commitment__heading">
                    <h3>{commitment.project_title}</h3>
                    <span className="talent-availability-status talent-availability-status--busy">
                      {t("talent.availability.occupiedStatus", { defaultValue: "Ocupado" })}
                    </span>
                  </div>
                  <dl className="talent-commitment__details">
                    {commitment.opportunity_title ? (
                      <div>
                        <dt>{t("talent.availability.associatedOpportunity", { defaultValue: "Convocatoria asociada" })}</dt>
                        <dd>{commitment.opportunity_title}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt>{t("talent.availability.startDate", { defaultValue: "Fecha inicio" })}</dt>
                      <dd>{formatDate(commitment.start_date, i18n.language, t("common.noDate"))}</dd>
                    </div>
                    <div>
                      <dt>{t("talent.availability.endDate", { defaultValue: "Fecha término" })}</dt>
                      <dd>{formatDate(commitment.end_date, i18n.language, t("common.noDate"))}</dd>
                    </div>
                    <div>
                      <dt>{t("talent.availability.availableAgain", { defaultValue: "Disponible nuevamente desde" })}</dt>
                      <dd>{formatDate(commitment.available_again_from, i18n.language, t("common.notProvided"))}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <p className="talent-feedback">
              {t("talent.availability.noCommitments", {
                defaultValue: "No tienes compromisos activos. Estás disponible para nuevas oportunidades.",
              })}
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}

export default TalentAvailability;
