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
  FiUpload,
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
import { useCurrentProfile } from "../useCurrentProfile";
import ProducerGuard from "./ProducerGuard";
import { useAutoTranslate, useFestivalFlowLanguage } from "../../hooks/useAutoTranslate";

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
  "Haz clic para subir archivo",
  "Progreso de postulaciones",
  "Pendiente", "Enviando...", "Reintentando...", "Enviado", "Error",
  "Iniciar postulaciones", "Enviando postulaciones...",
  "Película", "Director", "Técnico", "Archivos",
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
  label: string;
  type: string;
  tab: string;
  required_in: (string | number)[];
  applies_to: (string | number)[];
  options?: string[];
  placeholder?: string;
};

type UnifiedFormData = {
  batch_id: string;
  fields: UnifiedField[];
};

const ANALYZE_MESSAGES = [
  "Analizando formularios...",
  "Extrayendo campos...",
  "Generando formulario unificado...",
];

const FORM_TABS = [
  { key: "pelicula", label: "Película" },
  { key: "director", label: "Director" },
  { key: "tecnico", label: "Técnico" },
  { key: "archivos", label: "Archivos" },
] as const;

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-violet-600",
  "bg-emerald-600",
  "bg-amber-500",
  "bg-rose-600",
  "bg-cyan-600",
] as const;

const STEPPER_STEPS = ["Credenciales", "Análisis", "Formulario"] as const;

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
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [unifiedForm, setUnifiedForm] = useState<UnifiedFormData | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>(() => ({}));
  const [fileValues, setFileValues] = useState<Record<string, File | null>>(() => ({}));
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>(() => ({}));
  const [activeTab, setActiveTab] = useState("pelicula");
  const [msgIndex, setMsgIndex] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  useEffect(() => {
    if (!analyzing) return;
    setMsgIndex(0);
    const id = setInterval(
      () => setMsgIndex((i) => (i + 1) % ANALYZE_MESSAGES.length),
      1800
    );
    return () => clearInterval(id);
  }, [analyzing]);

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
    (unifiedForm?.fields ?? []).length === 0 ||
    (unifiedForm?.fields ?? []).every((f) => {
      if (f.required_in.length === 0) return true;
      if (f.type === "file") return (fileValues[f.field_id] ?? null) !== null;
      return (formValues[f.field_id] ?? "").trim() !== "";
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

  const handleAnalyze = async () => {
    if (!allFilled || analyzing) return;
    setAnalyzing(true);
    setAnalyzeError("");

    const festivalIds = festivals.map((f) => f.id);
    const credentials = festivals.map((f) => ({
      festival_id: f.id,
      username: creds.get(keyOf(f.id))?.username.trim() ?? "",
      password: creds.get(keyOf(f.id))?.password ?? "",
    }));

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
        body: JSON.stringify({ festival_ids: festivalIds, credentials }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Error ${res.status}`);
      }
      const data = (await res.json()) as UnifiedFormData;
      setUnifiedForm(data);
      setFormValues({});
      setFileValues({});
      setFilePreviews({});
      setApplyStates(new Map());
      setActiveTab("pelicula");
      setStep("unified-form");
    } catch (err) {
      setAnalyzeError(
        err instanceof Error ? err.message : "Error al analizar los formularios."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileChange = (fieldId: string, file: File | null) => {
    setFileValues((prev) => ({ ...prev, [fieldId]: file }));
    setFilePreviews((prev) => {
      if (!file) {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      }
      if (file.type.startsWith("image/")) {
        return { ...prev, [fieldId]: URL.createObjectURL(file) };
      }
      return { ...prev, [fieldId]: file.name };
    });
  };

  const handleSubmitUnified = async () => {
    if (!unifiedForm || submitting || !allFieldsFilled) return;
    setSubmitting(true);

    const batchId = unifiedForm.batch_id;

    setApplyStates(() => {
      const next = new Map<string, ApplyState>();
      festivals.forEach((f) => next.set(keyOf(f.id), { status: "sending" }));
      return next;
    });

    try {
      const hasFiles = Object.values(fileValues).some(Boolean);
      let res: Response;
      if (hasFiles) {
        const fd = new FormData();
        fd.append("batch_id", batchId);
        Object.entries(formValues).forEach(([k, v]) =>
          fd.append(`form_data[${k}]`, v)
        );
        Object.entries(fileValues).forEach(([k, v]) => {
          if (v) fd.append(`form_data[${k}]`, v);
        });
        res = await fetch(`${API_URL}/api/festivals/submit-forms`, {
          method: "POST",
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: fd,
        });
      } else {
        res = await fetch(`${API_URL}/api/festivals/submit-forms`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ batch_id: batchId, form_data: formValues }),
        });
      }
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Error ${res.status}`);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error al enviar el formulario.";
      setApplyStates(() => {
        const next = new Map<string, ApplyState>();
        festivals.forEach((f) =>
          next.set(keyOf(f.id), { status: "error", error: msg })
        );
        return next;
      });
      setSubmitting(false);
      return;
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const streamRes = await fetch(
        `${API_URL}/api/festivals/apply/stream/${batchId}`,
        {
          headers: {
            Accept: "text/event-stream",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: ctrl.signal,
        }
      );
      if (!streamRes.ok || !streamRes.body) {
        throw new Error(`Error al conectar al stream: ${streamRes.status}`);
      }

      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      const festivalIdSet = new Set(festivals.map((f) => keyOf(f.id)));
      const terminalIds = new Set<string>();

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        let dataLine = "";
        for (const line of lines) {
          if (line.startsWith("data:")) {
            dataLine = line.slice(5).trim();
          } else if (line.trim() === "" && dataLine) {
            try {
              const evt = JSON.parse(dataLine) as {
                festival_id: string | number;
                status: string;
                message?: string;
              };
              const id = keyOf(evt.festival_id);
              const status = evt.status as ApplyStatus;
              setApplyStates((prev) => {
                const next = new Map(prev);
                next.set(id, {
                  status,
                  error:
                    status === "error"
                      ? (evt.message ?? "Error desconocido")
                      : undefined,
                });
                return next;
              });
              if (status === "success" || status === "error") {
                terminalIds.add(id);
                if (terminalIds.size === festivalIdSet.size) break outer;
              }
            } catch {
              // ignore malformed SSE event
            }
            dataLine = "";
          }
        }
      }
      reader.cancel();
    } catch (err) {
      if ((err as { name?: string }).name !== "AbortError") {
        setApplyStates((prev) => {
          const next = new Map(prev);
          festivals.forEach((f) => {
            const cur = prev.get(keyOf(f.id));
            if (cur?.status !== "success" && cur?.status !== "error") {
              next.set(keyOf(f.id), {
                status: "error",
                error: err instanceof Error ? err.message : "Error en el stream.",
              });
            }
          });
          return next;
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const tAuto = useFT();
  const isLocked = submitting || allDone;
  const currentStepIdx = analyzing ? 1 : step === "unified-form" ? 2 : 0;

  const tabsWithFields = FORM_TABS.filter((t) =>
    unifiedForm?.fields.some((f) => f.tab === t.key)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) =>
        !isLocked &&
        !analyzing &&
        event.target === event.currentTarget &&
        onClose()
      }
    >
      <aside
        className="flex h-full w-full max-w-xl flex-col border-l border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl"
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
                  {tAuto("Analizar formularios")}
                </button>
              </>
            )
          ) : null}

          {/* UNIFIED FORM STEP */}
          {step === "unified-form" && unifiedForm ? (
            <>
              <p className="text-sm text-[var(--text-muted)]">
                {tAuto("Completa el formulario unificado. Los datos se enviarán a todos los festivales seleccionados.")}
              </p>

              {tabsWithFields.length > 1 ? (
                <div className="mt-5 flex gap-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1">
                  {tabsWithFields.map((t) => (
                    <button
                      key={t.key}
                      className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition ${
                        activeTab === t.key
                          ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
                          : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      }`}
                      type="button"
                      onClick={() => setActiveTab(t.key)}
                    >
                      {tAuto(t.label)}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="mt-5 space-y-4">
                {unifiedForm.fields
                  .filter((f) => f.tab === activeTab)
                  .map((field) => {
                    const isRequired = field.required_in.length > 0;
                    const appliesToCount = field.applies_to.length;
                    const fieldId = `uf-${field.field_id}`;
                    return (
                      <div key={field.field_id}>
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          {field.type === "file" ? (
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                              {field.label}
                              {isRequired && (
                                <span className="ml-1 text-red-500">*</span>
                              )}
                            </span>
                          ) : (
                            <label
                              htmlFor={fieldId}
                              className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]"
                            >
                              {field.label}
                              {isRequired && (
                                <span className="ml-1 text-red-500">*</span>
                              )}
                            </label>
                          )}
                          {appliesToCount > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                              <FiInfo className="text-[10px]" />
                              {appliesToCount}{" "}
                              {tAuto(appliesToCount !== 1 ? "festivales" : "festival")}
                            </span>
                          ) : null}
                        </div>

                        {field.type === "textarea" ? (
                          <textarea
                            id={fieldId}
                            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                            rows={4}
                            placeholder={field.placeholder ?? ""}
                            disabled={submitting}
                            value={formValues[field.field_id] ?? ""}
                            onChange={(e) =>
                              setFormValues((prev) => ({
                                ...prev,
                                [field.field_id]: e.target.value,
                              }))
                            }
                          />
                        ) : field.type === "select" &&
                          (field.options?.length ?? 0) > 0 ? (
                          <select
                            id={fieldId}
                            className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                            disabled={submitting}
                            value={formValues[field.field_id] ?? ""}
                            onChange={(e) =>
                              setFormValues((prev) => ({
                                ...prev,
                                [field.field_id]: e.target.value,
                              }))
                            }
                          >
                            <option value="">{tAuto("Seleccionar...")}</option>
                            {field.options!.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : field.type === "file" ? (
                          <div>
                            <label
                              htmlFor={fieldId}
                              className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition ${
                                fileValues[field.field_id]
                                  ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20"
                                  : "border-[var(--border-color)] hover:border-blue-400"
                              }`}
                            >
                              {fileValues[field.field_id] ? (
                                filePreviews[field.field_id]?.startsWith("blob:") ? (
                                  <img
                                    src={filePreviews[field.field_id]}
                                    alt="preview"
                                    className="max-h-32 rounded-lg object-contain"
                                  />
                                ) : (
                                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                    {filePreviews[field.field_id] ??
                                      fileValues[field.field_id]?.name}
                                  </p>
                                )
                              ) : (
                                <>
                                  <FiUpload className="text-2xl text-[var(--text-muted)]" />
                                  <p className="text-sm text-[var(--text-muted)]">
                                    {tAuto("Haz clic para subir archivo")}
                                  </p>
                                </>
                              )}
                            </label>
                            <input
                              id={fieldId}
                              type="file"
                              className="sr-only"
                              disabled={submitting}
                              onChange={(e) =>
                                handleFileChange(
                                  field.field_id,
                                  e.target.files?.[0] ?? null
                                )
                              }
                            />
                          </div>
                        ) : (
                          <input
                            id={fieldId}
                            className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                            type={
                              field.type === "email"
                                ? "email"
                                : field.type === "url"
                                  ? "url"
                                  : field.type === "date"
                                    ? "date"
                                    : "text"
                            }
                            placeholder={field.placeholder ?? ""}
                            disabled={submitting}
                            value={formValues[field.field_id] ?? ""}
                            onChange={(e) =>
                              setFormValues((prev) => ({
                                ...prev,
                                [field.field_id]: e.target.value,
                              }))
                            }
                          />
                        )}
                      </div>
                    );
                  })}
              </div>

              {applyStates.size > 0 ? (
                <div className="mt-6 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
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
                            ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/20"
                            : state.status === "error"
                              ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/20"
                              : state.status === "retrying"
                                ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20"
                                : "border-[var(--border-color)] bg-[var(--input-bg)]"
                        }`}
                      >
                        <span className="truncate text-sm font-bold">
                          {festival.name}
                        </span>
                        <span className="shrink-0">
                          {state.status === "pending" && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                              {tAuto("Pendiente")}
                            </span>
                          )}
                          {state.status === "sending" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                              <FiLoader className="animate-spin" />
                              {tAuto("Enviando...")}
                            </span>
                          )}
                          {state.status === "retrying" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                              <FiLoader className="animate-spin" />
                              {tAuto("Reintentando...")}
                            </span>
                          )}
                          {state.status === "success" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                              <FiCheck />
                              {tAuto("Enviado")}
                            </span>
                          )}
                          {state.status === "error" && (
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300"
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

              {allDone ? (
                <button
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-3 font-extrabold transition hover:bg-[var(--hover-bg)]"
                  type="button"
                  onClick={onClose}
                >
                  {tAuto("Cerrar")}
                </button>
              ) : applyStates.size === 0 ? (
                <button
                  className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-extrabold transition ${
                    allFieldsFilled && !submitting
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "cursor-not-allowed bg-slate-300 text-slate-600 opacity-70 dark:bg-slate-700 dark:text-slate-300"
                  }`}
                  type="button"
                  disabled={!allFieldsFilled || submitting}
                  onClick={() => void handleSubmitUnified()}
                >
                  {submitting ? (
                    <FiLoader className="animate-spin" />
                  ) : (
                    <FiSend />
                  )}
                  {submitting ? tAuto("Enviando postulaciones...") : tAuto("Iniciar postulaciones")}
                </button>
              ) : null}
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
