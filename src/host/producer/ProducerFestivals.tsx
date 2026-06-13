import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  FiCalendar,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiExternalLink,
  FiEye,
  FiFilter,
  FiInbox,
  FiMapPin,
  FiSearch,
  FiZap,
  FiTrash2,
  FiX,
} from "react-icons/fi";
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

function deadlineLabel(festival: ProducerFestival): string {
  const days = daysUntilDeadline(festival);
  if (days === null) return "Sin deadline";
  if (days < 0) return "Deadline vencido";
  if (days === 0) return "Cierra hoy";
  return `${days} ${days === 1 ? "día restante" : "días restantes"}`;
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
  const normalized = normalizeStatus(status);
  const labels: Record<FestivalStatus, string> = {
    OPEN: "Abierto",
    UPCOMING: "Abre pronto",
    CLOSED: "Cerrado",
    ARCHIVED: "Archivado",
    UNKNOWN: "Sin estado",
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
      {loading ? "Procesando..." : selected ? "Quitar selección" : "Seleccionar"}
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
    <section className="mx-auto w-full max-w-[1600px] space-y-6 pb-10 text-[var(--text-primary)]">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">
            Circuito y estrategia
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Postular a Festivales
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
            Explora festivales disponibles, revisa deadlines próximos y
            selecciona los festivales que quieres preparar para postulación.
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-3 text-sm font-bold shadow-sm transition hover:border-blue-300 hover:bg-[var(--hover-bg)]"
          type="button"
          onClick={() => setPanelOpen(true)}
        >
          <FiCheck />
          Mis festivales seleccionados
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
                  {label}
                </p>
                <p className="mt-2 text-3xl font-black">{value}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{helper}</p>
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
          <h2 className="font-extrabold">Filtros</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="relative">
            <span className="sr-only">Buscar festival</span>
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              type="search"
              placeholder="Buscar festival"
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
            <option value="">Todos los países</option>
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
            <option value="">Todas las plataformas</option>
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
            <option value="ALL">Todos</option>
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
            Deadline cercano
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
            Reintentar
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
            <h2 className="text-lg font-extrabold">Festivales</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Ordenados por deadline más cercano.
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
            Limpiar filtros
          </button>
        </div>

        {loading ? (
          <div className="grid min-h-72 place-items-center p-8 text-center">
            <div>
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              <p className="mt-4 font-bold">Cargando festivales...</p>
            </div>
          </div>
        ) : visibleFestivals.length === 0 ? (
          <div className="grid min-h-72 place-items-center p-8 text-center">
            <div>
              <FiSearch className="mx-auto text-4xl text-[var(--text-muted)]" />
              <h3 className="mt-3 text-lg font-extrabold">Sin resultados</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Ajusta los filtros para explorar otros festivales.
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
                Mostrando {start + 1}-
                {Math.min(start + pageSize, filteredFestivals.length)} de{" "}
                {filteredFestivals.length}
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
                    {size} por página
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
                {currentPage} de {totalPages}
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
  const website = externalUrl(festival.website);
  return (
    <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--input-bg)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-extrabold">{festival.name}</h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-[var(--text-muted)]">
            <FiMapPin />
            {festival.country || "País no informado"}
          </p>
        </div>
        <StatusBadge status={festival.status} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">
            Plataforma
          </p>
          <p className="mt-1 font-semibold">
            {festival.platform || "No informada"}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">
            Fee
          </p>
          <p className="mt-1 font-semibold">
            {festival.fee === null || festival.fee === undefined
              ? "No informado"
              : String(festival.fee)}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">
            Deadline
          </p>
          <p className="mt-1 font-semibold">
            {formatDate(festival.deadline, "Sin deadline")}
          </p>
          <p className={`text-xs font-bold ${deadlineClass(festival)}`}>
            {deadlineLabel(festival)}
          </p>
        </div>
      </div>
      {festival.selected_by_me ? (
        <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
          <FiCheck />
          Seleccionado
        </span>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm font-bold hover:bg-[var(--hover-bg)]"
          type="button"
          onClick={onDetail}
        >
          <FiEye />
          Ver detalle
        </button>
        {website ? (
          <a
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm font-bold hover:bg-[var(--hover-bg)]"
            href={website}
            target="_blank"
            rel="noreferrer"
          >
            <FiExternalLink />
            Abrir web
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
  return (
    <div className="hidden overflow-x-auto xl:block">
      <table className="w-full min-w-[1050px] border-collapse text-left">
        <thead className="bg-[var(--bg-secondary)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
          <tr>
            <th className="px-5 py-4">Festival</th>
            <th className="px-4 py-4">Plataforma</th>
            <th className="px-4 py-4">Deadline</th>
            <th className="px-4 py-4">Fee</th>
            <th className="px-4 py-4">Estado</th>
            <th className="px-5 py-4 text-right">Acciones</th>
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
                  {festival.country || "País no informado"}
                  {festival.edition_year
                    ? ` · Edición ${festival.edition_year}`
                    : ""}
                </p>
                {festival.selected_by_me ? (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                    <FiCheck />
                    Seleccionado
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-4 text-sm font-semibold">
                {festival.platform || "No informada"}
              </td>
              <td className="px-4 py-4">
                <p className="text-sm font-bold">
                  {formatDate(festival.deadline, "Sin deadline")}
                </p>
                <p className={`mt-1 text-xs font-bold ${deadlineClass(festival)}`}>
                  {deadlineLabel(festival)}
                </p>
              </td>
              <td className="px-4 py-4 text-sm font-semibold">
                {festival.fee === null || festival.fee === undefined
                  ? "No informado"
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
                    title="Ver detalle"
                    aria-label={`Ver detalle de ${festival.name}`}
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
                      title="Abrir web"
                      aria-label={`Abrir web de ${festival.name}`}
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

function SelectionPanel({
  festivals,
  busyIds,
  onClose,
  onRemove,
}: {
  festivals: ProducerFestival[];
  busyIds: Set<string>;
  onClose: () => void;
  onRemove: (festival: ProducerFestival) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <aside
        className="h-full w-full max-w-lg overflow-y-auto border-l border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-2xl sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label="Mis festivales seleccionados"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
              Lista de trabajo
            </p>
            <h2 className="mt-1 text-2xl font-black">
              Mis festivales seleccionados
            </h2>
          </div>
          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--border-color)]"
            type="button"
            aria-label="Cerrar panel"
            onClick={onClose}
          >
            <FiX />
          </button>
        </header>
        <div className="mt-6 space-y-3">
          {festivals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-8 text-center">
              <FiInbox className="mx-auto text-4xl text-[var(--text-muted)]" />
              <p className="mt-3 font-bold">
                Selecciona festivales para preparar futuras postulaciones.
              </p>
            </div>
          ) : (
            festivals.map((festival) => (
              <article
                key={keyOf(festival.id)}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--input-bg)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold">{festival.name}</h3>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {festival.country || "País no informado"} ·{" "}
                      {festival.platform || "Sin plataforma"}
                    </p>
                  </div>
                  <button
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300"
                    type="button"
                    disabled={busyIds.has(keyOf(festival.id))}
                    aria-label={`Quitar ${festival.name}`}
                    onClick={() => onRemove(festival)}
                  >
                    <FiTrash2 />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold">
                    {formatDate(festival.deadline, "Sin deadline")}
                  </span>
                  <span className={`font-bold ${deadlineClass(festival)}`}>
                    {deadlineLabel(festival)}
                  </span>
                </div>
              </article>
            ))
          )}
        </div>
        <button
          className="mt-6 inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-300 px-4 py-3 font-extrabold text-slate-600 opacity-70 dark:bg-slate-700 dark:text-slate-300"
          type="button"
          disabled
        >
          <FiZap />
          Preparar postulación con IA
        </button>
        <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
          Disponible en la siguiente etapa.
        </p>
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
        aria-label={`Detalle de ${festival.name}`}
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={festival.status} />
              {festival.selected_by_me ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                  <FiCheck />
                  Seleccionado
                </span>
              ) : null}
            </div>
            <h2 className="text-2xl font-black sm:text-3xl">{festival.name}</h2>
            <p className="mt-2 flex items-center gap-2 text-[var(--text-secondary)]">
              <FiMapPin />
              {festival.country || "País no informado"}
            </p>
          </div>
          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--border-color)]"
            type="button"
            aria-label="Cerrar detalle"
            onClick={onClose}
          >
            <FiX />
          </button>
        </header>
        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          <DetailItem label="Website">
            {festival.website || "No informado"}
          </DetailItem>
          <DetailItem label="URL de postulación">
            {festival.submission_url || "No informada"}
          </DetailItem>
          <DetailItem label="Plataforma">
            {festival.platform || "No informada"}
          </DetailItem>
          <DetailItem label="Apertura">
            {formatDate(festival.opening_date)}
          </DetailItem>
          <DetailItem label="Deadline">
            {formatDate(festival.deadline, "Sin deadline")} ·{" "}
            <span className={deadlineClass(festival)}>
              {deadlineLabel(festival)}
            </span>
          </DetailItem>
          <DetailItem label="Fecha del evento">
            {formatDate(festival.event_date)}
          </DetailItem>
          <DetailItem label="Fee">
            {festival.fee === null || festival.fee === undefined
              ? "No informado"
              : String(festival.fee)}
          </DetailItem>
          <DetailItem label="Edición">
            {festival.edition_year || "No informada"}
          </DetailItem>
          <div className="sm:col-span-2">
            <DetailItem label="Notas">
              {festival.notes || "Sin notas adicionales."}
            </DetailItem>
          </div>
        </dl>
        <footer className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="rounded-xl border border-[var(--border-color)] px-4 py-3 text-sm font-bold hover:bg-[var(--hover-bg)]"
            type="button"
            onClick={onClose}
          >
            Cerrar
          </button>
          {actionUrl ? (
            <a
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-3 text-sm font-bold hover:bg-[var(--hover-bg)]"
              href={actionUrl}
              target="_blank"
              rel="noreferrer"
            >
              <FiExternalLink />
              Abrir web
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
