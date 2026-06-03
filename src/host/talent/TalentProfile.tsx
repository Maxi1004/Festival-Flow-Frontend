import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/useAuth";
import { useCurrentProfile } from "../useCurrentProfile";
import {
  getMyTalentProfile,
  uploadMyTalentPortfolioPdf,
  uploadMyTalentProfilePhoto,
  updateMyTalentProfile,
} from "../../service/talentApi";
import { reusePendingRequest } from "../../service/pendingRequest";
import type {
  PortfolioItem,
  TalentProfile as TalentProfileData,
  TalentProfileUpdatePayload,
} from "../../types/talent";
import "../../styles/talent.css";

type TalentProfileFormState = {
  display_name: string;
  bio: string;
  main_specialty: string;
  specialties: string[];
  location: string;
  experience_years: string;
  languages: string[];
  skills: string[];
  is_public: boolean;
  portfolio_links: PortfolioItemLink[];
  portfolio_items: PortfolioItemFormState[];
};

type PortfolioItemLink = {
  label: string;
  url: string;
};

type PortfolioItemFormState = {
  title: string;
  project_type: string;
  role: string;
  year: string;
  url: string;
};

type ProfileCompletionRequirement = {
  isComplete: boolean;
  label: string;
  weight: number;
};

const emptyPortfolioItem: PortfolioItemFormState = {
  title: "",
  project_type: "",
  role: "",
  year: "",
  url: "",
};

const initialFormState: TalentProfileFormState = {
  display_name: "",
  bio: "",
  main_specialty: "",
  specialties: [],
  location: "",
  experience_years: "0",
  languages: [],
  skills: [],
  is_public: true,
  portfolio_links: [],
  portfolio_items: [],
};

const ALLOWED_PROFILE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PROFILE_PHOTO_SIZE = 5 * 1024 * 1024;
const MAX_PORTFOLIO_PDF_SIZE = 10 * 1024 * 1024;
const PROJECT_TYPE_OPTIONS = [
  "Película",
  "Cortometraje",
  "Obra teatral",
  "Tráiler",
  "Comercial",
  "Videoclip",
  "Serie",
  "Documental",
  "Otro",
];

const SPECIALTY_OPTIONS = [
  "Actor", "Actriz", "Extra", "Modelo", "Doble / Stunt", "Director",
  "Asistente de dirección", "Productor", "Asistente de producción", "Cámara",
  "Director de fotografía", "Operador de cámara", "Sonidista", "Microfonista",
  "Editor / Montajista", "Colorista", "Guionista", "Maquillaje", "Peluquería",
  "Vestuario", "Arte", "Escenografía", "Iluminación", "FX / Efectos especiales",
  "VFX / Efectos visuales", "Animación", "Fotógrafo", "Catering", "Logística",
  "Community Manager",
];

const SKILL_OPTIONS = [
  "Actuación", "Improvisación", "Expresión corporal", "Voz / Doblaje", "Baile",
  "Canto", "Manejo de cámara", "Edición de video", "Edición de audio", "Fotografía",
  "Iluminación", "Dirección de actores", "Escritura de guion", "Producción audiovisual",
  "Organización de rodaje", "Trabajo en equipo", "Comunicación", "Puntualidad",
  "Resolución de problemas", "Creatividad", "Manejo de software de edición",
];

const LANGUAGE_OPTIONS = [
  "Español", "Inglés", "Chino Mandarín", "Hindi", "Árabe", "Francés",
  "Portugués", "Ruso", "Alemán", "Japonés", "Coreano", "Italiano",
];

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function splitMultivalueField(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatFileSize(sizeInBytes: number): string {
  return `${(sizeInBytes / 1024 / 1024).toFixed(2)} MB`;
}

function normalizeTextList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return splitMultivalueField(value);
  }

  return [];
}

function normalizePortfolioLink(link: TalentProfileData["portfolio_links"][number]): PortfolioItemLink {
  return typeof link === "string" ? { label: link, url: link } : link;
}

function normalizePortfolioItems(items: TalentProfileData["portfolio_items"]): PortfolioItemFormState[] {
  return (items ?? []).map((item) => ({
    title: item.title ?? "",
    project_type: item.project_type ?? "",
    role: item.role ?? "",
    year: item.year ? String(item.year) : "",
    url: item.url ?? "",
  }));
}

function mapProfileToFormState(
  profile: Partial<TalentProfileData> | null,
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
    specialties: normalizeTextList(profile.specialties),
    location: profile.location ?? "",
    experience_years: String(profile.experience_years ?? 0),
    languages: normalizeTextList(profile.languages),
    skills: normalizeTextList(profile.skills),
    is_public: profile.is_public ?? true,
    portfolio_links: (profile.portfolio_links ?? []).map(normalizePortfolioLink),
    portfolio_items: normalizePortfolioItems(profile.portfolio_items),
  };
}

function normalizeProfilePayload(
  formData: TalentProfileFormState,
  profileCompletion: number
): TalentProfileUpdatePayload {
  return {
    display_name: formData.display_name.trim(),
    bio: formData.bio.trim(),
    main_specialty: formData.main_specialty.trim(),
    specialties: formData.specialties,
    location: formData.location.trim(),
    experience_years: Math.max(0, Number(formData.experience_years) || 0),
    languages: formData.languages,
    skills: formData.skills,
    profile_completion: profileCompletion,
    is_public: formData.is_public,
    portfolio_links: formData.portfolio_links,
    portfolio_items: formData.portfolio_items
      .filter((item) => Object.values(item).some((value) => value.trim()))
      .map((item): PortfolioItem => ({
        title: item.title.trim(),
        project_type: item.project_type.trim(),
        role: item.role.trim(),
        year: item.year ? Number(item.year) : null,
        url: item.url.trim(),
      })),
  };
}

type MultiSelectFieldProps = {
  label: string;
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
};

function MultiSelectField({ label, options, values, onChange }: MultiSelectFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAddingCustomValue, setIsAddingCustomValue] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const filteredOptions = options.filter((option) => (
    !values.includes(option)
    && normalizeSearchText(option).includes(normalizeSearchText(searchValue.trim()))
  ));

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const addValue = (value: string) => {
    const normalizedValue = value.trim();

    if (normalizedValue && !values.includes(normalizedValue)) {
      onChange([...values, normalizedValue]);
    }
  };

  const handleOptionClick = (value: string) => {
    addValue(value);
    setSearchValue("");
    setIsOpen(false);
  };

  const handleAddCustomValue = () => {
    addValue(customValue);
    setCustomValue("");
    setIsAddingCustomValue(false);
  };

  return (
    <div ref={containerRef} className="talent-input-group talent-input-group--full">
      <span>{label}</span>
      <div className="talent-searchable-select">
        <input
          value={searchValue}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setSearchValue(event.target.value);
            setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
          placeholder={`Seleccionar ${label.toLowerCase()}...`}
        />
        {isOpen ? (
          <div className="talent-searchable-select__options" role="listbox">
            {filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => handleOptionClick(option)}
              >
                {option}
              </button>
            ))}
            <button
              type="button"
              role="option"
              aria-selected="false"
              onClick={() => {
                setIsAddingCustomValue(true);
                setIsOpen(false);
              }}
            >
              Otro
            </button>
          </div>
        ) : null}
      </div>

      {isAddingCustomValue ? (
        <div className="talent-custom-option">
          <input
            value={customValue}
            onChange={(event) => setCustomValue(event.target.value)}
            placeholder={`Agregar ${label.toLowerCase()}`}
          />
          <button className="talent-button" type="button" onClick={handleAddCustomValue}>
            Agregar
          </button>
        </div>
      ) : null}

      {values.length ? (
        <div className="talent-selection-chips">
          {values.map((value) => (
            <span key={value} className="talent-selection-chip">
              {value}
              <button
                type="button"
                aria-label={`Eliminar ${value}`}
                onClick={() => onChange(values.filter((item) => item !== value))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <small className="talent-selection-empty">Todavía no has seleccionado opciones.</small>
      )}
    </div>
  );
}

function TalentProfile() {
  const { t } = useTranslation();
  const { updateProfilePhoto } = useAuth();
  const { user, token, profile, isProfileLoading } = useCurrentProfile();
  const tRef = useRef(t);
  tRef.current = t;
  const photoInputRef = useRef<HTMLInputElement>(null);
  const portfolioPdfInputRef = useRef<HTMLInputElement>(null);
  const fallbackDisplayName = profile?.name?.trim() || user?.displayName?.trim() || t("talent.profile.fallbackName");
  const [formData, setFormData] = useState<TalentProfileFormState>({
    ...initialFormState,
    display_name: fallbackDisplayName,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoSuccessMessage, setPhotoSuccessMessage] = useState("");
  const [portfolioPdfUrl, setPortfolioPdfUrl] = useState("");
  const [selectedPortfolioPdf, setSelectedPortfolioPdf] = useState<File | null>(null);
  const [isUploadingPortfolioPdf, setIsUploadingPortfolioPdf] = useState(false);
  const [portfolioPdfError, setPortfolioPdfError] = useState("");
  const [portfolioPdfSuccessMessage, setPortfolioPdfSuccessMessage] = useState("");
  const [editingPortfolioItemIndex, setEditingPortfolioItemIndex] = useState<number | null>(null);
  const [viewingPortfolioItemIndex, setViewingPortfolioItemIndex] = useState<number | null>(null);
  const [portfolioItemBeforeEdit, setPortfolioItemBeforeEdit] = useState<PortfolioItemFormState | null>(null);
  const [isCreatingPortfolioItem, setIsCreatingPortfolioItem] = useState(false);
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

    async function loadProfile() {
      try {
        setError("");
        setSuccessMessage("");
        const nextProfile = await reusePendingRequest(
          `talent-profile:${token}`,
          () => getMyTalentProfile(token ?? undefined, "TalentProfile")
        );

        if (!isMounted) {
          return;
        }

        setFormData(mapProfileToFormState(nextProfile, fallbackDisplayName));
        setPhotoUrl(nextProfile?.photo_url ?? "");
        setPortfolioPdfUrl(nextProfile?.portfolio_pdf_url ?? "");
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : tRef.current("talent.errors.loadProfile")
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
  }, [fallbackDisplayName, isProfileLoading, profile, token, user]);

  useEffect(() => {
    if (!selectedPhoto) {
      setPhotoPreviewUrl("");
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(selectedPhoto);
    setPhotoPreviewUrl(nextPreviewUrl);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [selectedPhoto]);

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

  const saveProfile = async (nextFormData = formData): Promise<boolean> => {
    try {
      setIsSaving(true);
      setError("");
      setSuccessMessage("");
      const savedProfile = await updateMyTalentProfile(
        normalizeProfilePayload(nextFormData, profileCompletion),
        token ?? undefined
      );
      setFormData(mapProfileToFormState(savedProfile, fallbackDisplayName));
      setPhotoUrl(savedProfile.photo_url ?? photoUrl);
      setSuccessMessage(t("talent.profile.success"));
      return true;
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("talent.errors.saveProfile")
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextPhoto = event.target.files?.[0] ?? null;
    setPhotoError("");
    setPhotoSuccessMessage("");

    if (!nextPhoto) {
      setSelectedPhoto(null);
      return;
    }

    if (!ALLOWED_PROFILE_PHOTO_TYPES.includes(nextPhoto.type)) {
      setSelectedPhoto(null);
      event.target.value = "";
      setPhotoError("La foto debe ser una imagen JPEG, PNG o WebP.");
      return;
    }

    if (nextPhoto.size > MAX_PROFILE_PHOTO_SIZE) {
      setSelectedPhoto(null);
      event.target.value = "";
      setPhotoError("La foto supera el tamano maximo permitido de 5 MB.");
      return;
    }

    setSelectedPhoto(nextPhoto);
  };

  const handlePhotoUpload = async () => {
    if (!selectedPhoto) {
      return;
    }

    try {
      setIsUploadingPhoto(true);
      setPhotoError("");
      setPhotoSuccessMessage("");
      const uploadedPhoto = await uploadMyTalentProfilePhoto(selectedPhoto, token ?? undefined);
      setPhotoUrl(uploadedPhoto.photo_url);
      updateProfilePhoto(uploadedPhoto.photo_url);
      setSelectedPhoto(null);
      if (photoInputRef.current) {
        photoInputRef.current.value = "";
      }
      setPhotoSuccessMessage("Foto de perfil actualizada correctamente.");
    } catch (uploadError) {
      setPhotoError(
        uploadError instanceof Error
          ? uploadError.message
          : "No se pudo subir la foto de perfil."
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void saveProfile();
  };

  const handleCancelPhotoSelection = () => {
    setSelectedPhoto(null);
    setPhotoError("");
    setPhotoSuccessMessage("");

    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  };

  const handlePortfolioPdfChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextPortfolioPdf = event.target.files?.[0] ?? null;
    setPortfolioPdfError("");
    setPortfolioPdfSuccessMessage("");

    if (!nextPortfolioPdf) {
      setSelectedPortfolioPdf(null);
      return;
    }

    if (nextPortfolioPdf.type !== "application/pdf") {
      setSelectedPortfolioPdf(null);
      event.target.value = "";
      setPortfolioPdfError("El archivo debe estar en formato PDF.");
      return;
    }

    if (nextPortfolioPdf.size > MAX_PORTFOLIO_PDF_SIZE) {
      setSelectedPortfolioPdf(null);
      event.target.value = "";
      setPortfolioPdfError("El PDF supera el tamano maximo permitido de 10 MB.");
      return;
    }

    setSelectedPortfolioPdf(nextPortfolioPdf);
  };

  const handlePortfolioPdfUpload = async () => {
    if (!selectedPortfolioPdf) {
      return;
    }

    try {
      setIsUploadingPortfolioPdf(true);
      setPortfolioPdfError("");
      setPortfolioPdfSuccessMessage("");
      const uploadedPortfolioPdf = await uploadMyTalentPortfolioPdf(selectedPortfolioPdf, token ?? undefined);
      setPortfolioPdfUrl(uploadedPortfolioPdf.portfolio_pdf_url);
      setSelectedPortfolioPdf(null);
      if (portfolioPdfInputRef.current) {
        portfolioPdfInputRef.current.value = "";
      }
      setPortfolioPdfSuccessMessage("PDF guardado correctamente.");
    } catch (uploadError) {
      setPortfolioPdfError(
        uploadError instanceof Error
          ? uploadError.message
          : "No se pudo subir el PDF."
      );
    } finally {
      setIsUploadingPortfolioPdf(false);
    }
  };

  const handleCancelPortfolioPdfSelection = () => {
    setSelectedPortfolioPdf(null);
    setPortfolioPdfError("");

    if (portfolioPdfInputRef.current) {
      portfolioPdfInputRef.current.value = "";
    }
  };

  const handleRemovePortfolioPdf = () => {
    handleCancelPortfolioPdfSelection();
    setPortfolioPdfUrl("");
    setPortfolioPdfSuccessMessage(
      "El PDF se quitó de esta vista. Para eliminarlo permanentemente se necesita soporte del backend."
    );
  };

  const handlePortfolioItemChange = (
    index: number,
    field: keyof PortfolioItemFormState,
    value: string
  ) => {
    setFormData((current) => ({
      ...current,
      portfolio_items: current.portfolio_items.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      )),
    }));
  };

  const handleAddPortfolioItem = () => {
    const nextIndex = formData.portfolio_items.length;
    setFormData((current) => ({
      ...current,
      portfolio_items: [...current.portfolio_items, { ...emptyPortfolioItem }],
    }));
    setPortfolioItemBeforeEdit(null);
    setViewingPortfolioItemIndex(null);
    setEditingPortfolioItemIndex(nextIndex);
    setIsCreatingPortfolioItem(true);
  };

  const resetPortfolioItemMode = () => {
    setEditingPortfolioItemIndex(null);
    setViewingPortfolioItemIndex(null);
    setPortfolioItemBeforeEdit(null);
    setIsCreatingPortfolioItem(false);
  };

  const handleEditPortfolioItem = (index: number) => {
    setPortfolioItemBeforeEdit({ ...formData.portfolio_items[index] });
    setViewingPortfolioItemIndex(null);
    setEditingPortfolioItemIndex(index);
    setIsCreatingPortfolioItem(false);
  };

  const handleCancelPortfolioItem = (index: number) => {
    if (isCreatingPortfolioItem && editingPortfolioItemIndex === index) {
      setFormData((current) => ({
        ...current,
        portfolio_items: current.portfolio_items.filter((_, itemIndex) => itemIndex !== index),
      }));
    } else if (portfolioItemBeforeEdit) {
      setFormData((current) => ({
        ...current,
        portfolio_items: current.portfolio_items.map((item, itemIndex) => (
          itemIndex === index ? portfolioItemBeforeEdit : item
        )),
      }));
    }

    resetPortfolioItemMode();
  };

  const handleSavePortfolioItem = async () => {
    if (await saveProfile()) {
      resetPortfolioItemMode();
    }
  };

  const handleRemovePortfolioItem = async (index: number) => {
    const previousFormData = formData;
    const nextFormData = {
      ...formData,
      portfolio_items: formData.portfolio_items.filter((_, itemIndex) => itemIndex !== index),
    };
    setFormData(nextFormData);

    if (isCreatingPortfolioItem && editingPortfolioItemIndex === index) {
      resetPortfolioItemMode();
      return;
    }

    if (await saveProfile(nextFormData)) {
      resetPortfolioItemMode();
    } else {
      setFormData(previousFormData);
    }
  };

  const displayName = formData.display_name.trim() || fallbackDisplayName;
  const avatarLetter = displayName.charAt(0).toUpperCase() || "T";
  const displayedPhotoUrl = photoPreviewUrl || photoUrl;
  const profileCompletionRequirements = useMemo<ProfileCompletionRequirement[]>(() => [
    { isComplete: Boolean(photoUrl), label: "Subir foto", weight: 10 },
    { isComplete: Boolean(formData.display_name.trim()), label: "Agregar nombre visible", weight: 5 },
    { isComplete: Boolean(formData.location.trim()), label: "Agregar ubicación", weight: 5 },
    { isComplete: Boolean(formData.main_specialty.trim()), label: "Agregar especialidad principal", weight: 10 },
    { isComplete: formData.specialties.length > 0, label: "Agregar especialidades", weight: 10 },
    { isComplete: formData.skills.length > 0, label: "Agregar habilidades", weight: 10 },
    { isComplete: formData.languages.length > 0, label: "Agregar idiomas", weight: 10 },
    { isComplete: Boolean(formData.bio.trim()), label: "Agregar biografía", weight: 10 },
    { isComplete: Number(formData.experience_years) > 0, label: "Agregar años de experiencia", weight: 5 },
    { isComplete: formData.portfolio_items.length > 0, label: "Agregar experiencia", weight: 10 },
    { isComplete: Boolean(portfolioPdfUrl), label: "Subir CV", weight: 10 },
    { isComplete: formData.is_public, label: "Activar perfil público", weight: 5 },
  ], [formData, photoUrl, portfolioPdfUrl]);
  const profileCompletion = profileCompletionRequirements.reduce(
    (total, requirement) => total + (requirement.isComplete ? requirement.weight : 0),
    0
  );
  const missingProfileRequirements = profileCompletionRequirements.filter(
    (requirement) => !requirement.isComplete
  );

  return (
    <div className="talent-page">
      <section className="talent-card talent-profile-header">
        <div className="talent-profile-photo">
          <button
            className="talent-avatar talent-avatar--editable"
            type="button"
            aria-label="Cambiar foto de perfil"
            disabled={isUploadingPhoto}
            onClick={() => photoInputRef.current?.click()}
          >
            {displayedPhotoUrl ? (
              <img src={displayedPhotoUrl} alt={`Foto de perfil de ${displayName}`} />
            ) : (
              <span aria-hidden="true">{avatarLetter}</span>
            )}
            <span className="talent-avatar__edit-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M9 7 10.5 5h3L15 7h2.5A2.5 2.5 0 0 1 20 9.5v7A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-7A2.5 2.5 0 0 1 6.5 7H9Zm3 9a3.25 3.25 0 1 0 0-6.5A3.25 3.25 0 0 0 12 16Zm0-1.5a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5Z" />
              </svg>
            </span>
          </button>
          <input
            ref={photoInputRef}
            className="talent-profile-photo__input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoChange}
            disabled={isUploadingPhoto}
          />
          {selectedPhoto ? (
            <div className="talent-profile-photo__actions">
              <button
                className="talent-button talent-button--primary"
                type="button"
                disabled={isUploadingPhoto}
                onClick={() => void handlePhotoUpload()}
              >
                {isUploadingPhoto ? "Subiendo..." : "Guardar foto"}
              </button>
              <button
                className="talent-button"
                type="button"
                disabled={isUploadingPhoto}
                onClick={handleCancelPhotoSelection}
              >
                Cancelar
              </button>
            </div>
          ) : null}
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

          {photoError ? <p className="talent-feedback talent-feedback--error">{photoError}</p> : null}
          {photoSuccessMessage ? (
            <p className="talent-feedback talent-feedback--success">{photoSuccessMessage}</p>
          ) : null}
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

                <MultiSelectField
                  label={t("talent.profile.specialties")}
                  options={SPECIALTY_OPTIONS}
                  values={formData.specialties}
                  onChange={(specialties) =>
                    setFormData((current) => ({ ...current, specialties }))
                  }
                />

                <MultiSelectField
                  label={t("talent.profile.languages")}
                  options={LANGUAGE_OPTIONS}
                  values={formData.languages}
                  onChange={(languages) =>
                    setFormData((current) => ({ ...current, languages }))
                  }
                />

                <MultiSelectField
                  label={t("talent.profile.skills")}
                  options={SKILL_OPTIONS}
                  values={formData.skills}
                  onChange={(skills) =>
                    setFormData((current) => ({ ...current, skills }))
                  }
                />

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

                <div className="talent-input-group talent-input-group--full">
                  <span>{t("talent.profile.portfolioLinks")}</span>
                  <small className="talent-selection-empty">
                    Agrega proyectos, películas, cortos u obras en los que hayas participado.
                  </small>
                  <div className="talent-portfolio-items">
                    {formData.portfolio_items.map((item, index) => {
                      return (
                        <div key={index} className="talent-portfolio-item">
                          <div className="talent-portfolio-item__summary">
                            <h3>{item.title || "Trabajo sin nombre"}</h3>
                            <p>{[item.project_type, item.role, item.year].filter(Boolean).join(" | ") || "Sin detalles informados."}</p>
                          </div>
                          <div className="talent-placeholder-actions talent-portfolio-item__actions">
                            <button className="talent-button" type="button" onClick={() => setViewingPortfolioItemIndex(index)}>
                              Ver
                            </button>
                            <button className="talent-button" type="button" onClick={() => handleEditPortfolioItem(index)}>
                              Editar
                            </button>
                            <button className="talent-button talent-button--danger" type="button" disabled={isSaving} onClick={() => void handleRemovePortfolioItem(index)}>
                              Eliminar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="talent-portfolio-add-action">
                    <button
                      className="talent-button"
                      type="button"
                      disabled={editingPortfolioItemIndex !== null}
                      onClick={handleAddPortfolioItem}
                    >
                      + Agregar trabajo
                    </button>
                  </div>
                </div>

                <div className="talent-input-group talent-input-group--full">
                  <span>CV o portafolio en PDF</span>
                  <small className="talent-selection-empty">
                    Adjunta tu CV o portafolio en formato PDF.
                  </small>
                  <input
                    ref={portfolioPdfInputRef}
                    className="talent-portfolio-pdf__input"
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handlePortfolioPdfChange}
                    disabled={isUploadingPortfolioPdf}
                  />
                  <div className="talent-portfolio-pdf">
                    {!portfolioPdfUrl ? (
                      <button
                        className="talent-button"
                        type="button"
                        disabled={isUploadingPortfolioPdf}
                        onClick={() => portfolioPdfInputRef.current?.click()}
                      >
                        Seleccionar PDF
                      </button>
                    ) : null}
                    {!selectedPortfolioPdf && !portfolioPdfUrl ? (
                      <span className="talent-portfolio-pdf__empty">Aún no has seleccionado un archivo.</span>
                    ) : null}
                  </div>
                  {selectedPortfolioPdf ? (
                    <div className="talent-portfolio-pdf__selection">
                      <div>
                        <strong>{selectedPortfolioPdf.name}</strong>
                        <span>{formatFileSize(selectedPortfolioPdf.size)}</span>
                        <span>{isUploadingPortfolioPdf ? "Subiendo archivo..." : "Listo para subir"}</span>
                      </div>
                      <div className="talent-placeholder-actions">
                        <button
                          className="talent-button talent-button--primary"
                          type="button"
                          disabled={isUploadingPortfolioPdf}
                          onClick={() => void handlePortfolioPdfUpload()}
                        >
                          {isUploadingPortfolioPdf ? "Subiendo..." : "Subir PDF"}
                        </button>
                        <button
                          className="talent-button"
                          type="button"
                          disabled={isUploadingPortfolioPdf}
                          onClick={handleCancelPortfolioPdfSelection}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {portfolioPdfUrl ? (
                    <div className="talent-portfolio-pdf__saved">
                      <div>
                        <strong>PDF guardado</strong>
                        <span>Disponible para compartir desde tu perfil.</span>
                      </div>
                      <div className="talent-placeholder-actions">
                        <a
                          className="talent-button talent-button--primary"
                          href={portfolioPdfUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Ver PDF
                        </a>
                        <button className="talent-button" type="button" onClick={() => portfolioPdfInputRef.current?.click()}>
                          Reemplazar PDF
                        </button>
                        <button className="talent-button talent-button--danger" type="button" onClick={handleRemovePortfolioPdf}>
                          Eliminar PDF
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {portfolioPdfError ? (
                    <p className="talent-feedback talent-feedback--error">{portfolioPdfError}</p>
                  ) : null}
                  {portfolioPdfSuccessMessage ? (
                    <p className="talent-feedback talent-feedback--success">
                      {portfolioPdfSuccessMessage}
                    </p>
                  ) : null}
                </div>
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

              <div className="talent-profile-requirements">
                {missingProfileRequirements.length > 0 ? (
                  <>
                    <p>Completa estos elementos para mejorar tu perfil:</p>
                    <ul>
                      {missingProfileRequirements.map((requirement) => (
                        <li key={requirement.label}>{requirement.label}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="talent-profile-requirements__complete">
                    ✓ Perfil completo y listo para productores.
                  </p>
                )}
              </div>

              <ul className="talent-chip-list">
                {formData.specialties.length > 0 ? (
                  formData.specialties.map((specialty) => (
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

        </form>
      )}

      {viewingPortfolioItemIndex !== null ? (
        <div className="talent-modal" role="presentation">
          <article className="talent-modal__panel talent-portfolio-modal" role="dialog" aria-modal="true" aria-labelledby="portfolio-detail-title">
            <div className="talent-portfolio-modal__heading">
              <div>
                <p className="talent-page__eyebrow">Detalle del trabajo</p>
                <h2 id="portfolio-detail-title">
                  {formData.portfolio_items[viewingPortfolioItemIndex]?.title || "Trabajo sin nombre"}
                </h2>
              </div>
            </div>
            <div className="talent-portfolio-modal__details">
              <p><strong>Nombre:</strong> {formData.portfolio_items[viewingPortfolioItemIndex]?.title || "No informado"}</p>
              <p><strong>Tipo:</strong> {formData.portfolio_items[viewingPortfolioItemIndex]?.project_type || "No informado"}</p>
              <p><strong>Rol:</strong> {formData.portfolio_items[viewingPortfolioItemIndex]?.role || "No informado"}</p>
              <p><strong>Año:</strong> {formData.portfolio_items[viewingPortfolioItemIndex]?.year || "No informado"}</p>
              {formData.portfolio_items[viewingPortfolioItemIndex]?.url ? (
                <p><strong>Link:</strong> {formData.portfolio_items[viewingPortfolioItemIndex].url}</p>
              ) : null}
            </div>
            {formData.portfolio_items[viewingPortfolioItemIndex]?.url ? (
              <a
                className="talent-button talent-button--primary talent-portfolio-modal__link"
                href={formData.portfolio_items[viewingPortfolioItemIndex].url}
                target="_blank"
                rel="noreferrer"
              >
                Abrir enlace
              </a>
            ) : null}
            <div className="talent-placeholder-actions talent-portfolio-modal__actions">
              <button className="talent-button talent-button--primary" type="button" onClick={() => handleEditPortfolioItem(viewingPortfolioItemIndex)}>
                Editar
              </button>
              <button className="talent-button talent-button--danger" type="button" disabled={isSaving} onClick={() => void handleRemovePortfolioItem(viewingPortfolioItemIndex)}>
                Eliminar
              </button>
              <button className="talent-button" type="button" onClick={() => setViewingPortfolioItemIndex(null)}>
                Cerrar
              </button>
            </div>
          </article>
        </div>
      ) : null}

      {editingPortfolioItemIndex !== null ? (
        <div className="talent-modal" role="presentation">
          <article className="talent-modal__panel talent-portfolio-modal" role="dialog" aria-modal="true" aria-labelledby="portfolio-form-title">
            <div className="talent-portfolio-modal__heading">
              <div>
                <p className="talent-page__eyebrow">{isCreatingPortfolioItem ? "Nuevo trabajo" : "Editar trabajo"}</p>
                <h2 id="portfolio-form-title">{isCreatingPortfolioItem ? "Agregar experiencia" : formData.portfolio_items[editingPortfolioItemIndex]?.title || "Trabajo sin nombre"}</h2>
              </div>
            </div>
            <div className="talent-portfolio-modal__form">
              <label className="talent-input-group talent-input-group--full">
                <span>Nombre del proyecto</span>
                <input value={formData.portfolio_items[editingPortfolioItemIndex]?.title ?? ""} onChange={(event) => handlePortfolioItemChange(editingPortfolioItemIndex, "title", event.target.value)} placeholder="Nombre de la película, corto, obra o proyecto" />
              </label>
              <label className="talent-input-group">
                <span>Tipo de proyecto</span>
                <select value={formData.portfolio_items[editingPortfolioItemIndex]?.project_type ?? ""} onChange={(event) => handlePortfolioItemChange(editingPortfolioItemIndex, "project_type", event.target.value)}>
                  <option value="">Seleccionar tipo...</option>
                  {PROJECT_TYPE_OPTIONS.map((projectType) => <option key={projectType} value={projectType}>{projectType}</option>)}
                </select>
              </label>
              <label className="talent-input-group">
                <span>Rol desempeñado</span>
                <input value={formData.portfolio_items[editingPortfolioItemIndex]?.role ?? ""} onChange={(event) => handlePortfolioItemChange(editingPortfolioItemIndex, "role", event.target.value)} placeholder="Dirección, actuación, sonido..." />
              </label>
              <label className="talent-input-group">
                <span>Año</span>
                <input type="number" min="1900" max="2100" value={formData.portfolio_items[editingPortfolioItemIndex]?.year ?? ""} onChange={(event) => handlePortfolioItemChange(editingPortfolioItemIndex, "year", event.target.value)} placeholder="2026" />
              </label>
              <label className="talent-input-group talent-input-group--full">
                <span>Link opcional</span>
                <input type="url" value={formData.portfolio_items[editingPortfolioItemIndex]?.url ?? ""} onChange={(event) => handlePortfolioItemChange(editingPortfolioItemIndex, "url", event.target.value)} placeholder="IMDb, tráiler, YouTube, Drive..." />
              </label>
            </div>
            <div className="talent-placeholder-actions talent-portfolio-modal__actions">
              <button className="talent-button talent-button--primary" type="button" disabled={isSaving} onClick={() => void handleSavePortfolioItem()}>
                {isSaving ? t("common.saving") : isCreatingPortfolioItem ? "Guardar trabajo" : "Guardar cambios"}
              </button>
              <button className="talent-button" type="button" disabled={isSaving} onClick={() => handleCancelPortfolioItem(editingPortfolioItemIndex)}>
                Cancelar
              </button>
              <button className="talent-button talent-button--danger" type="button" disabled={isSaving} onClick={() => void handleRemovePortfolioItem(editingPortfolioItemIndex)}>
                Eliminar
              </button>
            </div>
          </article>
        </div>
      ) : null}
    </div>
  );
}

export default TalentProfile;
