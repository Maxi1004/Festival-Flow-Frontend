import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  FiArchive,
  FiCheckCircle,
  FiClock,
  FiEdit2,
  FiExternalLink,
  FiEye,
  FiFilm,
  FiInbox,
  FiRefreshCw,
  FiSearch,
  FiUploadCloud,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import {
  getAdminFestivals,
  importFestivalsExcel,
  refreshFestivalStatuses,
  updateFestival,
} from "../../service/adminFestivalApi";
import type {
  Festival,
  FestivalImportResult,
  FestivalStatus,
  FestivalUpdatePayload,
} from "../../types/festival";
import { useCurrentProfile } from "../useCurrentProfile";
import AdminGuard from "./AdminGuard";
import FestivalAuditPanel from "./FestivalAuditPanel";

const STATUS_OPTIONS: FestivalStatus[] = [
  "OPEN",
  "UPCOMING",
  "CLOSED",
  "ARCHIVED",
  "UNKNOWN",
];

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

const statusStyles: Record<FestivalStatus, string> = {
  OPEN:
    "bg-emerald-100 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-950/60 dark:text-emerald-300",
  UPCOMING:
    "bg-amber-100 text-amber-800 ring-amber-600/20 dark:bg-amber-950/60 dark:text-amber-300",
  CLOSED:
    "bg-red-100 text-red-800 ring-red-600/20 dark:bg-red-950/60 dark:text-red-300",
  ARCHIVED:
    "bg-slate-200 text-slate-700 ring-slate-500/20 dark:bg-slate-700 dark:text-slate-200",
  UNKNOWN:
    "bg-blue-100 text-blue-800 ring-blue-600/20 dark:bg-blue-950/60 dark:text-blue-300",
};

type Filters = {
  search: string;
  status: string;
  country: string;
  platform: string;
};

type EditForm = {
  name: string;
  country: string;
  website: string;
  submission_url: string;
  platform: string;
  opening_date: string;
  deadline: string;
  event_date: string;
  fee: string;
  status: FestivalStatus;
  edition_year: string;
  contact: string;
  notes: string;
};

const initialFilters: Filters = {
  search: "",
  status: "",
  country: "",
  platform: "",
};

function normalizeStatus(value?: string | null): FestivalStatus {
  const status = value?.trim().toUpperCase();
  return STATUS_OPTIONS.includes(status as FestivalStatus)
    ? (status as FestivalStatus)
    : "UNKNOWN";
}

function normalizeText(value?: string | null): string {
  return value?.trim().toLocaleLowerCase("es") ?? "";
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "No informado";
  }

  const parsedDate = new Date(value.includes("T") ? value : `${value}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

function formatReviewDate(festival: Festival): string {
  return formatDate(
    festival.last_reviewed_at ?? festival.updated_at ?? festival.created_at
  );
}

function getDeadlineTime(value?: string | null): number {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const time = new Date(value.includes("T") ? value : `${value}T00:00:00`).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

function inputDate(value?: string | null): string {
  return value?.slice(0, 10) ?? "";
}

function nullable(value: string): string | null {
  const trimmedValue = value.trim();
  return trimmedValue || null;
}

function createEditForm(festival: Festival): EditForm {
  return {
    name: festival.name ?? "",
    country: festival.country ?? "",
    website: festival.website ?? "",
    submission_url: festival.submission_url ?? "",
    platform: festival.platform ?? "",
    opening_date: inputDate(festival.opening_date),
    deadline: inputDate(festival.deadline),
    event_date: inputDate(festival.event_date),
    fee: festival.fee == null ? "" : String(festival.fee),
    status: normalizeStatus(festival.status),
    edition_year:
      festival.edition_year == null ? "" : String(festival.edition_year),
    contact: festival.contact ?? "",
    notes: festival.notes ?? "",
  };
}

function StatusBadge({ status }: { status?: string | null }) {
  const normalizedStatus = normalizeStatus(status);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${statusStyles[normalizedStatus]}`}
    >
      {normalizedStatus}
    </span>
  );
}

function Modal({
  title,
  eyebrow,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className={`max-h-[92vh] w-full overflow-y-auto rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 text-[var(--text-primary)] shadow-2xl ${
          wide ? "max-w-5xl" : "max-w-2xl"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {eyebrow}
            </p>
            <h2 className="text-2xl font-extrabold">{title}</h2>
          </div>
          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-secondary)] transition hover:bg-[var(--hover-bg)]"
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <FiX aria-hidden="true" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function DetailItem({
  label,
  value,
  href,
  full = false,
}: {
  label: string;
  value: ReactNode;
  href?: string | null;
  full?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 ${
        full ? "md:col-span-2" : ""
      }`}
    >
      <dt className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </dt>
      <dd className="m-0 break-words font-semibold text-[var(--text-primary)]">
        {href ? (
          <a
            className="inline-flex items-center gap-2 text-blue-600 hover:underline"
            href={href}
            target="_blank"
            rel="noreferrer"
          >
            {value}
            <FiExternalLink aria-hidden="true" />
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-700"
            key={`kpi-${index}`}
          />
        ))}
      </div>
      <div className="h-20 rounded-2xl bg-slate-200 dark:bg-slate-700" />
      <div className="space-y-3 rounded-2xl border border-[var(--border-color)] p-4">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            className="h-12 rounded-xl bg-slate-200 dark:bg-slate-700"
            key={`row-${index}`}
          />
        ))}
      </div>
    </div>
  );
}

function AdminFestivalsContent() {
  const { token } = useCurrentProfile();
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [detailFestival, setDetailFestival] = useState<Festival | null>(null);
  const [editFestival, setEditFestival] = useState<Festival | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editError, setEditError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [kpiStatus, setKpiStatus] = useState<FestivalStatus | "TOTAL" | null>(
    null
  );
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<FestivalImportResult | null>(
    null
  );
  const [importError, setImportError] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const loadFestivals = useCallback(
    async (showSkeleton = true) => {
      try {
        if (showSkeleton) {
          setIsLoading(true);
        }
        setError("");
        const nextFestivals = await getAdminFestivals(token ?? undefined);
        setFestivals(nextFestivals);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudieron cargar los festivales."
        );
      } finally {
        if (showSkeleton) {
          setIsLoading(false);
        }
      }
    },
    [token]
  );

  useEffect(() => {
    void loadFestivals();
  }, [loadFestivals]);

  const countryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          festivals
            .map((festival) => festival.country?.trim())
            .filter((country): country is string => Boolean(country))
        )
      ).sort((a, b) => a.localeCompare(b, "es")),
    [festivals]
  );

  const platformOptions = useMemo(
    () =>
      Array.from(
        new Set(
          festivals
            .map((festival) => festival.platform?.trim())
            .filter((platform): platform is string => Boolean(platform))
        )
      ).sort((a, b) => a.localeCompare(b, "es")),
    [festivals]
  );

  const filteredFestivals = useMemo(() => {
    const search = normalizeText(filters.search);

    return festivals.filter((festival) => {
      const matchesSearch =
        !search ||
        normalizeText(festival.name).includes(search) ||
        normalizeText(festival.country).includes(search) ||
        normalizeText(festival.platform).includes(search);
      const matchesStatus =
        !filters.status || normalizeStatus(festival.status) === filters.status;
      const matchesCountry =
        !filters.country || festival.country?.trim() === filters.country;
      const matchesPlatform =
        !filters.platform || festival.platform?.trim() === filters.platform;

      return (
        matchesSearch && matchesStatus && matchesCountry && matchesPlatform
      );
    });
  }, [festivals, filters]);

  const sortedFestivals = useMemo(
    () =>
      [...filteredFestivals].sort(
        (a, b) =>
          getDeadlineTime(a.deadline) - getDeadlineTime(b.deadline) ||
          a.name.localeCompare(b.name, "es")
      ),
    [filteredFestivals]
  );

  const totalPages = Math.max(1, Math.ceil(sortedFestivals.length / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedFestivals = useMemo(
    () => sortedFestivals.slice(pageStart, pageStart + pageSize),
    [pageSize, pageStart, sortedFestivals]
  );
  const visibleStart = sortedFestivals.length === 0 ? 0 : pageStart + 1;
  const visibleEnd = Math.min(pageStart + pageSize, sortedFestivals.length);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const kpiCounts = useMemo(
    () => ({
      OPEN: festivals.filter(
        (festival) => normalizeStatus(festival.status) === "OPEN"
      ).length,
      UPCOMING: festivals.filter(
        (festival) => normalizeStatus(festival.status) === "UPCOMING"
      ).length,
      CLOSED: festivals.filter(
        (festival) => normalizeStatus(festival.status) === "CLOSED"
      ).length,
      ARCHIVED: festivals.filter(
        (festival) => normalizeStatus(festival.status) === "ARCHIVED"
      ).length,
      UNKNOWN: festivals.filter(
        (festival) => normalizeStatus(festival.status) === "UNKNOWN"
      ).length,
      TOTAL: festivals.length,
    }),
    [festivals]
  );

  const kpiFestivals = useMemo(() => {
    if (!kpiStatus) {
      return [];
    }

    const matchingFestivals = kpiStatus === "TOTAL"
      ? festivals
      : festivals.filter(
          (festival) => normalizeStatus(festival.status) === kpiStatus
        );

    return [...matchingFestivals].sort(
      (a, b) =>
        getDeadlineTime(a.deadline) - getDeadlineTime(b.deadline) ||
        a.name.localeCompare(b.name, "es")
    );
  }, [festivals, kpiStatus]);

  const handleFilterChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
    setCurrentPage(1);
  };

  const handleRefreshStatuses = async () => {
    try {
      setIsRefreshing(true);
      setError("");
      setSuccess("");
      await refreshFestivalStatuses(token ?? undefined);
      await loadFestivals(false);
      setSuccess("Estados recalculados correctamente.");
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "No se pudieron recalcular los estados."
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const openEditModal = (festival: Festival) => {
    setEditFestival(festival);
    setEditForm(createEditForm(festival));
    setEditError("");
  };

  const handleEditChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setEditForm((current) => (current ? { ...current, [name]: value } : current));
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editFestival || !editForm) {
      return;
    }

    if (!editForm.name.trim()) {
      setEditError("El nombre del festival es obligatorio.");
      return;
    }

    const editionYear = editForm.edition_year.trim()
      ? Number(editForm.edition_year)
      : null;

    if (editionYear !== null && !Number.isInteger(editionYear)) {
      setEditError("Edition year debe ser un año válido.");
      return;
    }

    const payload: FestivalUpdatePayload = {
      name: editForm.name.trim(),
      country: nullable(editForm.country),
      website: nullable(editForm.website),
      submission_url: nullable(editForm.submission_url),
      platform: nullable(editForm.platform),
      opening_date: nullable(editForm.opening_date),
      deadline: nullable(editForm.deadline),
      event_date: nullable(editForm.event_date),
      fee: nullable(editForm.fee),
      status: editForm.status,
      edition_year: editionYear,
      contact: nullable(editForm.contact),
      notes: nullable(editForm.notes),
    };

    try {
      setIsSaving(true);
      setEditError("");
      const updatedFestival = await updateFestival(
        editFestival.id,
        payload,
        token ?? undefined
      );

      setFestivals((current) =>
        current.map((festival) =>
          festival.id === editFestival.id
            ? { ...festival, ...payload, ...updatedFestival }
            : festival
        )
      );
      setDetailFestival((current) =>
        current?.id === editFestival.id
          ? { ...current, ...payload, ...updatedFestival }
          : current
      );
      setEditFestival(null);
      setEditForm(null);
      setSuccess(`Festival "${payload.name}" actualizado correctamente.`);
    } catch (saveError) {
      setEditError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo actualizar el festival."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleImport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!importFile) {
      setImportError("Selecciona un archivo Excel para continuar.");
      return;
    }

    try {
      setIsImporting(true);
      setImportError("");
      setImportResult(null);
      const result = await importFestivalsExcel(importFile, token ?? undefined);
      setImportResult(result);
      await loadFestivals(false);
    } catch (uploadError) {
      setImportError(
        uploadError instanceof Error
          ? uploadError.message
          : "No se pudo importar el archivo."
      );
    } finally {
      setIsImporting(false);
    }
  };

  const kpis = [
    {
      status: "OPEN" as const,
      count: kpiCounts.OPEN,
      icon: FiCheckCircle,
      accent:
        "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300",
    },
    {
      status: "UPCOMING" as const,
      count: kpiCounts.UPCOMING,
      icon: FiClock,
      accent:
        "text-amber-600 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300",
    },
    {
      status: "CLOSED" as const,
      count: kpiCounts.CLOSED,
      icon: FiXCircle,
      accent:
        "text-red-600 bg-red-100 dark:bg-red-950/60 dark:text-red-300",
    },
    {
      status: "ARCHIVED" as const,
      count: kpiCounts.ARCHIVED,
      icon: FiArchive,
      accent:
        "text-slate-600 bg-slate-200 dark:bg-slate-700 dark:text-slate-200",
    },
    {
      status: "UNKNOWN" as const,
      count: kpiCounts.UNKNOWN,
      icon: FiEye,
      accent:
        "text-blue-600 bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300",
    },
    {
      status: "TOTAL" as const,
      count: kpiCounts.TOTAL,
      icon: FiFilm,
      accent:
        "text-blue-600 bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300",
    },
  ];

  return (
    <div className="flex flex-col gap-6 text-[var(--text-primary)]">
      <section className="flex flex-col justify-between gap-5 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-soft)] lg:flex-row lg:items-center">
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Administración
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Gestión de Festivales
          </h1>
          <p className="mt-2 max-w-2xl leading-7 text-[var(--text-secondary)]">
            Importa, administra y revisa festivales disponibles para postulación.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] px-4 font-bold transition hover:bg-[var(--hover-bg)]"
            type="button"
            onClick={() => {
              setIsImportOpen(true);
              setImportError("");
              setImportResult(null);
            }}
          >
            <FiUploadCloud aria-hidden="true" />
            Subir Excel
          </button>
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 font-bold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
            type="button"
            disabled={isRefreshing}
            onClick={() => void handleRefreshStatuses()}
          >
            <FiRefreshCw
              className={isRefreshing ? "animate-spin" : ""}
              aria-hidden="true"
            />
            {isRefreshing ? "Recalculando..." : "Recalcular Estados"}
          </button>
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] px-4 font-bold transition hover:bg-[var(--hover-bg)]"
            type="button"
            onClick={() => void loadFestivals()}
          >
            <FiRefreshCw aria-hidden="true" />
            Recargar
          </button>
        </div>
      </section>

      {error ? (
        <div
          className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
          role="status"
        >
          {success}
        </div>
      ) : null}

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <>
          <section
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6"
            aria-label="Resumen de festivales"
          >
            {kpis.map((kpi) => {
              const Icon = kpi.icon;

              return (
                <button
                  className="group min-h-36 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 text-left shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg"
                  type="button"
                  key={kpi.status}
                  onClick={() => setKpiStatus(kpi.status)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-xs font-extrabold tracking-[0.14em] text-[var(--text-muted)]">
                        {kpi.status}
                      </span>
                      <strong className="mt-3 block text-4xl font-black">
                        {kpi.count}
                      </strong>
                    </div>
                    <span
                      className={`grid h-11 w-11 place-items-center rounded-2xl ${kpi.accent}`}
                    >
                      <Icon className="text-xl" aria-hidden="true" />
                    </span>
                  </div>
                  <span className="mt-4 block text-xs font-bold text-blue-600 opacity-0 transition group-hover:opacity-100">
                    Ver festivales
                  </span>
                </button>
              );
            })}
          </section>

          <FestivalAuditPanel
            token={token ?? undefined}
            onCleanupComplete={() => loadFestivals(false)}
          />

          <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)]">
            <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div>
                <h2 className="text-xl font-extrabold">Directorio de festivales</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Mostrando {visibleStart}-{visibleEnd} de{" "}
                  {sortedFestivals.length} registros
                </p>
              </div>
              {Object.values(filters).some(Boolean) ? (
                <button
                  className="text-sm font-bold text-blue-600 hover:underline"
                  type="button"
                  onClick={() => {
                    setFilters(initialFilters);
                    setCurrentPage(1);
                  }}
                >
                  Limpiar filtros
                </button>
              ) : null}
            </div>

            <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="relative">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Buscar festival
                </span>
                <FiSearch
                  className="absolute bottom-3.5 left-3.5 text-[var(--text-muted)]"
                  aria-hidden="true"
                />
                <input
                  className="h-12 w-full rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] pl-10 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  name="search"
                  value={filters.search}
                  placeholder="Nombre, país o plataforma"
                  onChange={handleFilterChange}
                />
              </label>

              <FilterSelect
                label="Estado"
                name="status"
                value={filters.status}
                options={STATUS_OPTIONS}
                onChange={handleFilterChange}
              />
              <FilterSelect
                label="País"
                name="country"
                value={filters.country}
                options={countryOptions}
                onChange={handleFilterChange}
              />
              <FilterSelect
                label="Plataforma"
                name="platform"
                value={filters.platform}
                options={platformOptions}
                onChange={handleFilterChange}
              />
            </div>

            {festivals.length === 0 ? (
              <EmptyState
                title="No hay festivales cargados"
                text="Importa un archivo Excel para comenzar a administrar el directorio."
              />
            ) : filteredFestivals.length === 0 ? (
              <EmptyState
                title="No hay coincidencias"
                text="Ajusta o limpia los filtros para ver otros festivales."
              />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)]">
                <table className="w-full min-w-[1120px] border-collapse text-sm">
                  <thead className="bg-[var(--bg-secondary)] text-left text-xs uppercase tracking-wider text-[var(--text-muted)]">
                    <tr>
                      <th className="px-4 py-4">Festival</th>
                      <th className="px-4 py-4">País</th>
                      <th className="px-4 py-4">Plataforma</th>
                      <th className="px-4 py-4">Deadline</th>
                      <th className="px-4 py-4">Evento</th>
                      <th className="px-4 py-4">Estado</th>
                      <th className="px-4 py-4">Última revisión</th>
                      <th className="px-4 py-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedFestivals.map((festival) => (
                      <tr
                        className="border-t border-[var(--border-color)] transition hover:bg-[var(--hover-bg)]"
                        key={festival.id}
                      >
                        <td className="max-w-72 px-4 py-4">
                          <strong className="block truncate text-[var(--text-primary)]">
                            {festival.name}
                          </strong>
                          <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">
                            {festival.edition_year
                              ? `Edición ${festival.edition_year}`
                              : "Edición no informada"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {festival.country || "No informado"}
                        </td>
                        <td className="px-4 py-4">
                          {festival.platform || "No informada"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 font-semibold">
                          {formatDate(festival.deadline)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          {formatDate(festival.event_date)}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={festival.status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-[var(--text-secondary)]">
                          {formatReviewDate(festival)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <button
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 font-bold transition hover:bg-[var(--hover-bg)]"
                              type="button"
                              onClick={() => setDetailFestival(festival)}
                            >
                              <FiEye aria-hidden="true" />
                              Ver
                            </button>
                            <button
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200 dark:hover:bg-blue-900"
                              type="button"
                              onClick={() => openEditModal(festival)}
                            >
                              <FiEdit2 aria-hidden="true" />
                              Editar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex flex-col gap-3 border-t border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
                    Registros por página
                    <select
                      className="h-10 rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-3 text-[var(--text-primary)] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      value={pageSize}
                      onChange={(event) => {
                        setPageSize(Number(event.target.value));
                        setCurrentPage(1);
                      }}
                    >
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-center gap-3">
                    <button
                      className="h-10 rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-4 text-sm font-bold transition hover:bg-[var(--hover-bg)] disabled:cursor-not-allowed disabled:opacity-50"
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() =>
                        setCurrentPage((page) => Math.max(1, page - 1))
                      }
                    >
                      Anterior
                    </button>
                    <span className="min-w-28 text-center text-sm font-semibold text-[var(--text-secondary)]">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      className="h-10 rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-4 text-sm font-bold transition hover:bg-[var(--hover-bg)] disabled:cursor-not-allowed disabled:opacity-50"
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() =>
                        setCurrentPage((page) => Math.min(totalPages, page + 1))
                      }
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {detailFestival ? (
        <FestivalDetailModal
          festival={detailFestival}
          onClose={() => setDetailFestival(null)}
          onEdit={() => {
            openEditModal(detailFestival);
            setDetailFestival(null);
          }}
        />
      ) : null}

      {editFestival && editForm ? (
        <Modal
          title={editFestival.name}
          eyebrow="Editar festival"
          wide
          onClose={() => {
            if (!isSaving) {
              setEditFestival(null);
              setEditForm(null);
            }
          }}
        >
          <form className="space-y-5" onSubmit={handleEditSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Nombre"
                name="name"
                value={editForm.name}
                required
                onChange={handleEditChange}
              />
              <FormField
                label="País"
                name="country"
                value={editForm.country}
                onChange={handleEditChange}
              />
              <FormField
                label="Website"
                name="website"
                type="url"
                value={editForm.website}
                onChange={handleEditChange}
              />
              <FormField
                label="URL postulación"
                name="submission_url"
                type="url"
                value={editForm.submission_url}
                onChange={handleEditChange}
              />
              <FormField
                label="Plataforma"
                name="platform"
                value={editForm.platform}
                onChange={handleEditChange}
              />
              <FormField
                label="Fee"
                name="fee"
                value={editForm.fee}
                onChange={handleEditChange}
              />
              <FormField
                label="Fecha apertura"
                name="opening_date"
                type="date"
                value={editForm.opening_date}
                onChange={handleEditChange}
              />
              <FormField
                label="Deadline"
                name="deadline"
                type="date"
                value={editForm.deadline}
                onChange={handleEditChange}
              />
              <FormField
                label="Fecha evento"
                name="event_date"
                type="date"
                value={editForm.event_date}
                onChange={handleEditChange}
              />
              <FormField
                label="Edition year"
                name="edition_year"
                type="number"
                value={editForm.edition_year}
                onChange={handleEditChange}
              />
              <label className="space-y-2">
                <span className="block text-sm font-bold text-[var(--text-secondary)]">
                  Estado
                </span>
                <select
                  className="h-12 w-full rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] px-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  name="status"
                  value={editForm.status}
                  onChange={handleEditChange}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option value={status} key={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <FormField
                label="Contacto"
                name="contact"
                value={editForm.contact}
                onChange={handleEditChange}
              />
              <label className="space-y-2 md:col-span-2">
                <span className="block text-sm font-bold text-[var(--text-secondary)]">
                  Notas
                </span>
                <textarea
                  className="min-h-32 w-full resize-y rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] p-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  name="notes"
                  value={editForm.notes}
                  onChange={handleEditChange}
                />
              </label>
            </div>

            {editError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">
                {editError}
              </div>
            ) : null}

            <div className="flex justify-end gap-3">
              <button
                className="h-11 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] px-5 font-bold hover:bg-[var(--hover-bg)]"
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setEditFestival(null);
                  setEditForm(null);
                }}
              >
                Cancelar
              </button>
              <button
                className="h-11 rounded-xl bg-blue-600 px-5 font-bold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {isImportOpen ? (
        <Modal
          title="Importar festivales"
          eyebrow="Archivo Excel"
          onClose={() => {
            if (!isImporting) {
              setIsImportOpen(false);
              setImportFile(null);
            }
          }}
        >
          <form className="space-y-5" onSubmit={handleImport}>
            <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-8 text-center transition hover:border-blue-400">
              <FiUploadCloud
                className="mx-auto mb-3 text-4xl text-blue-600"
                aria-hidden="true"
              />
              <strong className="block">
                {importFile ? importFile.name : "Seleccionar archivo"}
              </strong>
              <span className="mt-2 block text-sm text-[var(--text-muted)]">
                Formatos admitidos: .xlsx y .xls
              </span>
              <input
                className="sr-only"
                type="file"
                accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => {
                  setImportFile(event.target.files?.[0] ?? null);
                  setImportError("");
                  setImportResult(null);
                }}
              />
            </label>

            {importError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">
                {importError}
              </div>
            ) : null}

            {importResult ? <ImportSummary result={importResult} /> : null}

            <div className="flex justify-end gap-3">
              <button
                className="h-11 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] px-5 font-bold hover:bg-[var(--hover-bg)]"
                type="button"
                disabled={isImporting}
                onClick={() => {
                  setIsImportOpen(false);
                  setImportFile(null);
                }}
              >
                Cerrar
              </button>
              <button
                className="h-11 rounded-xl bg-blue-600 px-5 font-bold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
                type="submit"
                disabled={isImporting || !importFile}
              >
                {isImporting ? "Importando..." : "Importar"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {kpiStatus ? (
        <Modal
          title={`${kpiStatus} · ${kpiFestivals.length}`}
          eyebrow="Festivales por estado"
          wide
          onClose={() => setKpiStatus(null)}
        >
          {kpiFestivals.length ? (
            <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)]">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-[var(--bg-secondary)] text-left text-xs uppercase tracking-wider text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3">Festival</th>
                    <th className="px-4 py-3">País</th>
                    <th className="px-4 py-3">Deadline</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {kpiFestivals.map((festival) => (
                    <tr
                      className="border-t border-[var(--border-color)]"
                      key={festival.id}
                    >
                      <td className="px-4 py-3 font-bold">{festival.name}</td>
                      <td className="px-4 py-3">
                        {festival.country || "No informado"}
                      </td>
                      <td className="px-4 py-3">
                        {formatDate(festival.deadline)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={festival.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="font-bold text-blue-600 hover:underline"
                          type="button"
                          onClick={() => {
                            setDetailFestival(festival);
                            setKpiStatus(null);
                          }}
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Sin festivales"
              text="No hay registros para este estado."
            />
          )}
        </Modal>
      ) : null}
    </div>
  );
}

function FilterSelect({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  options: string[];
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </span>
      <select
        className="h-12 w-full rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] px-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        name={name}
        value={value}
        onChange={onChange}
      >
        <option value="">Todos</option>
        {options.map((option) => (
          <option value={option} key={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function FormField({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-sm font-bold text-[var(--text-secondary)]">
        {label}
      </span>
      <input
        className="h-12 w-full rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] px-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        name={name}
        type={type}
        value={value}
        required={required}
        onChange={onChange}
      />
    </label>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-8 text-center">
      <div>
        <FiInbox
          className="mx-auto mb-4 text-4xl text-[var(--text-muted)]"
          aria-hidden="true"
        />
        <h3 className="text-lg font-extrabold">{title}</h3>
        <p className="mt-2 text-[var(--text-secondary)]">{text}</p>
      </div>
    </div>
  );
}

function FestivalDetailModal({
  festival,
  onClose,
  onEdit,
}: {
  festival: Festival;
  onClose: () => void;
  onEdit: () => void;
}) {
  const missing = "No informado";

  return (
    <Modal
      title={festival.name}
      eyebrow="Detalle del festival"
      wide
      onClose={onClose}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <StatusBadge status={festival.status} />
        <button
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 font-bold text-white hover:bg-blue-700"
          type="button"
          onClick={onEdit}
        >
          <FiEdit2 aria-hidden="true" />
          Editar
        </button>
      </div>
      <dl className="grid gap-3 md:grid-cols-2">
        <DetailItem label="Nombre" value={festival.name} />
        <DetailItem label="País" value={festival.country || missing} />
        <DetailItem
          label="Website"
          value={festival.website || missing}
          href={festival.website}
        />
        <DetailItem
          label="URL postulación"
          value={festival.submission_url || missing}
          href={festival.submission_url}
        />
        <DetailItem label="Plataforma" value={festival.platform || missing} />
        <DetailItem
          label="Fecha apertura"
          value={formatDate(festival.opening_date)}
        />
        <DetailItem label="Deadline" value={formatDate(festival.deadline)} />
        <DetailItem
          label="Fecha evento"
          value={formatDate(festival.event_date)}
        />
        <DetailItem
          label="Fee"
          value={festival.fee == null || festival.fee === "" ? missing : festival.fee}
        />
        <DetailItem label="Estado" value={<StatusBadge status={festival.status} />} />
        <DetailItem
          label="Edition year"
          value={festival.edition_year || missing}
        />
        <DetailItem label="Notas" value={festival.notes || missing} full />
      </dl>
    </Modal>
  );
}

function ImportSummary({ result }: { result: FestivalImportResult }) {
  const errorCount = Array.isArray(result.errors)
    ? result.errors.length
    : result.errors;

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100">
      <div className="mb-4 flex items-center gap-2 font-extrabold">
        <FiCheckCircle aria-hidden="true" />
        Importación completada
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ImportMetric label="Creados" value={result.created} />
        <ImportMetric label="Actualizados" value={result.updated} />
        <ImportMetric label="Omitidos" value={result.skipped} />
        <ImportMetric label="Errores" value={errorCount} />
      </div>
      {Array.isArray(result.errors) && result.errors.length ? (
        <ul className="mt-4 max-h-32 list-disc overflow-y-auto pl-5 text-sm">
          {result.errors.map((message, index) => (
            <li key={`${message}-${index}`}>{message}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function ImportMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/70 p-3 dark:bg-slate-900/60">
      <span className="block text-xs font-bold uppercase tracking-wider">
        {label}
      </span>
      <strong className="mt-1 block text-2xl">{value}</strong>
    </div>
  );
}

function AdminFestivals() {
  return (
    <AdminGuard>
      <AdminFestivalsContent />
    </AdminGuard>
  );
}

export default AdminFestivals;
