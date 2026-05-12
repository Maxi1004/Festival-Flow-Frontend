import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getMyTalentAvailability,
  updateMyTalentAvailability,
} from "../../service/talentApi";
import type { TalentAvailabilityUpdatePayload } from "../../types/talent";
import "../../styles/talent.css";

type AvailabilityFormState = {
  status: string;
  travel_availability: string;
  work_modality: string;
  work_location: string;
  available_from: string;
  notes: string;
};

const initialFormState: AvailabilityFormState = {
  status: "",
  travel_availability: "",
  work_modality: "",
  work_location: "",
  available_from: "",
  notes: "",
};

function mapAvailabilityToFormState(
  availability: Partial<TalentAvailabilityUpdatePayload> | null
): AvailabilityFormState {
  if (!availability) {
    return initialFormState;
  }

  return {
    status: availability.status ?? "",
    travel_availability: availability.travel_availability ?? "",
    work_modality: availability.work_modality ?? "",
    work_location: availability.work_location ?? "",
    available_from: availability.available_from ?? "",
    notes: availability.notes ?? "",
  };
}

function normalizeAvailabilityPayload(
  formData: AvailabilityFormState
): TalentAvailabilityUpdatePayload {
  return {
    status: formData.status.trim(),
    travel_availability: formData.travel_availability.trim(),
    work_modality: formData.work_modality.trim(),
    work_location: formData.work_location.trim(),
    available_from: formData.available_from || null,
    notes: formData.notes.trim(),
  };
}

function TalentAvailability() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<AvailabilityFormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadAvailability() {
      try {
        setError("");
        setSuccessMessage("");
        const nextAvailability = await getMyTalentAvailability();

        if (!isMounted) {
          return;
        }

        setFormData(mapAvailabilityToFormState(nextAvailability));
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : t("talent.errors.loadAvailability")
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
  }, [t]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSaving(true);
      setError("");
      setSuccessMessage("");
      const savedAvailability = await updateMyTalentAvailability(
        normalizeAvailabilityPayload(formData)
      );
      setFormData(mapAvailabilityToFormState(savedAvailability));
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
    <div className="talent-page">
      <section className="talent-card talent-banner">
        <div>
          <p className="talent-page__eyebrow">{t("talent.availability.eyebrow")}</p>
          <h1 className="talent-page__title">{t("talent.availability.title")}</h1>
          <p className="talent-page__subtitle">
            {t("talent.availability.subtitle")}
          </p>
        </div>

        <button
          className="talent-button talent-button--primary"
          type="submit"
          form="talent-availability-form"
          disabled={isLoading || isSaving}
        >
          {isSaving ? t("common.saving") : t("talent.availability.save")}
        </button>
      </section>

      {isLoading ? (
        <section className="talent-card">
          <p className="talent-feedback">{t("talent.availability.loading")}</p>
        </section>
      ) : (
        <form id="talent-availability-form" className="talent-grid talent-grid--sidebar" onSubmit={handleSubmit}>
          <article className="talent-card">
            <div className="section-heading">
              <h2 className="section-heading__title">{t("talent.availability.summaryTitle")}</h2>
              <p className="section-heading__text">
                {t("talent.availability.summaryText")}
              </p>
            </div>

            {error ? <p className="talent-feedback talent-feedback--error">{error}</p> : null}
            {successMessage ? (
              <p className="talent-feedback talent-feedback--success">{successMessage}</p>
            ) : null}

            <div className="talent-form-grid">
              <label className="talent-input-group">
                <span>{t("talent.availability.status")}</span>
                <input
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  placeholder={t("talent.availability.statusPlaceholder")}
                />
              </label>

              <label className="talent-input-group">
                <span>{t("talent.availability.travel")}</span>
                <input
                  name="travel_availability"
                  value={formData.travel_availability}
                  onChange={handleChange}
                  placeholder={t("talent.availability.travelPlaceholder")}
                />
              </label>

              <label className="talent-input-group">
                <span>{t("talent.availability.workModality")}</span>
                <input
                  name="work_modality"
                  value={formData.work_modality}
                  onChange={handleChange}
                  placeholder={t("talent.availability.workModalityPlaceholder")}
                />
              </label>

              <label className="talent-input-group">
                <span>{t("talent.availability.workLocation")}</span>
                <input
                  name="work_location"
                  value={formData.work_location}
                  onChange={handleChange}
                  placeholder={t("talent.availability.workLocationPlaceholder")}
                />
              </label>

              <label className="talent-input-group">
                <span>{t("talent.availability.availableFrom")}</span>
                <input
                  type="date"
                  name="available_from"
                  value={formData.available_from}
                  onChange={handleChange}
                />
              </label>

              <label className="talent-input-group talent-input-group--full">
                <span>{t("talent.availability.notes")}</span>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={5}
                  placeholder={t("talent.availability.notesPlaceholder")}
                />
              </label>
            </div>
          </article>

          <aside className="talent-card talent-status-card">
            <span className="talent-status talent-status--available">
              {formData.status.trim() || t("talent.availability.undefinedStatus")}
            </span>
            <h2 className="section-heading__title">{t("talent.availability.readyTitle")}</h2>
            <p className="section-heading__text">
              {t("talent.availability.mainModality", {
                value: formData.work_modality.trim() || t("common.notProvided"),
              })}
              {" "}
              {t("talent.availability.estimatedStart", {
                value: formData.available_from || t("common.noDate"),
              })}
            </p>
            <p className="section-heading__text">
              {t("talent.availability.location", {
                value: formData.work_location.trim() || t("common.notProvided"),
              })}
            </p>
          </aside>
        </form>
      )}
    </div>
  );
}

export default TalentAvailability;
