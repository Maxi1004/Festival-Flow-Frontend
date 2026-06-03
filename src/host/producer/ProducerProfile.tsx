import { useEffect, useRef, useState } from "react";
import { FiCamera } from "react-icons/fi";
import { useAuth } from "../../context/useAuth";
import { reusePendingRequest } from "../../service/pendingRequest";
import {
  getMyProducerProfile,
  updateMyProducerProfile,
  uploadProducerProfilePhoto,
} from "../../service/producerApi";
import type {
  ProducerProfile as ProducerProfileData,
  ProducerProfileUpdatePayload,
} from "../../types/producer";
import { useCurrentProfile } from "../useCurrentProfile";
import ProducerGuard from "./ProducerGuard";
import "../../styles/producer.css";

type ProducerProfileFormState = ProducerProfileUpdatePayload;

const initialFormState: ProducerProfileFormState = {
  display_name: "",
  company_name: "",
  role_title: "",
  bio: "",
  location: "",
  country: "",
  phone: "",
  website: "",
};

const ALLOWED_PROFILE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PROFILE_PHOTO_SIZE = 5 * 1024 * 1024;

function mapProfileToFormState(
  producerProfile: Partial<ProducerProfileData> | null,
  fallbackDisplayName: string
): ProducerProfileFormState {
  return {
    display_name: producerProfile?.display_name ?? fallbackDisplayName,
    company_name: producerProfile?.company_name ?? "",
    role_title: producerProfile?.role_title ?? "",
    bio: producerProfile?.bio ?? "",
    location: producerProfile?.location ?? "",
    country: producerProfile?.country ?? "",
    phone: producerProfile?.phone ?? "",
    website: producerProfile?.website ?? "",
  };
}

function normalizeProfilePayload(formData: ProducerProfileFormState): ProducerProfileUpdatePayload {
  return {
    display_name: formData.display_name.trim(),
    company_name: formData.company_name.trim(),
    role_title: formData.role_title.trim(),
    bio: formData.bio.trim(),
    location: formData.location.trim(),
    country: formData.country.trim(),
    phone: formData.phone.trim(),
    website: formData.website.trim(),
  };
}

function isValidWebsite(value: string): boolean {
  const nextValue = value.trim();

  if (!nextValue) {
    return true;
  }

  try {
    const url = new URL(nextValue);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getInitial(value: string): string {
  return value.trim().charAt(0).toUpperCase() || "P";
}

function ProducerProfileSkeleton() {
  return (
    <section className="producer-profile-grid">
      <article className="producer-card producer-dashboard-skeleton">
        <span></span>
        <strong></strong>
        <small></small>
        <em></em>
      </article>
      <article className="producer-card producer-dashboard-skeleton">
        <span></span>
        <strong></strong>
        <small></small>
        <em></em>
      </article>
    </section>
  );
}

function ProducerProfileContent() {
  const { updateProfilePhoto } = useAuth();
  const { user, token, profile, isProfileLoading } = useCurrentProfile();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fallbackDisplayName = profile?.name?.trim() || user?.displayName?.trim() || "Productor";
  const [formData, setFormData] = useState<ProducerProfileFormState>({
    ...initialFormState,
    display_name: fallbackDisplayName,
  });
  const [photoUrl, setPhotoUrl] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [draftFormData, setDraftFormData] = useState<ProducerProfileFormState>(formData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoSuccessMessage, setPhotoSuccessMessage] = useState("");

  useEffect(() => {
    if (isProfileLoading || (user && !token)) {
      setIsLoading(true);
      return;
    }

    if (!user || !token || !profile) {
      setError("");
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadProducerProfile() {
      try {
        setError("");
        setSuccessMessage("");
        const nextProfile = await reusePendingRequest(
          `producer-profile:${token}`,
          () => getMyProducerProfile(token ?? undefined)
        );

        if (!isMounted) {
          return;
        }

        const nextFormData = mapProfileToFormState(nextProfile, fallbackDisplayName);
        setFormData(nextFormData);
        setDraftFormData(nextFormData);
        setPhotoUrl(nextProfile.photo_url ?? "");
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar el perfil del productor."
          );
          const fallbackFormData = mapProfileToFormState(null, fallbackDisplayName);
          setFormData(fallbackFormData);
          setDraftFormData(fallbackFormData);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProducerProfile();

    return () => {
      isMounted = false;
    };
  }, [fallbackDisplayName, isProfileLoading, profile, token, user]);

  const visiblePhotoUrl = photoUrl || profile?.photo_url?.trim() || profile?.picture?.trim() || user?.photoURL?.trim() || "";
  const visibleName = formData.display_name.trim() || fallbackDisplayName;
  const visibleLocation = [formData.location.trim(), formData.country.trim()].filter(Boolean).join(", ");
  const visibleWebsite = formData.website.trim();
  const visibleBio = formData.bio.trim();

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;

    setDraftFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const openEditModal = () => {
    setDraftFormData(formData);
    setModalError("");
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    if (isSaving) {
      return;
    }

    setDraftFormData(formData);
    setModalError("");
    setIsEditModalOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isValidWebsite(draftFormData.website)) {
      setModalError("Ingresa un sitio web valido que comience con http:// o https://.");
      setSuccessMessage("");
      return;
    }

    try {
      setIsSaving(true);
      setModalError("");
      setSuccessMessage("");
      const savedProfile = await updateMyProducerProfile(
        normalizeProfilePayload(draftFormData),
        token ?? undefined
      );
      const nextFormData = mapProfileToFormState(savedProfile, fallbackDisplayName);
      setFormData(nextFormData);
      setDraftFormData(nextFormData);
      setPhotoUrl(savedProfile.photo_url ?? photoUrl);
      setIsEditModalOpen(false);
      setSuccessMessage("Perfil guardado correctamente.");
    } catch (submitError) {
      setModalError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo guardar el perfil del productor."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedPhoto = event.target.files?.[0] ?? null;
    setPhotoError("");
    setPhotoSuccessMessage("");

    if (!selectedPhoto) {
      return;
    }

    if (!ALLOWED_PROFILE_PHOTO_TYPES.includes(selectedPhoto.type)) {
      event.target.value = "";
      setPhotoError("La foto debe ser una imagen JPEG, PNG o WebP.");
      return;
    }

    if (selectedPhoto.size > MAX_PROFILE_PHOTO_SIZE) {
      event.target.value = "";
      setPhotoError("La foto supera el tamano maximo permitido de 5 MB.");
      return;
    }

    try {
      setIsUploadingPhoto(true);
      const uploadedPhoto = await uploadProducerProfilePhoto(selectedPhoto, token ?? undefined);
      setPhotoUrl(uploadedPhoto.photo_url);
      updateProfilePhoto(uploadedPhoto.photo_url);
      setPhotoSuccessMessage("Foto de perfil actualizada correctamente.");
    } catch (uploadError) {
      setPhotoError(
        uploadError instanceof Error
          ? uploadError.message
          : "No se pudo subir la foto de perfil."
      );
    } finally {
      setIsUploadingPhoto(false);
      event.target.value = "";
    }
  };

  return (
    <div className="producer-shell producer-profile-page">
      <section className="producer-card producer-profile-hero">
        <button
          className="producer-profile-avatar"
          type="button"
          disabled={isUploadingPhoto || isLoading}
          onClick={() => photoInputRef.current?.click()}
          aria-label="Cambiar foto de perfil"
        >
          {visiblePhotoUrl ? (
            <img src={visiblePhotoUrl} alt={`Foto de perfil de ${visibleName}`} />
          ) : (
            <span>{getInitial(visibleName)}</span>
          )}
          <span className="producer-profile-avatar__icon">
            <FiCamera aria-hidden="true" />
          </span>
        </button>

        <div className="producer-profile-hero__content">
          <p className="producer-page__eyebrow">Perfil de productor</p>
          <h1 className="producer-page__title">Mi perfil</h1>
          <div className="producer-profile-summary">
            <strong>{visibleName}</strong>
            <span>{formData.company_name.trim() || "Productora / empresa pendiente"}</span>
            <span>{formData.role_title.trim() || "Cargo / rol pendiente"}</span>
            <span>{profile?.email ?? user?.email ?? "Sin correo"}</span>
          </div>
        </div>

        <div className="producer-profile-photo-actions">
          <input
            ref={photoInputRef}
            className="producer-profile-photo-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => void handlePhotoChange(event)}
            disabled={isUploadingPhoto}
          />
          <button
            className="producer-button"
            type="button"
            disabled={isUploadingPhoto || isLoading}
            onClick={() => photoInputRef.current?.click()}
          >
            {isUploadingPhoto ? "Subiendo..." : "Cambiar foto"}
          </button>
          <small>JPEG, PNG o WebP. Maximo 5 MB.</small>
        </div>
      </section>

      {photoError ? <p className="producer-feedback producer-feedback--error">{photoError}</p> : null}
      {photoSuccessMessage ? (
        <p className="producer-feedback producer-feedback--success">{photoSuccessMessage}</p>
      ) : null}

      {error ? <p className="producer-feedback producer-feedback--error">{error}</p> : null}
      {successMessage ? (
        <p className="producer-feedback producer-feedback--success">{successMessage}</p>
      ) : null}

      {isLoading ? (
        <ProducerProfileSkeleton />
      ) : (
        <section className="producer-card producer-profile-overview">
          <div className="section-heading">
            <h2 className="section-heading__title">Informacion profesional</h2>
            <p className="section-heading__text">
              Resumen compacto de los datos que veran talentos y equipos al revisar tus proyectos.
            </p>
          </div>

          <div className="producer-profile-detail-grid">
            <div className="producer-profile-detail">
              <span>Nombre visible</span>
              <strong>{visibleName}</strong>
            </div>
            <div className="producer-profile-detail">
              <span>Productora / Empresa</span>
              <strong>{formData.company_name.trim() || "No informado"}</strong>
            </div>
            <div className="producer-profile-detail">
              <span>Cargo / Rol</span>
              <strong>{formData.role_title.trim() || "No informado"}</strong>
            </div>
            <div className="producer-profile-detail">
              <span>Email</span>
              <strong>{profile?.email ?? user?.email ?? "Sin correo"}</strong>
            </div>
            <div className="producer-profile-detail">
              <span>Ciudad / Pais</span>
              <strong>{visibleLocation || "No informado"}</strong>
            </div>
            <div className="producer-profile-detail">
              <span>Telefono</span>
              <strong>{formData.phone.trim() || "No informado"}</strong>
            </div>
            <div className="producer-profile-detail producer-profile-detail--full">
              <span>Sitio web</span>
              {visibleWebsite ? (
                <a href={visibleWebsite} target="_blank" rel="noreferrer">
                  {visibleWebsite}
                </a>
              ) : (
                <strong>No informado</strong>
              )}
            </div>
            <div className="producer-profile-detail producer-profile-detail--full">
              <span>Bio / Descripcion profesional</span>
              <p>{visibleBio || "Todavia no has agregado una descripcion profesional."}</p>
            </div>
          </div>

          <div className="producer-actions">
            <button
              className="producer-button producer-button--primary"
              type="button"
              onClick={openEditModal}
            >
              Editar perfil
            </button>
          </div>
        </section>
      )}

      {isEditModalOpen ? (
        <div className="producer-modal producer-profile-modal" role="presentation">
          <form
            className="producer-modal__panel producer-profile-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="producer-profile-edit-title"
            onSubmit={handleSubmit}
          >
            <div className="producer-profile-modal__heading">
              <div>
                <p className="producer-page__eyebrow">Perfil de productor</p>
                <h2 id="producer-profile-edit-title">Editar perfil de productor</h2>
              </div>
            </div>

            {modalError ? (
              <p className="producer-feedback producer-feedback--error">{modalError}</p>
            ) : null}

            <div className="producer-form">
              <label className="producer-field">
                <span>Nombre visible</span>
                <input
                  name="display_name"
                  value={draftFormData.display_name}
                  onChange={handleChange}
                  placeholder="Tu nombre profesional"
                />
              </label>

              <label className="producer-field">
                <span>Productora / Empresa</span>
                <input
                  name="company_name"
                  value={draftFormData.company_name}
                  onChange={handleChange}
                  placeholder="Nombre de tu productora"
                />
              </label>

              <label className="producer-field">
                <span>Cargo / Rol</span>
                <input
                  name="role_title"
                  value={draftFormData.role_title}
                  onChange={handleChange}
                  placeholder="Director, productor ejecutivo..."
                />
              </label>

              <label className="producer-field">
                <span>Ciudad</span>
                <input
                  name="location"
                  value={draftFormData.location}
                  onChange={handleChange}
                  placeholder="Santiago"
                />
              </label>

              <label className="producer-field">
                <span>Pais</span>
                <input
                  name="country"
                  value={draftFormData.country}
                  onChange={handleChange}
                  placeholder="Chile"
                />
              </label>

              <label className="producer-field">
                <span>Telefono</span>
                <input
                  name="phone"
                  value={draftFormData.phone}
                  onChange={handleChange}
                  placeholder="+56 9 1234 5678"
                />
              </label>

              <label className="producer-field producer-field--full">
                <span>Sitio web</span>
                <input
                  type="url"
                  name="website"
                  value={draftFormData.website}
                  onChange={handleChange}
                  placeholder="https://tu-productora.com"
                />
              </label>

              <label className="producer-field producer-field--full">
                <span>Bio / Descripcion profesional</span>
                <textarea
                  name="bio"
                  value={draftFormData.bio}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Cuenta tu experiencia, enfoque de produccion y tipos de proyectos."
                />
              </label>
            </div>

            <div className="producer-actions">
              <button
                className="producer-button"
                type="button"
                disabled={isSaving}
                onClick={closeEditModal}
              >
                Cancelar
              </button>
              <button
                className="producer-button producer-button--primary"
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function ProducerProfile() {
  return (
    <ProducerGuard>
      <ProducerProfileContent />
    </ProducerGuard>
  );
}

export default ProducerProfile;
