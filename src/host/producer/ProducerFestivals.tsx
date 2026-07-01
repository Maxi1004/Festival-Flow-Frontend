import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  FiAlertCircle,
  FiCalendar,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiExternalLink,
  FiEye,
  FiEyeOff,
  FiFilter,
  FiInbox,
  FiLoader,
  FiLock,
  FiMapPin,
  FiSearch,
  FiSend,
  FiZap,
  FiTrash2,
  FiX,
  FiInfo,
} from "react-icons/fi";
import API_URL from "../../config/api";
import {
  getProducerFestivals,
  getProducerFestivalSelections,
  removeProducerFestivalSelection,
  selectProducerFestival,
} from "../../service/producerFestivalApi";
import type {
  FestivalSelection,
  FestivalStatus,
  ProducerFestival,
} from "../../types/festival";
import { getMyProjects } from "../../service/projectApi";
import type { Project } from "../../types/producer";
import { useCurrentProfile } from "../useCurrentProfile";
import ProducerGuard from "./ProducerGuard";
import { useAutoTranslate, useFestivalFlowLanguage } from "../../hooks/useAutoTranslate";
import {
  analyzeFilmFreewayCamoufox,
  fillOpenFilmFreewayForm,
} from "../../service/filmfreewayCamoufoxApi";
import type { FillOpenFilmFreewayFormError } from "../../service/filmfreewayCamoufoxApi";

const T = createContext<(text: string) => string>((t) => t);
const useFT = () => useContext(T);

const FESTIVALS_BASE_TEXTS: string[] = [
  "Circuito y estrategia",
  "Postular a Festivales",
  "Explora festivales disponibles, revisa deadlines próximos y selecciona los festivales que quieres preparar para postulación.",
  "Mis festivales seleccionados",
  "Festivales disponibles", "Abiertos y próximos",
  "Próximos a cerrar", "Dentro de 30 días",
  "Seleccionados", "En tu lista de trabajo",
  "Próximos a abrir", "Festivales upcoming",
  "Filtros", "Buscar festival", "Todos los países", "Todas las plataformas",
  "Todos", "Deadline cercano",
  "Reintentar", "Festivales", "Ordenados por deadline más cercano.",
  "Limpiar filtros", "Cargando festivales...", "Sin resultados",
  "Ajusta los filtros para explorar otros festivales.",
  "por página",
  "Abierto", "Abre pronto", "Cerrado", "Archivado", "Sin estado",
  "Procesando...", "Quitar selección", "Seleccionar",
  "País no informado", "Plataforma", "Fee", "No informada", "No informado",
  "Deadline", "Sin deadline", "Seleccionado", "Ver detalle", "Abrir web",
  "Festival", "Estado", "Acciones", "Edición",
  "Deadline vencido", "Cierra hoy", "día restante", "días restantes",
  "URL de postulación", "Apertura", "Fecha del evento", "Notas",
  "Sin notas adicionales.", "Cerrar",
  "Postulación automática", "más", "Sin festivales seleccionados.",
  "Credenciales", "Análisis", "Formulario",
  "Volver a credenciales",
  "Analizando formularios", "Ingresar credenciales",
  "Postulaciones completadas", "Enviando postulaciones", "Completar formulario",
  "Analizando formularios...", "Extrayendo campos...", "Generando formulario unificado...",
  "Esto puede tardar unos segundos...",
  "Las contraseñas no se almacenan ni se conservan fuera de esta sesión.",
  "Usuario / Email", "Contraseña", "Ocultar contraseña", "Mostrar contraseña",
  "Sin plataforma", "Analizar formularios",
  "Completa el formulario unificado. Los datos se enviarán a todos los festivales seleccionados.",
  "Seleccionar...", "festivales", "festival",
  "La IA no estuvo disponible. El formulario fue construido usando el análisis local.",
  "Secciones encontradas", "Campos encontrados", "Fuente usada",
  "Completar formulario de postulación",
  "Revisa y completa los campos antes de rellenarlos automáticamente en FilmFreeway.",
  "Secciones", "Guardar respuestas", "Rellenar en FilmFreeway",
  "Ver detalles técnicos", "campos", "campo",
  "Haz clic para subir archivo",
  "Progreso de postulaciones",
  "Pendiente", "Enviando...", "Reintentando...", "Enviado", "Error",
  "Iniciar postulaciones", "Enviando postulaciones...",
  "Película", "Director", "Técnico", "Archivos",
  "Conectar FilmFreeway",
  "Proyecto guardado y festival abierto con sesión iniciada.",
  "Ver en FilmFreeway",
  "campo con problemas", "campos con problemas",
];

const PAGE_SIZES = [10, 25, 50] as const;
const STATUSES: FestivalStatus[] = [
  "OPEN",
  "UPCOMING",
  "CLOSED",
  "ARCHIVED",
  "UNKNOWN",
];
type StatusFilter = "DEFAULT" | "ALL" | "OPEN" | "UPCOMING" | "CLOSED";
type Filters = {
  search: string;
  country: string;
  platform: string;
  status: StatusFilter;
  nearby: boolean;
};

const initialFilters: Filters = {
  search: "",
  country: "",
  platform: "",
  status: "DEFAULT",
  nearby: false,
};

const statusClasses: Record<FestivalStatus, string> = {
  OPEN:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  UPCOMING:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  CLOSED: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300",
  ARCHIVED:
    "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  UNKNOWN: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
};

function keyOf(id: string | number): string {
  return String(id);
}

function isFilmFreewayFestival(festival: ProducerFestival): boolean {
  const haystack = [
    festival.platform,
    festival.submission_url,
    festival.website,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes("filmfreeway");
}

function normalizeStatus(value?: string | null): FestivalStatus {
  const status = value?.trim().toUpperCase();
  return STATUSES.includes(status as FestivalStatus)
    ? (status as FestivalStatus)
    : "UNKNOWN";
}

function normalizeText(value?: string | number | null): string {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("es");
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function deadlineTime(value?: string | null): number {
  return parseDate(value)?.getTime() ?? Number.POSITIVE_INFINITY;
}

function formatDate(value?: string | null, fallback = "No informado"): string {
  const date = parseDate(value);
  if (!date) return value || fallback;
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function daysUntilDeadline(festival: ProducerFestival): number | null {
  if (
    typeof festival.days_until_deadline === "number" &&
    Number.isFinite(festival.days_until_deadline)
  ) {
    return festival.days_until_deadline;
  }

  const deadline = parseDate(festival.deadline);
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((deadline.getTime() - today.getTime()) / 86_400_000);
}

function deadlineLabel(festival: ProducerFestival, tAuto: (text: string) => string = (t) => t): string {
  const days = daysUntilDeadline(festival);
  if (days === null) return tAuto("Sin deadline");
  if (days < 0) return tAuto("Deadline vencido");
  if (days === 0) return tAuto("Cierra hoy");
  return `${days} ${tAuto(days === 1 ? "día restante" : "días restantes")}`;
}

function deadlineClass(festival: ProducerFestival): string {
  const days = daysUntilDeadline(festival);
  if (days !== null && days >= 0 && days <= 7) {
    return "text-red-600 dark:text-red-300";
  }
  if (days !== null && days >= 0 && days <= 30) {
    return "text-amber-600 dark:text-amber-300";
  }
  return "text-[var(--text-secondary)]";
}

function externalUrl(value?: string | null): string | null {
  const url = value?.trim();
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function StatusBadge({ status }: { status?: string | null }) {
  const tAuto = useFT();
  const normalized = normalizeStatus(status);
  const labels: Record<FestivalStatus, string> = {
    OPEN: tAuto("Abierto"),
    UPCOMING: tAuto("Abre pronto"),
    CLOSED: tAuto("Cerrado"),
    ARCHIVED: tAuto("Archivado"),
    UNKNOWN: tAuto("Sin estado"),
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ring-1 ring-inset ring-current/15 ${statusClasses[normalized]}`}
    >
      {labels[normalized]}
    </span>
  );
}

function SelectionButton({
  festival,
  loading,
  onToggle,
}: {
  festival: ProducerFestival;
  loading: boolean;
  onToggle: (festival: ProducerFestival) => void;
}) {
  const tAuto = useFT();
  const selected = festival.selected_by_me;
  return (
    <button
      className={
        selected
          ? "inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          : "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
      }
      type="button"
      disabled={loading}
      onClick={() => onToggle(festival)}
    >
      {selected ? <FiTrash2 /> : <FiCheck />}
      {loading ? tAuto("Procesando...") : selected ? tAuto("Quitar selección") : tAuto("Seleccionar")}
    </button>
  );
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--input-bg)] p-4">
      <dt className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold">{children}</dd>
    </div>
  );
}

function ProducerFestivalsContent() {
  const { token } = useCurrentProfile();
  const language = useFestivalFlowLanguage();
  const { tAuto } = useAutoTranslate(FESTIVALS_BASE_TEXTS, language, token);
  const [festivals, setFestivals] = useState<ProducerFestival[]>([]);
  const [selections, setSelections] = useState<FestivalSelection[]>([]);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [festivalData, selectionData] = await Promise.all([
        getProducerFestivals({}, token),
        getProducerFestivalSelections(token),
      ]);
      const selectedIds = new Set(
        selectionData.map((selection) => keyOf(selection.festival_id))
      );
      setFestivals(
        festivalData.map((festival) => ({
          ...festival,
          selected_by_me:
            Boolean(festival.selected_by_me) ||
            selectedIds.has(keyOf(festival.id)),
        }))
      );
      setSelections(selectionData);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar los festivales."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const countries = useMemo(
    () =>
      Array.from(
        new Set(
          festivals
            .map((festival) => festival.country?.trim())
            .filter((value): value is string => Boolean(value))
        )
      ).sort((a, b) => a.localeCompare(b, "es")),
    [festivals]
  );
  const platforms = useMemo(
    () =>
      Array.from(
        new Set(
          festivals
            .map((festival) => festival.platform?.trim())
            .filter((value): value is string => Boolean(value))
        )
      ).sort((a, b) => a.localeCompare(b, "es")),
    [festivals]
  );

  const selectedFestivals = useMemo(() => {
    const byId = new Map(
      festivals.map((festival) => [keyOf(festival.id), festival])
    );
    const result = new Map<string, ProducerFestival>();
    selections.forEach((selection) => {
      const festival =
        byId.get(keyOf(selection.festival_id)) ?? selection.festival;
      if (festival) {
        result.set(keyOf(festival.id), { ...festival, selected_by_me: true });
      }
    });
    festivals
      .filter((festival) => festival.selected_by_me)
      .forEach((festival) => result.set(keyOf(festival.id), festival));
    return Array.from(result.values()).sort(
      (a, b) => deadlineTime(a.deadline) - deadlineTime(b.deadline)
    );
  }, [festivals, selections]);

  const filteredFestivals = useMemo(
    () =>
      festivals
        .filter((festival) => {
          const status = normalizeStatus(festival.status);
          if (status === "ARCHIVED") return false;
          if (
            filters.status === "DEFAULT" &&
            status !== "OPEN" &&
            status !== "UPCOMING"
          ) {
            return false;
          }
          if (
            filters.status !== "DEFAULT" &&
            filters.status !== "ALL" &&
            status !== filters.status
          ) {
            return false;
          }
          const search = normalizeText(filters.search);
          if (
            search &&
            ![
              festival.name,
              festival.country,
              festival.platform,
              festival.edition_year,
            ].some((value) => normalizeText(value).includes(search))
          ) {
            return false;
          }
          if (filters.country && festival.country !== filters.country) return false;
          if (filters.platform && festival.platform !== filters.platform) {
            return false;
          }
          if (filters.nearby) {
            const days = daysUntilDeadline(festival);
            return days !== null && days >= 0 && days <= 30;
          }
          return true;
        })
        .sort(
          (a, b) =>
            deadlineTime(a.deadline) - deadlineTime(b.deadline) ||
            a.name.localeCompare(b.name, "es")
        ),
    [festivals, filters]
  );

  const availableCount = festivals.filter((festival) =>
    ["OPEN", "UPCOMING"].includes(normalizeStatus(festival.status))
  ).length;
  const nearbyCount = festivals.filter((festival) => {
    const days = daysUntilDeadline(festival);
    return days !== null && days >= 0 && days <= 30;
  }).length;
  const upcomingCount = festivals.filter(
    (festival) => normalizeStatus(festival.status) === "UPCOMING"
  ).length;
  const totalPages = Math.max(1, Math.ceil(filteredFestivals.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const visibleFestivals = filteredFestivals.slice(start, start + pageSize);
  const detailFestival =
    festivals.find((festival) => keyOf(festival.id) === detailId) ?? null;

  const changeFilters = (changes: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...changes }));
    setPage(1);
  };

  const setFestivalSelected = (
    festivalId: string | number,
    selected: boolean
  ) => {
    setFestivals((current) =>
      current.map((festival) =>
        keyOf(festival.id) === keyOf(festivalId)
          ? { ...festival, selected_by_me: selected }
          : festival
      )
    );
  };

  const toggleSelection = async (festival: ProducerFestival) => {
    if (!token) return;
    const id = keyOf(festival.id);
    setActionError("");
    setBusyIds((current) => new Set(current).add(id));
    try {
      if (festival.selected_by_me) {
        await removeProducerFestivalSelection(festival.id, token);
        setFestivalSelected(festival.id, false);
        setSelections((current) =>
          current.filter(
            (selection) => keyOf(selection.festival_id) !== keyOf(festival.id)
          )
        );
      } else {
        const selection = await selectProducerFestival(festival.id, token);
        setFestivalSelected(festival.id, true);
        setSelections((current) => [
          ...current.filter(
            (item) => keyOf(item.festival_id) !== keyOf(festival.id)
          ),
          {
            ...selection,
            festival_id: selection.festival_id ?? festival.id,
            festival: selection.festival ?? {
              ...festival,
              selected_by_me: true,
            },
          },
        ]);
      }
    } catch (selectionError) {
      setActionError(
        selectionError instanceof Error
          ? selectionError.message
          : "No se pudo actualizar la selección."
      );
    } finally {
      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };

  const kpis = [
    {
      label: "Festivales disponibles",
      value: availableCount,
      helper: "Abiertos y próximos",
      icon: FiCalendar,
      tone: "text-blue-600 dark:text-blue-300",
      action: () => {
        setFilters(initialFilters);
        setPage(1);
      },
    },
    {
      label: "Próximos a cerrar",
      value: nearbyCount,
      helper: "Dentro de 30 días",
      icon: FiClock,
      tone: "text-red-600 dark:text-red-300",
      action: () => changeFilters({ status: "ALL", nearby: true }),
    },
    {
      label: "Seleccionados",
      value: selectedFestivals.length,
      helper: "En tu lista de trabajo",
      icon: FiCheck,
      tone: "text-emerald-600 dark:text-emerald-300",
      action: () => setPanelOpen(true),
    },
    {
      label: "Próximos a abrir",
      value: upcomingCount,
      helper: "Festivales upcoming",
      icon: FiInbox,
      tone: "text-amber-600 dark:text-amber-300",
      action: () => changeFilters({ status: "UPCOMING", nearby: false }),
    },
  ];

  return (
    <T.Provider value={tAuto}>
      <section className="mx-auto w-full max-w-[1600px] space-y-6 pb-10 text-[var(--text-primary)]">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">
              {tAuto("Circuito y estrategia")}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              {tAuto("Postular a Festivales")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
              {tAuto("Explora festivales disponibles, revisa deadlines próximos y selecciona los festivales que quieres preparar para postulación.")}
            </p>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-3 text-sm font-bold shadow-sm transition hover:border-blue-300 hover:bg-[var(--hover-bg)]"
            type="button"
            onClick={() => setPanelOpen(true)}
          >
            <FiCheck />
            {tAuto("Mis festivales seleccionados")}
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
              {selectedFestivals.length}
            </span>
          </button>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map(({ label, value, helper, icon: Icon, tone, action }) => (
            <button
              key={label}
              className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 text-left shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-blue-300"
              type="button"
              onClick={action}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-[var(--text-secondary)]">
                    {tAuto(label)}
                  </p>
                  <p className="mt-2 text-3xl font-black">{value}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{tAuto(helper)}</p>
                </div>
                <span
                  className={`grid h-11 w-11 place-items-center rounded-xl bg-[var(--bg-secondary)] text-xl ${tone}`}
                >
                  <Icon />
                </span>
              </div>
            </button>
          ))}
        </div>

        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-soft)] sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <FiFilter className="text-blue-600 dark:text-blue-300" />
            <h2 className="font-extrabold">{tAuto("Filtros")}</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="relative">
              <span className="sr-only">{tAuto("Buscar festival")}</span>
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                type="search"
                placeholder={tAuto("Buscar festival")}
                value={filters.search}
                onChange={(event) => changeFilters({ search: event.target.value })}
              />
            </label>
            <select
              className="h-11 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] px-3 text-sm outline-none focus:border-blue-500"
              aria-label="Filtrar por país"
              value={filters.country}
              onChange={(event) => changeFilters({ country: event.target.value })}
            >
              <option value="">{tAuto("Todos los países")}</option>
              {countries.map((country) => (
                <option key={country}>{country}</option>
              ))}
            </select>
            <select
              className="h-11 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] px-3 text-sm outline-none focus:border-blue-500"
              aria-label="Filtrar por plataforma"
              value={filters.platform}
              onChange={(event) => changeFilters({ platform: event.target.value })}
            >
              <option value="">{tAuto("Todas las plataformas")}</option>
              {platforms.map((platform) => (
                <option key={platform}>{platform}</option>
              ))}
            </select>
            <select
              className="h-11 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] px-3 text-sm outline-none focus:border-blue-500"
              aria-label="Filtrar por estado"
              value={filters.status}
              onChange={(event) =>
                changeFilters({ status: event.target.value as StatusFilter })
              }
            >
              <option value="DEFAULT">OPEN + UPCOMING</option>
              <option value="ALL">{tAuto("Todos")}</option>
              <option value="OPEN">OPEN</option>
              <option value="UPCOMING">UPCOMING</option>
              <option value="CLOSED">CLOSED</option>
            </select>
            <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] px-3 text-sm font-bold">
              <input
                className="h-4 w-4 accent-blue-600"
                type="checkbox"
                checked={filters.nearby}
                onChange={(event) => changeFilters({ nearby: event.target.checked })}
              />
              {tAuto("Deadline cercano")}
            </label>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
            <button
              className="ml-3 underline"
              type="button"
              onClick={() => void loadData()}
            >
              {tAuto("Reintentar")}
            </button>
          </div>
        ) : null}
        {actionError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            {actionError}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] p-5">
            <div>
              <h2 className="text-lg font-extrabold">{tAuto("Festivales")}</h2>
              <p className="text-sm text-[var(--text-muted)]">
                {tAuto("Ordenados por deadline más cercano.")}
              </p>
            </div>
            <button
              className="text-sm font-bold text-blue-600 hover:underline dark:text-blue-300"
              type="button"
              onClick={() => {
                setFilters(initialFilters);
                setPage(1);
              }}
            >
              {tAuto("Limpiar filtros")}
            </button>
          </div>

          {loading ? (
            <div className="grid min-h-72 place-items-center p-8 text-center">
              <div>
                <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                <p className="mt-4 font-bold">{tAuto("Cargando festivales...")}</p>
              </div>
            </div>
          ) : visibleFestivals.length === 0 ? (
            <div className="grid min-h-72 place-items-center p-8 text-center">
              <div>
                <FiSearch className="mx-auto text-4xl text-[var(--text-muted)]" />
                <h3 className="mt-3 text-lg font-extrabold">{tAuto("Sin resultados")}</h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {tAuto("Ajusta los filtros para explorar otros festivales.")}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 p-4 md:grid-cols-2 xl:hidden">
                {visibleFestivals.map((festival) => (
                  <FestivalCard
                    key={keyOf(festival.id)}
                    festival={festival}
                    busy={busyIds.has(keyOf(festival.id))}
                    onDetail={() => setDetailId(keyOf(festival.id))}
                    onToggle={() => void toggleSelection(festival)}
                  />
                ))}
              </div>
              <FestivalTable
                festivals={visibleFestivals}
                busyIds={busyIds}
                onDetail={(festival) => setDetailId(keyOf(festival.id))}
                onToggle={(festival) => void toggleSelection(festival)}
              />
            </>
          )}

          {!loading && filteredFestivals.length > 0 ? (
            <footer className="flex flex-col gap-4 border-t border-[var(--border-color)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
                <span>
                  {start + 1}–{Math.min(start + pageSize, filteredFestivals.length)} / {filteredFestivals.length}
                </span>
                <select
                  className="rounded-lg border border-[var(--border-color)] bg-[var(--input-bg)] px-2 py-1.5"
                  value={pageSize}
                  aria-label="Resultados por página"
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size} {tAuto("por página")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border-color)] disabled:opacity-40"
                  type="button"
                  disabled={currentPage === 1}
                  aria-label="Página anterior"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  <FiChevronLeft />
                </button>
                <span className="px-2 text-sm font-bold">
                  {currentPage} / {totalPages}
                </span>
                <button
                  className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border-color)] disabled:opacity-40"
                  type="button"
                  disabled={currentPage === totalPages}
                  aria-label="Página siguiente"
                  onClick={() =>
                    setPage((value) => Math.min(totalPages, value + 1))
                  }
                >
                  <FiChevronRight />
                </button>
              </div>
            </footer>
          ) : null}
        </section>

        {panelOpen ? (
          <SelectionPanel
            festivals={selectedFestivals}
            busyIds={busyIds}
            token={token}
            onClose={() => setPanelOpen(false)}
            onRemove={(festival) => void toggleSelection(festival)}
          />
        ) : null}
        {detailFestival ? (
          <FestivalDetail
            festival={detailFestival}
            busy={busyIds.has(keyOf(detailFestival.id))}
            onClose={() => setDetailId(null)}
            onToggle={() => void toggleSelection(detailFestival)}
          />
        ) : null}
      </section>
    </T.Provider>
  );
}

function FestivalCard({
  festival,
  busy,
  onDetail,
  onToggle,
}: {
  festival: ProducerFestival;
  busy: boolean;
  onDetail: () => void;
  onToggle: () => void;
}) {
  const tAuto = useFT();
  const website = externalUrl(festival.website);
  return (
    <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--input-bg)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-extrabold">{festival.name}</h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-[var(--text-muted)]">
            <FiMapPin />
            {festival.country || tAuto("País no informado")}
          </p>
        </div>
        <StatusBadge status={festival.status} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">
            {tAuto("Plataforma")}
          </p>
          <p className="mt-1 font-semibold">
            {festival.platform || tAuto("No informada")}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">
            {tAuto("Fee")}
          </p>
          <p className="mt-1 font-semibold">
            {festival.fee === null || festival.fee === undefined
              ? tAuto("No informado")
              : String(festival.fee)}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">
            {tAuto("Deadline")}
          </p>
          <p className="mt-1 font-semibold">
            {formatDate(festival.deadline, tAuto("Sin deadline"))}
          </p>
          <p className={`text-xs font-bold ${deadlineClass(festival)}`}>
            {deadlineLabel(festival, tAuto)}
          </p>
        </div>
      </div>
      {festival.selected_by_me ? (
        <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
          <FiCheck />
          {tAuto("Seleccionado")}
        </span>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm font-bold hover:bg-[var(--hover-bg)]"
          type="button"
          onClick={onDetail}
        >
          <FiEye />
          {tAuto("Ver detalle")}
        </button>
        {website ? (
          <a
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm font-bold hover:bg-[var(--hover-bg)]"
            href={website}
            target="_blank"
            rel="noreferrer"
          >
            <FiExternalLink />
            {tAuto("Abrir web")}
          </a>
        ) : null}
        <SelectionButton
          festival={festival}
          loading={busy}
          onToggle={onToggle}
        />
      </div>
    </article>
  );
}

function FestivalTable({
  festivals,
  busyIds,
  onDetail,
  onToggle,
}: {
  festivals: ProducerFestival[];
  busyIds: Set<string>;
  onDetail: (festival: ProducerFestival) => void;
  onToggle: (festival: ProducerFestival) => void;
}) {
  const tAuto = useFT();
  return (
    <div className="hidden overflow-x-auto xl:block">
      <table className="w-full min-w-[1050px] border-collapse text-left">
        <thead className="bg-[var(--bg-secondary)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
          <tr>
            <th className="px-5 py-4">{tAuto("Festival")}</th>
            <th className="px-4 py-4">{tAuto("Plataforma")}</th>
            <th className="px-4 py-4">{tAuto("Deadline")}</th>
            <th className="px-4 py-4">{tAuto("Fee")}</th>
            <th className="px-4 py-4">{tAuto("Estado")}</th>
            <th className="px-5 py-4 text-right">{tAuto("Acciones")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-color)]">
          {festivals.map((festival) => (
            <tr
              key={keyOf(festival.id)}
              className="transition hover:bg-[var(--hover-bg)]"
            >
              <td className="px-5 py-4">
                <p className="font-extrabold">{festival.name}</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {festival.country || tAuto("País no informado")}
                  {festival.edition_year
                    ? ` · ${tAuto("Edición")} ${festival.edition_year}`
                    : ""}
                </p>
                {festival.selected_by_me ? (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                    <FiCheck />
                    {tAuto("Seleccionado")}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-4 text-sm font-semibold">
                {festival.platform || tAuto("No informada")}
              </td>
              <td className="px-4 py-4">
                <p className="text-sm font-bold">
                  {formatDate(festival.deadline, tAuto("Sin deadline"))}
                </p>
                <p className={`mt-1 text-xs font-bold ${deadlineClass(festival)}`}>
                  {deadlineLabel(festival, tAuto)}
                </p>
              </td>
              <td className="px-4 py-4 text-sm font-semibold">
                {festival.fee === null || festival.fee === undefined
                  ? tAuto("No informado")
                  : String(festival.fee)}
              </td>
              <td className="px-4 py-4">
                <StatusBadge status={festival.status} />
              </td>
              <td className="px-5 py-4">
                <div className="flex justify-end gap-2">
                  <button
                    className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
                    type="button"
                    title={tAuto("Ver detalle")}
                    aria-label={`${tAuto("Ver detalle")} ${festival.name}`}
                    onClick={() => onDetail(festival)}
                  >
                    <FiEye />
                  </button>
                  {externalUrl(festival.website) ? (
                    <a
                      className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
                      href={externalUrl(festival.website) ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      title={tAuto("Abrir web")}
                      aria-label={`${tAuto("Abrir web")} ${festival.name}`}
                    >
                      <FiExternalLink />
                    </a>
                  ) : null}
                  <SelectionButton
                    festival={festival}
                    loading={busyIds.has(keyOf(festival.id))}
                    onToggle={onToggle}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type FestivalCred = { username: string; password: string; showPassword: boolean };
type ApplyStatus = "pending" | "sending" | "retrying" | "success" | "error";
type ApplyState = { status: ApplyStatus; error?: string };

type UnifiedField = {
  field_id: string;
  value_key: string;
  label: string;
  name?: string;
  id?: string;
  type: string;
  section: string;
  required_in: (string | number)[];
  applies_to: (string | number)[];
  options?: string[];
  placeholder?: string;
  required: boolean;
  selector?: string;
  current_value?: string;
};

type UnifiedSection = {
  key: string;
  title: string;
  description?: string;
  fields: UnifiedField[];
};

type UnifiedFormData = {
  batch_id: string;
  source: "structured_form" | "unified_form" | "fallback";
  sections: UnifiedSection[];
  fields: UnifiedField[];
};

type AnalyzeResponse = {
  analyze_batch_id?: string;
  batch_id?: string;
  structured_form?: unknown;
  unified_form?: unknown;
  fields_by_festival?: unknown;
  warning?: unknown;
};

const FORM_TABS = [
  { key: "pelicula", label: "Película" },
  { key: "director", label: "Director" },
  { key: "tecnico", label: "Técnico" },
  { key: "archivos", label: "Archivos" },
] as const;

const FORM_TAB_LABELS = new Map<string, string>(
  FORM_TABS.map((tab) => [tab.key, tab.label])
);

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string" || typeof item === "number") return String(item);
      const record = toRecord(item);
      return String(record?.label ?? record?.value ?? record?.name ?? "").trim();
    })
    .filter(Boolean);
}

function toIdList(value: unknown): (string | number)[] {
  return Array.isArray(value)
    ? value.filter((item): item is string | number =>
        typeof item === "string" || typeof item === "number"
      )
    : [];
}

function textValue(value: unknown, fallback = ""): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

function normalizeField(
  rawField: unknown,
  sectionKey: string,
  index: number,
  fallbackFestivalIds: (string | number)[] = []
): UnifiedField | null {
  const field = toRecord(rawField);
  if (!field) return null;

  const label = textValue(field.label ?? field.title ?? field.question ?? field.name).trim();
  const fieldName = textValue(field.name).trim();
  const sourceId = textValue(field.id).trim();
  const selector = textValue(field.selector ?? field.css_selector ?? field.xpath).trim();
  const fieldId = textValue(
    field.field_id ?? field.key ?? sourceId ?? fieldName ?? `${sectionKey}-${index}`
  ).trim();
  if (!label && !fieldId) return null;

  const appliesTo =
    toIdList(field.applies_to).length > 0
      ? toIdList(field.applies_to)
      : toIdList(field.festivals).length > 0
        ? toIdList(field.festivals)
        : fallbackFestivalIds;
  const requiredIn =
    toIdList(field.required_in).length > 0
      ? toIdList(field.required_in)
      : field.required
        ? appliesTo
        : [];
  const type = textValue(field.type ?? field.input_type ?? "text", "text");

  return {
    field_id: fieldId || `${sectionKey}-${index}`,
    value_key: selector || fieldName || sourceId || label || fieldId || `${sectionKey}-${index}`,
    label: label || fieldId,
    name: fieldName,
    id: sourceId,
    type,
    section: sectionKey,
    required_in: requiredIn,
    applies_to: appliesTo,
    options: toStringList(field.options),
    placeholder: textValue(field.placeholder),
    required: Boolean(field.required) || requiredIn.length > 0,
    selector,
    current_value: textValue(
      field.current_value ?? field.value ?? field.default_value ?? field.answer
    ),
  };
}

function sectionEntries(
  source: unknown
): Array<{ key: string; title: string; description?: string; fields: unknown[] }> {
  const record = toRecord(source);
  const sections = record?.sections;
  if (Array.isArray(sections)) {
    return sections.map((section, index) => {
      const sectionRecord = toRecord(section);
      const key = textValue(
        sectionRecord?.key ?? sectionRecord?.id ?? sectionRecord?.name ?? `section-${index}`
      );
      const fields =
        (Array.isArray(sectionRecord?.fields) && sectionRecord.fields) ||
        (Array.isArray(sectionRecord?.form_fields) && sectionRecord.form_fields) ||
        (Array.isArray(sectionRecord?.items) && sectionRecord.items) ||
        (Array.isArray(sectionRecord?.questions) && sectionRecord.questions) ||
        [];
      return {
        key,
        title: textValue(sectionRecord?.title ?? sectionRecord?.label ?? sectionRecord?.name, key),
        description: textValue(sectionRecord?.description ?? sectionRecord?.help_text),
        fields,
      };
    });
  }
  const sectionMap = toRecord(sections);
  if (sectionMap) {
    return Object.entries(sectionMap).map(([key, section]) => {
      const sectionRecord = toRecord(section);
      const fields =
        (Array.isArray(sectionRecord?.fields) && sectionRecord.fields) ||
        (Array.isArray(sectionRecord?.form_fields) && sectionRecord.form_fields) ||
        (Array.isArray(sectionRecord?.items) && sectionRecord.items) ||
        (Array.isArray(sectionRecord?.questions) && sectionRecord.questions) ||
        [];
      return {
        key,
        title: textValue(sectionRecord?.title ?? sectionRecord?.label ?? sectionRecord?.name, key),
        description: textValue(sectionRecord?.description ?? sectionRecord?.help_text),
        fields,
      };
    });
  }
  return [];
}

function rawSectionCount(source: unknown): number {
  return sectionEntries(source).length;
}

function rawFieldCount(source: unknown): number {
  return sectionEntries(source).reduce((total, section) => total + section.fields.length, 0);
}

function normalizeSectionsFromEntries(
  entries: Array<{ key: string; title: string; description?: string; fields: unknown[] }>,
  fallbackFestivalIds: (string | number)[] = []
): UnifiedSection[] {
  return entries
    .map((entry, sectionIndex) => {
      const key = entry.key || `section-${sectionIndex}`;
      const fields = entry.fields
        .map((field, fieldIndex) =>
          normalizeField(field, key, fieldIndex, fallbackFestivalIds)
        )
        .filter((field): field is UnifiedField => Boolean(field));
      return {
        key,
        title: entry.title || key,
        description: entry.description,
        fields,
      };
    })
    .filter((section) => section.fields.length > 0);
}

function normalizeUnifiedForm(unifiedForm: unknown): UnifiedSection[] {
  const directSections = normalizeSectionsFromEntries(sectionEntries(unifiedForm));
  if (directSections.length > 0) return directSections;

  const categories = toRecord(toRecord(unifiedForm)?.categories);
  if (!categories) return [];
  return normalizeSectionsFromEntries(
    Object.entries(categories).map(([key, category]) => {
      const categoryRecord = toRecord(category);
      return {
        key,
        title: textValue(
          categoryRecord?.title ?? categoryRecord?.label ?? FORM_TAB_LABELS.get(key),
          key
        ),
        description: textValue(categoryRecord?.description ?? categoryRecord?.help_text),
        fields: Array.isArray(categoryRecord?.fields) ? categoryRecord.fields : [],
      };
    })
  );
}

function normalizeFestivalFields(
  fieldsByFestival: unknown,
  festivals: ProducerFestival[]
): UnifiedSection[] {
  const record = toRecord(fieldsByFestival);
  if (!record) return [];
  const festivalNameById = new Map(festivals.map((festival) => [keyOf(festival.id), festival.name]));

  return normalizeSectionsFromEntries(
    Object.entries(record).map(([festivalId, data]) => {
      const festivalRecord = toRecord(data);
      const fields = Array.isArray(festivalRecord?.fields)
        ? festivalRecord.fields
        : Array.isArray(data)
          ? data
          : [];
      return {
        key: festivalId,
        title: festivalNameById.get(festivalId) ?? festivalRecord?.name?.toString() ?? festivalId,
        description: textValue(festivalRecord?.description ?? festivalRecord?.message),
        fields,
      };
    }),
    Object.keys(record)
  );
}

function buildUnifiedFormData(
  batchId: string,
  structuredForm: unknown,
  unifiedForm: unknown,
  fieldsByFestival: unknown,
  festivals: ProducerFestival[]
): UnifiedFormData | null {
  const structuredEntries = sectionEntries(structuredForm);
  const source =
    structuredEntries.length > 0
      ? "structured_form"
      : normalizeUnifiedForm(unifiedForm).length > 0
        ? "unified_form"
        : "fallback";
  const sections =
    source === "structured_form"
      ? normalizeSectionsFromEntries(structuredEntries)
      : source === "unified_form"
        ? normalizeUnifiedForm(unifiedForm)
        : normalizeFestivalFields(fieldsByFestival, festivals);
  if (sections.length === 0) return null;
  return {
    batch_id: batchId,
    source,
    sections,
    fields: sections.flatMap((section) => section.fields),
  };
}

const ANALYZE_MESSAGES = [
  "Analizando formularios...",
  "Extrayendo campos...",
  "Generando formulario unificado...",
];

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-violet-600",
  "bg-emerald-600",
  "bg-amber-500",
  "bg-rose-600",
  "bg-cyan-600",
] as const;

const STEPPER_STEPS = ["Credenciales", "Análisis", "Formulario"] as const;
const FINISHED_STATUSES = new Set(["finalizado", "completado", "publicado", "completed", "published"]);

function SelectionPanel({
  festivals,
  busyIds: _busyIds,
  token,
  onClose,
  onRemove: _onRemove,
}: {
  festivals: ProducerFestival[];
  busyIds: Set<string>;
  token?: string | null;
  onClose: () => void;
  onRemove: (festival: ProducerFestival) => void;
}) {
  const [step, setStep] = useState<"credentials" | "unified-form">("credentials");
  const [creds, setCreds] = useState<Map<string, FestivalCred>>(() => new Map());
  const [applyStates, setApplyStates] = useState<Map<string, ApplyState>>(() => new Map());
  const submitting = false;
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(null);
  const [analyzeBatchId, setAnalyzeBatchId] = useState("");
  const [structuredForm, setStructuredForm] = useState<unknown>(null);
  const [unifiedForm, setUnifiedForm] = useState<unknown>(null);
  const [festivalFields, setFestivalFields] = useState<unknown>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>(() => ({}));
  const [fileValues, setFileValues] = useState<Record<string, File | null>>(() => ({}));
  const [technicalOpen, setTechnicalOpen] = useState<Set<string>>(() => new Set());
  const [msgIndex, setMsgIndex] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [generatingAnswers, setGeneratingAnswers] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [answerMetadata, setAnswerMetadata] = useState<Record<string, { confidence: number; source: string }>>({});
  const [missingFields, setMissingFields] = useState<Array<{ field: string; reason: string }>>([]);
  const [answerSummary, setAnswerSummary] = useState<{ mapped_fields: number; missing_count: number; ai_fields: number } | null>(null);
  const [missingFieldsOpen, setMissingFieldsOpen] = useState(false);
  const [fillingForm, setFillingForm] = useState(false);
  const [fillError, setFillError] = useState("");
  const [fillResult, setFillResult] = useState<{ message: string; tone: "success" | "partial" } | null>(null);
  const [fillErrorsDetail, setFillErrorsDetail] = useState<FillOpenFilmFreewayFormError[]>([]);
  const [fillSavedUrl, setFillSavedUrl] = useState("");
  const [analyzeSource, setAnalyzeSource] = useState<"legacy" | "camoufox">("legacy");
  const [camoufoxMeta, setCamoufoxMeta] = useState<{ finalUrl: string; finalTitle: string } | null>(null);

  const singleFilmFreewayFestival =
    festivals.length === 1 && isFilmFreewayFestival(festivals[0]) ? festivals[0] : null;

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  useEffect(() => {
    if (!token) return;
    setLoadingProjects(true);
    getMyProjects(token)
      .then((projects) => {
        setUserProjects(
          projects.filter((p) => FINISHED_STATUSES.has(String(p.status).toLowerCase()))
        );
      })
      .catch(() => setUserProjects([]))
      .finally(() => setLoadingProjects(false));
  }, [token]);

  useEffect(() => {
    if (!analyzing) return;
    setMsgIndex(0);
    const id = setInterval(
      () => setMsgIndex((i) => (i + 1) % ANALYZE_MESSAGES.length),
      1800
    );
    return () => clearInterval(id);
  }, [analyzing]);

  const normalizedForm = useMemo(
    () =>
      buildUnifiedFormData(
        analyzeBatchId,
        structuredForm,
        unifiedForm,
        festivalFields,
        festivals
      ),
    [analyzeBatchId, structuredForm, unifiedForm, festivalFields, festivals]
  );
  const sourceUsed = normalizedForm?.source ?? "fallback";
  const sectionCount =
    sourceUsed === "structured_form"
      ? rawSectionCount(structuredForm)
      : normalizedForm?.sections.length ?? 0;
  const fieldCount =
    sourceUsed === "structured_form"
      ? rawFieldCount(structuredForm)
      : normalizedForm?.fields.length ?? 0;
  const analyzeWarning = Boolean(analyzeResult?.warning);

  const allFilled =
    festivals.length > 0 &&
    festivals.every((f) => {
      const c = creds.get(keyOf(f.id));
      return Boolean(c?.username.trim()) && Boolean(c?.password);
    });

  const allDone =
    festivals.length > 0 &&
    festivals.every((f) => {
      const s = applyStates.get(keyOf(f.id));
      return s?.status === "success" || s?.status === "error";
    });

  const allFieldsFilled =
    (normalizedForm?.fields ?? []).length === 0 ||
    (normalizedForm?.fields ?? []).every((f) => {
      if (!f.required) return true;
      if (!f.selector && !f.name && !f.id) return true;
      if (f.type === "file") return (fileValues[f.field_id] ?? null) !== null;
      const value = formValues[f.value_key];
      if (Array.isArray(value)) return value.length > 0;
      return String(value ?? "").trim() !== "";
    });

  const updateCred = (
    id: string | number,
    field: keyof FestivalCred,
    value: string | boolean
  ) => {
    setCreds((prev) => {
      const next = new Map(prev);
      const cur = next.get(keyOf(id)) ?? {
        username: "",
        password: "",
        showPassword: false,
      };
      next.set(keyOf(id), { ...cur, [field]: value });
      return next;
    });
  };

  const toggleTechnicalDetails = (fieldKey: string) => {
    setTechnicalOpen((prev) => {
      const next = new Set(prev);
      if (next.has(fieldKey)) {
        next.delete(fieldKey);
      } else {
        next.add(fieldKey);
      }
      return next;
    });
  };

  const updateFormValue = (key: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
    console.log("[Frontend] Campo actualizado:", key, value);
  };

  const toggleOptionValue = (key: string, option: string, checked: boolean) => {
    setFormValues((prev) => {
      const current = Array.isArray(prev[key]) ? (prev[key] as string[]) : [];
      const nextValue = checked
        ? Array.from(new Set([...current, option]))
        : current.filter((item) => item !== option);
      console.log("[Frontend] Campo actualizado:", key, nextValue);
      return { ...prev, [key]: nextValue };
    });
  };

  const handleSaveResponses = () => {
    console.log("[Frontend] Respuestas guardadas localmente:", formValues);
  };

  const handleFillFilmFreewayCamoufox = async () => {
    if (!analyzeBatchId || !token) return;
    setFillingForm(true);
    setFillError("");
    setFillResult(null);
    setFillErrorsDetail([]);
    setFillSavedUrl("");
    try {
      const data = await fillOpenFilmFreewayForm(
        { analyze_batch_id: analyzeBatchId, form_values: formValues },
        token
      );
      console.log("[Frontend] Fill (Camoufox) response:", data);
      setFillErrorsDetail(data.errors ?? []);
      setFillSavedUrl(data.saved_url || data.final_url || "");
      if (data.save_ok) {
        setFillResult({
          message: "Proyecto guardado y festival abierto con sesión iniciada.",
          tone: "success",
        });
      } else {
        const parts: string[] = [`Se rellenaron ${data.filled_count} campos.`];
        if (data.skipped_count > 0) parts.push(`Se omitieron ${data.skipped_count}.`);
        setFillResult({ message: parts.join(" "), tone: "partial" });
      }
    } catch (err) {
      setFillError(err instanceof Error ? err.message : "Error al rellenar el formulario.");
    } finally {
      setFillingForm(false);
    }
  };

  const handleFillFilmFreewayLegacy = async () => {
    if (!analyzeBatchId) return;
    console.log("[Frontend] Enviando formulario al backend...");
    console.log("[Frontend] Analyze batch id:", analyzeBatchId);
    console.log("[Frontend] Form values para rellenar:", formValues);
    setFillingForm(true);
    setFillError("");
    setFillResult(null);
    setFillErrorsDetail([]);
    setFillSavedUrl("");
    try {
      const res = await fetch(`${API_URL}/api/festivals/fill-open-form`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ analyze_batch_id: analyzeBatchId, form_values: formValues }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Error ${res.status}`);
      }
      const data = (await res.json()) as {
        status?: string;
        filled_fields?: number;
        skipped_fields?: number;
        message?: string;
      };
      console.log("[Frontend] Fill response:", data);
      const status = (data.status ?? "").toUpperCase();
      if (status === "OK" && !data.skipped_fields) {
        setFillResult({ message: "Formulario rellenado correctamente en FilmFreeway.", tone: "success" });
      } else {
        const parts: string[] = [];
        if (typeof data.filled_fields === "number") parts.push(`Se rellenaron ${data.filled_fields} campos.`);
        if (typeof data.skipped_fields === "number" && data.skipped_fields > 0) parts.push(`Se omitieron ${data.skipped_fields}.`);
        if (data.message) parts.push(data.message);
        setFillResult({ message: parts.join(" ") || "Formulario enviado.", tone: "partial" });
      }
    } catch (err) {
      setFillError(err instanceof Error ? err.message : "Error al rellenar el formulario.");
    } finally {
      setFillingForm(false);
    }
  };

  const handleFillFilmFreeway = () =>
    analyzeSource === "camoufox" ? handleFillFilmFreewayCamoufox() : handleFillFilmFreewayLegacy();

  const handleGenerateAnswers = async () => {
    if (!analyzeBatchId || !selectedProjectId) return;
    const project = userProjects.find((p) => String(p.id) === selectedProjectId);
    console.log("[Frontend] Proyecto seleccionado:", project?.title ?? selectedProjectId);
    console.log("[Frontend] Generando respuestas para batch:", analyzeBatchId);
    setGeneratingAnswers(true);
    setGenerateError("");
    try {
      const res = await fetch(`${API_URL}/api/festivals/generate-form-answers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ analyze_batch_id: analyzeBatchId, project_id: selectedProjectId }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Error ${res.status}`);
      }
      const data = (await res.json()) as {
        form_values: Record<string, { value: unknown; confidence: number; source: string }>;
        missing_fields: Array<{ field: string; reason: string }>;
        mapped_fields: number;
        missing_count: number;
        ai_fields: number;
      };
      console.log("[Frontend] Respuestas recibidas:", data.mapped_fields);
      console.log("[Frontend] Campos faltantes:", data.missing_count);
      const valuesConverted: Record<string, unknown> = {};
      const metadata: Record<string, { confidence: number; source: string }> = {};
      for (const [key, entry] of Object.entries(data.form_values ?? {})) {
        valuesConverted[key] = entry.value;
        metadata[key] = { confidence: entry.confidence, source: entry.source };
      }
      setFormValues((prev) => ({ ...prev, ...valuesConverted }));
      setAnswerMetadata(metadata);
      setMissingFields(data.missing_fields ?? []);
      setAnswerSummary({
        mapped_fields: data.mapped_fields,
        missing_count: data.missing_count,
        ai_fields: data.ai_fields,
      });
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Error al generar respuestas.");
    } finally {
      setGeneratingAnswers(false);
    }
  };

  const scrollToSection = (sectionKey: string) => {
    document
      .getElementById(`auto-form-section-${sectionKey}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleAnalyzeCamoufox = async (festival: ProducerFestival) => {
    if (!allFilled || analyzing || !token) return;
    setAnalyzing(true);
    setAnalyzeError("");

    const cred = creds.get(keyOf(festival.id));
    const email = cred?.username.trim() ?? "";
    const password = cred?.password ?? "";
    const festivalUrl = festival.submission_url || festival.website || "";

    setCreds((prev) => {
      const next = new Map(prev);
      const current = next.get(keyOf(festival.id));
      if (current) next.set(keyOf(festival.id), { ...current, password: "" });
      return next;
    });

    try {
      const raw = await analyzeFilmFreewayCamoufox(
        { email, password, festival_url: festivalUrl },
        token
      );
      console.log("[Frontend] Analyze (Camoufox) recibido", raw);

      if (!raw.sections?.length || !raw.fields_count) {
        throw new Error("No se encontraron campos en el formulario de FilmFreeway.");
      }

      const structuredFormPayload = {
        sections: raw.sections.map((section) => ({
          title: section.section,
          fields: section.fields,
        })),
      };
      const data = buildUnifiedFormData(
        raw.analyze_batch_id,
        structuredFormPayload,
        null,
        null,
        [festival]
      );

      setAnalyzeSource("camoufox");
      setAnalyzeResult(null);
      setAnalyzeBatchId(raw.analyze_batch_id);
      setStructuredForm(structuredFormPayload);
      setUnifiedForm(null);
      setFestivalFields(null);
      setCamoufoxMeta({ finalUrl: raw.final_url, finalTitle: raw.final_title });
      setFormValues(
        Object.fromEntries(
          (data?.fields ?? [])
            .filter((field) => field.type !== "file" && field.current_value)
            .map((field) => [
              field.field_id || field.selector || field.name || field.id || field.label,
              field.current_value ?? "",
            ])
        )
      );
      setFileValues({});
      setApplyStates(new Map());
      setTechnicalOpen(new Set());
      setStep("unified-form");
    } catch (err) {
      setAnalyzeError(
        err instanceof Error ? err.message : "Error al analizar el formulario de FilmFreeway."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyzeLegacy = async () => {
    if (!allFilled || analyzing) return;
    setAnalyzing(true);
    setAnalyzeError("");

    const festivalIds = festivals.map((f) => f.id);
    const credentials_map = Object.fromEntries(
      festivals.map((f) => [
        f.id,
        {
          username: creds.get(keyOf(f.id))?.username.trim() ?? "",
          password: creds.get(keyOf(f.id))?.password ?? "",
          login_url: f.submission_url ?? f.website ?? "",
        },
      ])
    );

    setCreds((prev) => {
      const next = new Map(prev);
      next.forEach((c, id) => next.set(id, { ...c, password: "" }));
      return next;
    });

    try {
      const res = await fetch(`${API_URL}/api/festivals/analyze-forms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ festival_ids: festivalIds, credentials_map }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Error ${res.status}`);
      }
      const raw = (await res.json()) as AnalyzeResponse;
      const batchId = raw.analyze_batch_id ?? raw.batch_id ?? "";
      const structuredSectionTotal = rawSectionCount(raw.structured_form);
      const structuredFieldTotal = rawFieldCount(raw.structured_form);
      const data = buildUnifiedFormData(
        batchId,
        raw.structured_form,
        raw.unified_form,
        raw.fields_by_festival,
        festivals
      );
      const fieldTotal = data?.fields.length ?? 0;

      console.log("[Frontend] Analyze recibido", raw);
      console.log("[Frontend] Fuente usada:", data?.source ?? "fallback");
      console.log("[Frontend] Structured sections:", structuredSectionTotal);
      console.log("[Frontend] Structured fields:", structuredFieldTotal);
      console.log("[Frontend] Secciones:", data?.sections.length ?? 0);
      console.log("[Frontend] Campos:", fieldTotal);
      console.log("[Frontend] Analyze Batch:", batchId);

      setAnalyzeSource("legacy");
      setCamoufoxMeta(null);
      setAnalyzeResult(raw);
      setAnalyzeBatchId(batchId);
      setStructuredForm(raw.structured_form ?? null);
      setUnifiedForm(raw.unified_form ?? null);
      setFestivalFields(raw.fields_by_festival ?? null);
      // Check if all festivals failed — show error instead of empty form
      const festivalStatuses = toRecord(raw.fields_by_festival) ?? {};
      const allFailed =
        Object.keys(festivalStatuses).length > 0 &&
        Object.values(festivalStatuses).every((value) => {
          const status = textValue(toRecord(value)?.status).toUpperCase();
          return status !== "" && status !== "OK";
        });
      if (allFailed || !data || fieldTotal === 0) {
        const firstError = toRecord(Object.values(festivalStatuses)[0]);
        const reason =
          textValue(firstError?.message) ||
          textValue(firstError?.status) ||
          "Error desconocido";
        throw new Error(`No se pudo analizar el formulario: ${reason}`);
      }
      setFormValues(
        Object.fromEntries(
          data.fields
            .filter((field) => field.type !== "file" && field.current_value)
            .map((field) => [
              field.field_id || field.selector || field.name || field.id || field.label,
              field.current_value ?? "",
            ])
        )
      );
      setFileValues({});
      setApplyStates(new Map());
      setTechnicalOpen(new Set());
      setStep("unified-form");
    } catch (err) {
      setAnalyzeError(
        err instanceof Error ? err.message : "Error al analizar los formularios."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyze = () =>
    singleFilmFreewayFestival
      ? handleAnalyzeCamoufox(singleFilmFreewayFestival)
      : handleAnalyzeLegacy();

  const tAuto = useFT();
  const isLocked = submitting || allDone;
  const currentStepIdx = analyzing ? 1 : step === "unified-form" ? 2 : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) =>
        !isLocked &&
        !analyzing &&
        event.target === event.currentTarget &&
        onClose()
      }
    >
      <aside
        className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={tAuto("Postulación automática")}
      >
        {/* ── STICKY HEADER ──────────────────────────────────────────────── */}
        <div className="shrink-0 border-b border-[var(--border-color)] px-5 pb-5 pt-5 sm:px-6">
          {/* label + close */}
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
              {tAuto("Postulación automática")}
            </p>
            <button
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--border-color)] hover:bg-[var(--hover-bg)]"
              type="button"
              aria-label={tAuto("Cerrar")}
              onClick={onClose}
            >
              <FiX />
            </button>
          </div>

          {/* festival chips */}
          {festivals.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {festivals.slice(0, 5).map((f, i) => (
                <div
                  key={keyOf(f.id)}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] py-1 pl-1 pr-2.5"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
                  >
                    {f.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="max-w-[96px] truncate text-xs font-semibold">
                    {f.name}
                  </span>
                </div>
              ))}
              {festivals.length > 5 && (
                <span className="inline-flex items-center rounded-full bg-[var(--bg-secondary)] px-2.5 py-1 text-xs font-bold text-[var(--text-muted)]">
                  +{festivals.length - 5} {tAuto("más")}
                </span>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {tAuto("Sin festivales seleccionados.")}
            </p>
          )}

          {/* stepper */}
          <div className="mt-4 flex items-start">
            {STEPPER_STEPS.map((label, i) => {
              const isComplete = i < currentStepIdx;
              const isActive = i === currentStepIdx;
              return (
                <div key={i} className="flex items-center">
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold ${
                        isActive
                          ? "bg-blue-600 text-white shadow-[0_0_0_3px_rgba(37,99,235,0.15)]"
                          : isComplete
                            ? "bg-emerald-600 text-white"
                            : "bg-[var(--bg-secondary)] text-[var(--text-muted)]"
                      }`}
                    >
                      {isComplete ? "✓" : i + 1}
                    </span>
                    <span
                      className={`whitespace-nowrap text-[10px] font-bold ${
                        isActive
                          ? "text-blue-600 dark:text-blue-300"
                          : isComplete
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-[var(--text-muted)]"
                      }`}
                    >
                      {tAuto(label)}
                    </span>
                  </div>
                  {i < STEPPER_STEPS.length - 1 && (
                    <div
                      className={`mb-3.5 h-px w-8 shrink-0 ${
                        i < currentStepIdx
                          ? "bg-emerald-600"
                          : "bg-[var(--border-color)]"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* step title + back */}
          <div className="mt-3 flex items-center gap-3">
            {step === "unified-form" && !isLocked && !analyzing && (
              <button
                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-[var(--border-color)] hover:bg-[var(--hover-bg)]"
                type="button"
                aria-label={tAuto("Volver a credenciales")}
                onClick={() => setStep("credentials")}
              >
                <FiChevronLeft />
              </button>
            )}
            <h2 className="text-xl font-black">
              {step === "credentials"
                ? analyzing
                  ? tAuto("Analizando formularios")
                  : tAuto("Ingresar credenciales")
                : allDone
                  ? tAuto("Postulaciones completadas")
                  : applyStates.size > 0
                    ? tAuto("Enviando postulaciones")
                    : tAuto("Completar formulario")}
            </h2>
          </div>
        </div>

        {/* ── SCROLLABLE CONTENT ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 pb-8 pt-5 sm:px-6">

          {/* CREDENTIALS STEP */}
          {step === "credentials" ? (
            analyzing ? (
              <div className="flex flex-col items-center justify-center gap-6 py-10 text-center">
                <div className="relative flex h-20 w-20 items-center justify-center">
                  <div className="absolute inset-0 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                  <FiZap className="text-2xl text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-extrabold">
                    {tAuto(ANALYZE_MESSAGES[msgIndex])}
                  </p>
                  <div className="mt-3 flex justify-center gap-2">
                    {ANALYZE_MESSAGES.map((_, i) => (
                      <span
                        key={i}
                        className={`h-2 w-2 rounded-full transition-all duration-300 ${
                          i === msgIndex
                            ? "scale-125 bg-blue-600"
                            : "bg-slate-300 dark:bg-slate-600"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-[var(--text-muted)]">
                  {tAuto("Esto puede tardar unos segundos...")}
                </p>
              </div>
            ) : (
              <>
                <p className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300">
                  <FiLock className="shrink-0" />
                  {tAuto("Las contraseñas no se almacenan ni se conservan fuera de esta sesión.")}
                </p>

                {analyzeError ? (
                  <p className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                    <FiAlertCircle className="mt-0.5 shrink-0" />
                    {analyzeError}
                  </p>
                ) : null}

                <div className="mt-4 space-y-4">
                  {festivals.map((festival) => {
                    const cred = creds.get(keyOf(festival.id)) ?? {
                      username: "",
                      password: "",
                      showPassword: false,
                    };
                    const initial = festival.name.charAt(0).toUpperCase();
                    return (
                      <article
                        key={keyOf(festival.id)}
                        className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--input-bg)]"
                      >
                        <div className="flex items-center gap-3 border-b border-[var(--border-color)] px-4 py-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-extrabold text-white">
                            {initial}
                          </div>
                          <div>
                            <h3 className="font-extrabold leading-tight">
                              {festival.name}
                            </h3>
                            <p className="text-xs text-[var(--text-muted)]">
                              {festival.platform || festival.country || tAuto("Sin plataforma")}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-3 p-4">
                          <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                              {tAuto("Usuario / Email")}
                            </span>
                            <input
                              className="h-10 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                              type="text"
                              placeholder="usuario@email.com"
                              value={cred.username}
                              autoComplete="off"
                              onChange={(e) =>
                                updateCred(festival.id, "username", e.target.value)
                              }
                            />
                          </label>
                          <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                              {tAuto("Contraseña")}
                            </span>
                            <div className="relative">
                              <input
                                className="h-10 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 pr-11 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                type={cred.showPassword ? "text" : "password"}
                                placeholder={tAuto("Contraseña")}
                                value={cred.password}
                                autoComplete="new-password"
                                onChange={(e) =>
                                  updateCred(festival.id, "password", e.target.value)
                                }
                              />
                              <button
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                type="button"
                                tabIndex={-1}
                                aria-label={
                                  cred.showPassword
                                    ? tAuto("Ocultar contraseña")
                                    : tAuto("Mostrar contraseña")
                                }
                                onClick={() =>
                                  updateCred(
                                    festival.id,
                                    "showPassword",
                                    !cred.showPassword
                                  )
                                }
                              >
                                {cred.showPassword ? <FiEyeOff /> : <FiEye />}
                              </button>
                            </div>
                          </label>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <button
                  className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-extrabold transition ${
                    allFilled
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "cursor-not-allowed bg-slate-300 text-slate-600 opacity-70 dark:bg-slate-700 dark:text-slate-300"
                  }`}
                  type="button"
                  disabled={!allFilled}
                  onClick={() => void handleAnalyze()}
                >
                  <FiSearch />
                  {singleFilmFreewayFestival
                    ? tAuto("Conectar FilmFreeway")
                    : tAuto("Analizar formularios")}
                </button>
              </>
            )
          ) : null}

          {/* UNIFIED FORM STEP */}
          {step === "unified-form" && normalizedForm ? (
            <>
              <section className="overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
                <header className="sticky top-0 z-10 -mx-4 -mt-4 border-b border-gray-200 bg-white/95 px-5 py-4 backdrop-blur">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className="text-xl font-black text-gray-900">
                        {tAuto("Completar formulario de postulación")}
                      </h3>
                      <p className="mt-1 max-w-2xl text-sm text-gray-500">
                        {tAuto("Revisa y completa los campos antes de rellenarlos automáticamente en FilmFreeway.")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
                        {tAuto("Fuente usada")}: {sourceUsed}
                      </span>
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
                        {tAuto("Secciones encontradas")}: {sectionCount}
                      </span>
                      <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-extrabold text-cyan-700">
                        {tAuto("Campos encontrados")}: {fieldCount}
                      </span>
                      <span className="rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-extrabold text-gray-600">
                        Batch: {analyzeBatchId ? `${analyzeBatchId.slice(0, 10)}...` : tAuto("No informado")}
                      </span>
                      {camoufoxMeta ? (
                        <a
                          href={camoufoxMeta.finalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-extrabold text-violet-700 hover:bg-violet-100"
                          title={camoufoxMeta.finalTitle}
                        >
                          {camoufoxMeta.finalTitle || camoufoxMeta.finalUrl}
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                        Proyecto a postular
                      </span>
                      <select
                        className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
                        value={selectedProjectId}
                        disabled={loadingProjects || generatingAnswers}
                        onChange={(e) => {
                          setSelectedProjectId(e.target.value);
                          const proj = userProjects.find((p) => String(p.id) === e.target.value);
                          if (proj) console.log("[Frontend] Proyecto seleccionado:", proj.title, "·", proj.status);
                        }}
                      >
                        <option value="">
                          {loadingProjects ? "Cargando proyectos..." : "— Seleccionar proyecto —"}
                        </option>
                        {userProjects.map((p) => (
                          <option key={p.id} value={String(p.id)}>
                            {p.title} · {p.status}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-extrabold transition ${
                        !analyzeBatchId || !selectedProjectId || generatingAnswers
                          ? "cursor-not-allowed bg-gray-200 text-gray-400 opacity-60"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                      type="button"
                      disabled={!analyzeBatchId || !selectedProjectId || generatingAnswers}
                      onClick={() => void handleGenerateAnswers()}
                    >
                      {generatingAnswers ? (
                        <FiLoader className="animate-spin" />
                      ) : (
                        <FiZap />
                      )}
                      Generar respuestas con IA
                    </button>
                  </div>
                  {generateError ? (
                    <p className="mt-2 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-2 text-xs font-semibold text-red-700">
                      <FiAlertCircle className="mt-0.5 shrink-0" />
                      {generateError}
                    </p>
                  ) : null}
                </header>
              <p className="sr-only">
                {tAuto("Completa el formulario unificado. Los datos se enviarán a todos los festivales seleccionados.")}
              </p>

              {analyzeWarning ? (
                <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                  <FiAlertCircle className="mt-0.5 shrink-0" />
                  {tAuto("La IA no estuvo disponible. El formulario fue construido usando el análisis local.")}
                </p>
              ) : null}

              <div className="hidden">
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {tAuto("Secciones encontradas")}
                  </p>
                  <p className="mt-1 text-2xl font-black">{sectionCount}</p>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {tAuto("Campos encontrados")}
                  </p>
                  <p className="mt-1 text-2xl font-black">{fieldCount}</p>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {tAuto("Fuente usada")}
                  </p>
                  <p className="mt-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-700">
                    {sourceUsed}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                <aside className="rounded-xl border border-gray-200 bg-gray-50 p-4 lg:sticky lg:top-4 lg:self-start">
                  <p className="mb-3 text-xs font-black uppercase tracking-wider text-gray-500">
                    {tAuto("Secciones")}
                  </p>
                  <div className="space-y-2">
                    {normalizedForm.sections.map((section) => (
                      <button
                        key={section.key}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-sm font-bold text-gray-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                        type="button"
                        onClick={() => scrollToSection(section.key)}
                      >
                        <span className="min-w-0 truncate">{section.title}</span>
                        <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                          {section.fields.length}
                        </span>
                      </button>
                    ))}
                  </div>
                </aside>
                <div className="space-y-3">
                {normalizedForm.sections.map((section, sectionIndex) => (
                  <details
                    key={section.key}
                    id={`auto-form-section-${section.key}`}
                    className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                    open={sectionIndex === 0}
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition hover:bg-gray-50">
                      <div className="flex min-w-0 gap-2">
                        <FiChevronRight className="mt-1 shrink-0 text-gray-400 transition group-open:rotate-90" />
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-black text-gray-900">{section.title}</h3>
                          {section.description ? (
                            <p className="mt-1 text-xs text-gray-500">{section.description}</p>
                          ) : null}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                        {section.fields.length}{" "}
                        {tAuto(section.fields.length !== 1 ? "campos" : "campo")}
                      </span>
                    </summary>
                    <div className="grid gap-4 border-t border-gray-200 p-4 md:grid-cols-2">
                      {section.fields.map((field) => {
                        const isRequired = field.required;
                        const appliesToCount = field.applies_to.length;
                        const fieldId = `uf-${field.section}-${field.field_id}`;
                        const fieldKey = field.field_id || field.selector || field.name || field.id || field.label;
                        const technicalKey = `${section.key}-${field.field_id}`;
                        const showTechnical = technicalOpen.has(technicalKey);
                        const normalizedType = field.type.toLowerCase();
                        const hasOptions = (field.options?.length ?? 0) > 0;
                        const fieldValue = formValues[fieldKey] ?? field.current_value ?? "";
                        const stringValue = String(fieldValue ?? "");
                        const arrayValue = Array.isArray(fieldValue)
                          ? fieldValue.map(String)
                          : [];
                        return (
                          <div
                            key={technicalKey}
                            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                          >
                            <div className="mb-3 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-extrabold leading-snug text-gray-900">
                                  {field.label}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {isRequired ? (
                                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                                      required
                                    </span>
                                  ) : null}
                                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700">
                                    {field.type || "text"}
                                  </span>
                                  {appliesToCount > 0 ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                                      <FiInfo className="text-[10px]" />
                                      {appliesToCount}{" "}
                                      {tAuto(appliesToCount !== 1 ? "festivales" : "festival")}
                                    </span>
                                  ) : null}
                                  {answerMetadata[fieldKey] ? (
                                    <>
                                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                        answerMetadata[fieldKey].source === "project"
                                          ? "bg-emerald-100 text-emerald-700"
                                          : answerMetadata[fieldKey].source === "ai"
                                            ? "bg-violet-100 text-violet-700"
                                            : answerMetadata[fieldKey].source === "manual"
                                              ? "bg-blue-100 text-blue-700"
                                              : "bg-gray-100 text-gray-600"
                                      }`}>
                                        {answerMetadata[fieldKey].source}
                                      </span>
                                      {answerMetadata[fieldKey].confidence < 1 ? (
                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                                          {Math.round(answerMetadata[fieldKey].confidence * 100)}%
                                        </span>
                                      ) : null}
                                    </>
                                  ) : null}
                                </div>
                              </div>
                              <button
                                className="shrink-0 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-500 transition hover:bg-gray-50 hover:text-gray-800"
                                type="button"
                                onClick={() => toggleTechnicalDetails(technicalKey)}
                              >
                                {tAuto("Ver detalles técnicos")}
                              </button>
                            </div>

                            {showTechnical ? (
                              <dl className="mb-3 grid gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs sm:grid-cols-2">
                                <div>
                                  <dt className="font-bold text-gray-500">selector</dt>
                                  <dd className="break-words text-gray-800">{field.selector || tAuto("No informado")}</dd>
                                </div>
                                <div>
                                  <dt className="font-bold text-gray-500">current_value</dt>
                                  <dd className="break-words text-gray-800">{field.current_value || tAuto("No informado")}</dd>
                                </div>
                                <div>
                                  <dt className="font-bold text-gray-500">name</dt>
                                  <dd className="break-words text-gray-800">{field.name || tAuto("No informado")}</dd>
                                </div>
                                <div>
                                  <dt className="font-bold text-gray-500">id</dt>
                                  <dd className="break-words text-gray-800">{field.id || tAuto("No informado")}</dd>
                                </div>
                              </dl>
                            ) : null}

                            {normalizedType === "textarea" ? (
                              <textarea
                                id={fieldId}
                                className="w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                rows={4}
                                placeholder={field.placeholder || ""}
                                value={stringValue}
                                onChange={(event) =>
                                  updateFormValue(fieldKey, event.target.value)
                                }
                              />
                            ) : ["select", "select-one"].includes(normalizedType) ? (
                              <select
                                id={fieldId}
                                className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                value={stringValue}
                                onChange={(event) =>
                                  updateFormValue(fieldKey, event.target.value)
                                }
                              >
                                <option value="">{field.placeholder || tAuto("Seleccionar...")}</option>
                                {(field.options ?? []).map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : normalizedType === "select-multiple" ? (
                              <select
                                id={fieldId}
                                className="min-h-28 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                multiple
                                value={arrayValue}
                                onChange={(event) =>
                                  updateFormValue(
                                    fieldKey,
                                    Array.from(event.target.selectedOptions).map(
                                      (option) => option.value
                                    )
                                  )
                                }
                              >
                                {(field.options ?? []).map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : normalizedType === "checkbox_group" || normalizedType === "radio_group" ? (
                              <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                                {(hasOptions ? field.options! : [tAuto("No informado")]).map((option) => (
                                  <label
                                    key={option}
                                    className="flex items-center gap-2 text-sm text-gray-700"
                                  >
                                    <input
                                      type={normalizedType === "radio_group" ? "radio" : "checkbox"}
                                      name={fieldKey}
                                      checked={
                                        normalizedType === "radio_group"
                                          ? stringValue === option
                                          : arrayValue.includes(option)
                                      }
                                      className="h-4 w-4"
                                      onChange={(event) => {
                                        if (normalizedType === "radio_group") {
                                          updateFormValue(fieldKey, option);
                                        } else {
                                          toggleOptionValue(
                                            fieldKey,
                                            option,
                                            event.target.checked
                                          );
                                        }
                                      }}
                                    />
                                    <span>{option}</span>
                                  </label>
                                ))}
                              </div>
                            ) : normalizedType === "dynamic_button" ? (
                              <button
                                className="inline-flex h-10 items-center rounded-xl border border-gray-300 bg-gray-100 px-4 text-sm font-bold text-gray-500"
                                type="button"
                                disabled
                              >
                                {field.label}
                              </button>
                            ) : (
                              <input
                                id={fieldId}
                                className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                                type={
                                  normalizedType === "number"
                                    ? "number"
                                    : normalizedType === "search"
                                      ? "search"
                                      : normalizedType === "email"
                                        ? "email"
                                        : normalizedType === "url"
                                          ? "url"
                                          : normalizedType === "date"
                                            ? "date"
                                            : "text"
                                }
                                placeholder={field.placeholder ?? ""}
                                value={stringValue}
                                onChange={(event) =>
                                  updateFormValue(fieldKey, event.target.value)
                                }
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </details>
                ))}
                </div>
              </div>

              {answerSummary ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
                    Campos mapeados: {answerSummary.mapped_fields}
                  </span>
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-extrabold text-violet-700">
                    Generados por IA: {answerSummary.ai_fields}
                  </span>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">
                    Campos faltantes: {answerSummary.missing_count}
                  </span>
                </div>
              ) : null}

              {missingFields.length > 0 ? (
                <div className="mt-4 overflow-hidden rounded-2xl border border-amber-800/40 bg-amber-950/30">
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FiAlertCircle className="shrink-0 text-amber-400" />
                      <span className="text-sm font-extrabold text-amber-300">
                        Campos pendientes:{" "}
                        <span className="ml-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-200">
                          {missingFields.length}
                        </span>
                      </span>
                    </div>
                    <button
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-700/50 bg-amber-900/30 px-3 py-1.5 text-xs font-bold text-amber-300 transition hover:bg-amber-800/40"
                      type="button"
                      onClick={() => setMissingFieldsOpen((prev) => !prev)}
                    >
                      {missingFieldsOpen ? <FiEyeOff className="text-[11px]" /> : <FiEye className="text-[11px]" />}
                      {missingFieldsOpen ? "Ocultar campos" : "Ver campos pendientes"}
                    </button>
                  </div>
                  {missingFieldsOpen ? (
                    <div className="border-t border-amber-800/40 px-4 pb-4 pt-3">
                      <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                        {missingFields.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-amber-200">
                            <FiAlertCircle className="mt-0.5 shrink-0 text-amber-400" />
                            <span>
                              <strong>{f.field}</strong>
                              {f.reason ? ` — ${f.reason}` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {applyStates.size > 0 ? (
                <div className="mt-6 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    {tAuto("Progreso de postulaciones")}
                  </p>
                  {festivals.map((festival) => {
                    const state = applyStates.get(keyOf(festival.id)) ?? {
                      status: "pending" as ApplyStatus,
                    };
                    return (
                      <div
                        key={keyOf(festival.id)}
                        className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition ${
                          state.status === "success"
                            ? "border-emerald-300 bg-emerald-50"
                            : state.status === "error"
                              ? "border-red-300 bg-red-50"
                              : state.status === "retrying"
                                ? "border-amber-300 bg-amber-50"
                                : "border-gray-200 bg-white"
                        }`}
                      >
                        <span className="truncate text-sm font-bold text-gray-800">
                          {festival.name}
                        </span>
                        <span className="shrink-0">
                          {state.status === "pending" && (
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
                              {tAuto("Pendiente")}
                            </span>
                          )}
                          {state.status === "sending" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                              <FiLoader className="animate-spin" />
                              {tAuto("Enviando...")}
                            </span>
                          )}
                          {state.status === "retrying" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                              <FiLoader className="animate-spin" />
                              {tAuto("Reintentando...")}
                            </span>
                          )}
                          {state.status === "success" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                              <FiCheck />
                              {tAuto("Enviado")}
                            </span>
                          )}
                          {state.status === "error" && (
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700"
                              title={state.error}
                            >
                              <FiAlertCircle />
                              {tAuto("Error")}
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {applyStates.size === 0 ? (
                <div className="sticky bottom-0 mt-6 border-t border-gray-200 bg-white/95 pt-3 backdrop-blur">
                  {fillResult ? (
                    <p className={`mb-3 flex items-start gap-2 rounded-xl border p-3 text-xs font-semibold ${
                      fillResult.tone === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}>
                      <FiCheck className="mt-0.5 shrink-0" />
                      <span>
                        {fillResult.message}
                        {fillSavedUrl ? (
                          <>
                            {" "}
                            <a
                              href={fillSavedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="underline"
                            >
                              {tAuto("Ver en FilmFreeway")}
                            </a>
                          </>
                        ) : null}
                      </span>
                    </p>
                  ) : null}
                  {fillError ? (
                    <p className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                      <FiAlertCircle className="mt-0.5 shrink-0" />
                      {fillError}
                    </p>
                  ) : null}
                  {fillErrorsDetail.length > 0 ? (
                    <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      <p className="mb-1.5 font-bold">
                        {fillErrorsDetail.length}{" "}
                        {fillErrorsDetail.length !== 1
                          ? tAuto("campos con problemas")
                          : tAuto("campo con problemas")}
                        :
                      </p>
                      <ul className="space-y-1">
                        {fillErrorsDetail.map((item, index) => (
                          <li key={`${item.key}-${index}`} className="flex items-start gap-1.5">
                            <FiAlertCircle className="mt-0.5 shrink-0" />
                            <span>
                              <span className="font-mono font-semibold">{item.key}</span>: {item.reason}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:justify-end">
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-extrabold text-gray-700 transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      disabled={!allFieldsFilled || fillingForm}
                      onClick={handleSaveResponses}
                    >
                      <FiCheck />
                      {tAuto("Guardar respuestas")}
                    </button>
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                      type="button"
                      disabled={!allFieldsFilled || fillingForm}
                      onClick={() => void handleFillFilmFreeway()}
                    >
                      {fillingForm ? <FiLoader className="animate-spin" /> : <FiSend />}
                      {fillingForm ? "Rellenando..." : tAuto("Rellenar en FilmFreeway")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 font-extrabold text-gray-700 transition hover:bg-gray-50"
                  type="button"
                  onClick={onClose}
                >
                  {tAuto("Cerrar")}
                </button>
              )}
              </section>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function FestivalDetail({
  festival,
  busy,
  onClose,
  onToggle,
}: {
  festival: ProducerFestival;
  busy: boolean;
  onClose: () => void;
  onToggle: () => void;
}) {
  const tAuto = useFT();
  const actionUrl = externalUrl(festival.submission_url || festival.website);
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-2xl sm:p-7"
        role="dialog"
        aria-modal="true"
        aria-label={`${tAuto("Ver detalle")} ${festival.name}`}
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={festival.status} />
              {festival.selected_by_me ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                  <FiCheck />
                  {tAuto("Seleccionado")}
                </span>
              ) : null}
            </div>
            <h2 className="text-2xl font-black sm:text-3xl">{festival.name}</h2>
            <p className="mt-2 flex items-center gap-2 text-[var(--text-secondary)]">
              <FiMapPin />
              {festival.country || tAuto("País no informado")}
            </p>
          </div>
          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--border-color)]"
            type="button"
            aria-label={tAuto("Cerrar")}
            onClick={onClose}
          >
            <FiX />
          </button>
        </header>
        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          <DetailItem label="Website">
            {festival.website || tAuto("No informado")}
          </DetailItem>
          <DetailItem label={tAuto("URL de postulación")}>
            {festival.submission_url || tAuto("No informada")}
          </DetailItem>
          <DetailItem label={tAuto("Plataforma")}>
            {festival.platform || tAuto("No informada")}
          </DetailItem>
          <DetailItem label={tAuto("Apertura")}>
            {formatDate(festival.opening_date, tAuto("No informado"))}
          </DetailItem>
          <DetailItem label={tAuto("Deadline")}>
            {formatDate(festival.deadline, tAuto("Sin deadline"))} ·{" "}
            <span className={deadlineClass(festival)}>
              {deadlineLabel(festival, tAuto)}
            </span>
          </DetailItem>
          <DetailItem label={tAuto("Fecha del evento")}>
            {formatDate(festival.event_date, tAuto("No informado"))}
          </DetailItem>
          <DetailItem label={tAuto("Fee")}>
            {festival.fee === null || festival.fee === undefined
              ? tAuto("No informado")
              : String(festival.fee)}
          </DetailItem>
          <DetailItem label={tAuto("Edición")}>
            {festival.edition_year || tAuto("No informada")}
          </DetailItem>
          <div className="sm:col-span-2">
            <DetailItem label={tAuto("Notas")}>
              {festival.notes || tAuto("Sin notas adicionales.")}
            </DetailItem>
          </div>
        </dl>
        <footer className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="rounded-xl border border-[var(--border-color)] px-4 py-3 text-sm font-bold hover:bg-[var(--hover-bg)]"
            type="button"
            onClick={onClose}
          >
            {tAuto("Cerrar")}
          </button>
          {actionUrl ? (
            <a
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-3 text-sm font-bold hover:bg-[var(--hover-bg)]"
              href={actionUrl}
              target="_blank"
              rel="noreferrer"
            >
              <FiExternalLink />
              {tAuto("Abrir web")}
            </a>
          ) : null}
          <SelectionButton
            festival={festival}
            loading={busy}
            onToggle={onToggle}
          />
        </footer>
      </section>
    </div>
  );
}

function ProducerFestivals() {
  return (
    <ProducerGuard>
      <ProducerFestivalsContent />
    </ProducerGuard>
  );
}

export default ProducerFestivals;
