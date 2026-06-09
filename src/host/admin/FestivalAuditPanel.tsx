import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  FiAlertCircle,
  FiArchive,
  FiCheckCircle,
  FiChevronDown,
  FiChevronRight,
  FiCopy,
  FiEye,
  FiFileText,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiX,
} from "react-icons/fi";
import {
  cleanupFestivalDuplicates,
  cleanupInvalidFestivals,
  getFestivalAuditSummary,
  getFestivalCleanupPreview,
  getFestivalDuplicates,
} from "../../service/adminFestivalApi";
import type {
  FestivalAuditSummary,
  FestivalCleanupPreview,
  FestivalCleanupResult,
  FestivalDuplicateGroup,
} from "../../types/festival";

type CleanupKind = "duplicates" | "invalid";

type FestivalAuditPanelProps = {
  token?: string;
  onCleanupComplete: () => Promise<void>;
};

const DUPLICATE_PAGE_SIZE = 10;

function AuditModal({
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
          wide ? "max-w-6xl" : "max-w-2xl"
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

function getNumber(
  source: FestivalCleanupPreview | FestivalCleanupResult,
  keys: string[]
): number {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number") {
      return value;
    }
    if (Array.isArray(value)) {
      return value.length;
    }
  }
  return 0;
}

function describeItem(item: unknown): string {
  if (typeof item === "string" || typeof item === "number") {
    return String(item);
  }

  if (item && typeof item === "object") {
    const record = item as Record<string, unknown>;
    const title =
      record.canonical_name ?? record.name ?? record.id ?? record.reason;
    if (typeof title === "string" || typeof title === "number") {
      return String(title);
    }
    return JSON.stringify(item);
  }

  return "Registro sin detalle";
}

function PreviewLists({ preview }: { preview: FestivalCleanupPreview }) {
  const groups = [
    { label: "Conservar", keys: ["keep", "to_keep", "documents_to_keep_list"] },
    { label: "Archivar", keys: ["archive", "to_archive", "documents_to_archive_list"] },
    { label: "Fusionar", keys: ["merge", "to_merge", "documents_to_merge_list"] },
    { label: "Bloqueados por duda", keys: ["blocked", "blocked_by_doubt_list"] },
    { label: "Años distintos", keys: ["different_year_groups", "different_years_list"] },
    { label: "Inválidos", keys: ["invalid", "invalid_documents_list"] },
  ];

  const availableGroups = groups
    .map((group) => ({
      label: group.label,
      items: group.keys
        .map((key) => preview[key])
        .find((value): value is unknown[] => Array.isArray(value)),
    }))
    .filter((group): group is { label: string; items: unknown[] } =>
      Boolean(group.items?.length)
    );

  if (!availableGroups.length) {
    return null;
  }

  return (
    <div className="mt-6 space-y-3">
      {availableGroups.map((group) => (
        <details
          className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4"
          key={group.label}
        >
          <summary className="cursor-pointer font-bold">
            {group.label} ({group.items.length})
          </summary>
          <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm text-[var(--text-secondary)]">
            {group.items.map((item, index) => (
              <li
                className="rounded-lg bg-[var(--bg-card)] px-3 py-2"
                key={`${group.label}-${index}`}
              >
                {describeItem(item)}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}

export default function FestivalAuditPanel({
  token,
  onCleanupComplete,
}: FestivalAuditPanelProps) {
  const [summary, setSummary] = useState<FestivalAuditSummary | null>(null);
  const [duplicates, setDuplicates] = useState<FestivalDuplicateGroup[]>([]);
  const [preview, setPreview] = useState<FestivalCleanupPreview | null>(null);
  const [result, setResult] = useState<FestivalCleanupResult | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isDuplicatesOpen, setIsDuplicatesOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [cleanupKind, setCleanupKind] = useState<CleanupKind | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [duplicateSearch, setDuplicateSearch] = useState("");
  const [duplicatePage, setDuplicatePage] = useState(1);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const loadSummary = useCallback(async () => {
    try {
      setIsSummaryLoading(true);
      setError("");
      setSummary(await getFestivalAuditSummary(token));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar la auditoría del catálogo."
      );
    } finally {
      setIsSummaryLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const filteredDuplicates = useMemo(() => {
    const search = duplicateSearch.trim().toLocaleLowerCase("es");
    if (!search) {
      return duplicates;
    }
    return duplicates.filter((group) =>
      group.canonical_name.toLocaleLowerCase("es").includes(search)
    );
  }, [duplicateSearch, duplicates]);

  const duplicatePages = Math.max(
    1,
    Math.ceil(filteredDuplicates.length / DUPLICATE_PAGE_SIZE)
  );
  const visibleDuplicates = filteredDuplicates.slice(
    (duplicatePage - 1) * DUPLICATE_PAGE_SIZE,
    duplicatePage * DUPLICATE_PAGE_SIZE
  );

  useEffect(() => {
    setDuplicatePage((page) => Math.min(page, duplicatePages));
  }, [duplicatePages]);

  const handleOpenDuplicates = async () => {
    try {
      setIsActionLoading(true);
      setError("");
      const groups = await getFestivalDuplicates(token);
      setDuplicates(groups);
      setDuplicatePage(1);
      setDuplicateSearch("");
      setExpandedGroups(new Set());
      setIsDuplicatesOpen(true);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar los duplicados."
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleOpenPreview = async () => {
    try {
      setIsActionLoading(true);
      setError("");
      setPreview(await getFestivalCleanupPreview(token));
      setIsPreviewOpen(true);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo generar la previsualización."
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const openConfirmation = (kind: CleanupKind) => {
    setCleanupKind(kind);
    setConfirmation("");
    setError("");
  };

  const handleCleanup = async () => {
    if (!cleanupKind || confirmation !== "ARCHIVAR") {
      return;
    }

    try {
      setIsActionLoading(true);
      setError("");
      setSuccess("");
      const cleanupResult =
        cleanupKind === "duplicates"
          ? await cleanupFestivalDuplicates(token)
          : await cleanupInvalidFestivals(token);
      setResult(cleanupResult);
      setCleanupKind(null);
      setConfirmation("");
      await Promise.all([loadSummary(), onCleanupComplete()]);
      setSuccess(
        cleanupKind === "duplicates"
          ? "Duplicados archivados correctamente."
          : "Registros inválidos archivados correctamente."
      );
    } catch (cleanupError) {
      setError(
        cleanupError instanceof Error
          ? cleanupError.message
          : "No se pudo completar el archivado."
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const auditCards = summary
    ? [
        {
          label: "Documentos totales",
          value: summary.total_documents,
          icon: FiFileText,
          accent: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
        },
        {
          label: "Festivales únicos válidos",
          value: summary.valid_unique_festivals,
          icon: FiCheckCircle,
          accent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
        },
        {
          label: "Duplicados detectados",
          value: summary.duplicate_documents,
          icon: FiCopy,
          accent: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
        },
        {
          label: "Registros inválidos",
          value: summary.invalid_auxiliary_documents,
          icon: FiAlertCircle,
          accent: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
        },
        {
          label: "Faltantes desde Excel",
          value: summary.missing_from_firestore,
          icon: FiShield,
          accent: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
        },
        {
          label: "Incompletos",
          value: summary.incomplete_documents,
          icon: FiEye,
          accent: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
        },
      ]
    : [];

  return (
    <>
      <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)]">
        <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Control de calidad
            </p>
            <h2 className="mt-1 text-xl font-extrabold">Auditoría del catálogo</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              Revisa duplicados, registros inválidos e inconsistencias antes de
              ejecutar cualquier archivado reversible.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] px-3 text-sm font-bold transition hover:bg-[var(--hover-bg)] disabled:opacity-60"
              type="button"
              disabled={isSummaryLoading || isActionLoading}
              onClick={() => void loadSummary()}
            >
              <FiRefreshCw className={isSummaryLoading ? "animate-spin" : ""} />
              Actualizar auditoría
            </button>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 text-sm font-bold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
              type="button"
              disabled={isActionLoading}
              onClick={() => void handleOpenDuplicates()}
            >
              <FiCopy />
              Ver duplicados
            </button>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
              type="button"
              disabled={isActionLoading}
              onClick={() => void handleOpenPreview()}
            >
              <FiEye />
              Previsualizar limpieza
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
            {success}
          </div>
        ) : null}

        {isSummaryLoading && !summary ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700"
                key={index}
              />
            ))}
          </div>
        ) : summary ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {auditCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article
                    className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4"
                    key={card.label}
                  >
                    <span className={`grid h-9 w-9 place-items-center rounded-xl ${card.accent}`}>
                      <Icon aria-hidden="true" />
                    </span>
                    <strong className="mt-3 block text-3xl font-black">{card.value}</strong>
                    <span className="mt-1 block text-xs font-bold text-[var(--text-secondary)]">
                      {card.label}
                    </span>
                  </article>
                );
              })}
            </div>
            <div className="mt-5 flex flex-wrap gap-3 border-t border-[var(--border-color)] pt-5">
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-bold text-white transition hover:bg-amber-700 disabled:opacity-50"
                type="button"
                disabled={!summary.duplicate_documents || isActionLoading}
                onClick={() => openConfirmation("duplicates")}
              >
                <FiArchive />
                Archivar duplicados
              </button>
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                type="button"
                disabled={!summary.invalid_auxiliary_documents || isActionLoading}
                onClick={() => openConfirmation("invalid")}
              >
                <FiArchive />
                Archivar inválidos
              </button>
              <p className="self-center text-xs font-semibold text-[var(--text-muted)]">
                El backend archiva de forma reversible; no se borran documentos físicamente.
              </p>
            </div>
          </>
        ) : (
          <p className="rounded-2xl bg-[var(--bg-secondary)] p-5 text-sm text-[var(--text-secondary)]">
            Actualiza la auditoría para consultar el estado del catálogo.
          </p>
        )}
      </section>

      {isDuplicatesOpen ? (
        <AuditModal
          title={`Duplicados detectados · ${duplicates.length} grupos`}
          eyebrow="Auditoría del catálogo"
          wide
          onClose={() => setIsDuplicatesOpen(false)}
        >
          <label className="relative mb-5 block">
            <FiSearch
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              aria-hidden="true"
            />
            <input
              className="h-12 w-full rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] pl-11 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              type="search"
              placeholder="Buscar por nombre canónico"
              value={duplicateSearch}
              onChange={(event) => {
                setDuplicateSearch(event.target.value);
                setDuplicatePage(1);
              }}
            />
          </label>

          <div className="space-y-3">
            {visibleDuplicates.map((group) => {
              const isExpanded = expandedGroups.has(group.canonical_name);
              return (
                <article
                  className="overflow-hidden rounded-2xl border border-[var(--border-color)]"
                  key={group.canonical_name}
                >
                  <button
                    className="flex w-full items-center justify-between gap-4 bg-[var(--bg-secondary)] p-4 text-left"
                    type="button"
                    onClick={() =>
                      setExpandedGroups((current) => {
                        const next = new Set(current);
                        if (next.has(group.canonical_name)) {
                          next.delete(group.canonical_name);
                        } else {
                          next.add(group.canonical_name);
                        }
                        return next;
                      })
                    }
                  >
                    <span>
                      <strong className="block">{group.canonical_name}</strong>
                      <small className="text-[var(--text-muted)]">
                        {group.documents.length} documentos
                      </small>
                    </span>
                    {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                  </button>
                  {isExpanded ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px] text-sm">
                        <thead className="text-left text-xs uppercase tracking-wider text-[var(--text-muted)]">
                          <tr>
                            <th className="px-4 py-3">Nombre</th>
                            <th className="px-4 py-3">País</th>
                            <th className="px-4 py-3">Deadline</th>
                            <th className="px-4 py-3">Estado</th>
                            <th className="px-4 py-3">Completitud</th>
                            <th className="px-4 py-3">Recomendación</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.documents.map((document) => (
                            <tr
                              className="border-t border-[var(--border-color)]"
                              key={document.id}
                            >
                              <td className="px-4 py-3 font-bold">{document.name}</td>
                              <td className="px-4 py-3">{document.country || "No informado"}</td>
                              <td className="px-4 py-3">{document.deadline || "No informado"}</td>
                              <td className="px-4 py-3">{document.status || "UNKNOWN"}</td>
                              <td className="px-4 py-3">
                                {document.completeness_score ?? "No informado"}
                              </td>
                              <td className="px-4 py-3">
                                {document.recommended_keep ? (
                                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                    Conservar
                                  </span>
                                ) : null}
                                {document.recommended_delete ? (
                                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                    Archivar
                                  </span>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          {!visibleDuplicates.length ? (
            <p className="rounded-2xl bg-[var(--bg-secondary)] p-6 text-center text-[var(--text-secondary)]">
              No se encontraron grupos duplicados.
            </p>
          ) : null}

          {duplicatePages > 1 ? (
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                className="h-10 rounded-lg border border-[var(--border-color)] px-4 font-bold disabled:opacity-50"
                type="button"
                disabled={duplicatePage === 1}
                onClick={() => setDuplicatePage((page) => Math.max(1, page - 1))}
              >
                Anterior
              </button>
              <span className="text-sm font-semibold text-[var(--text-secondary)]">
                Página {duplicatePage} de {duplicatePages}
              </span>
              <button
                className="h-10 rounded-lg border border-[var(--border-color)] px-4 font-bold disabled:opacity-50"
                type="button"
                disabled={duplicatePage === duplicatePages}
                onClick={() =>
                  setDuplicatePage((page) => Math.min(duplicatePages, page + 1))
                }
              >
                Siguiente
              </button>
            </div>
          ) : null}
        </AuditModal>
      ) : null}

      {isPreviewOpen && preview ? (
        <AuditModal
          title="Previsualización de limpieza"
          eyebrow="Simulación sin escritura"
          wide
          onClose={() => setIsPreviewOpen(false)}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Se conservarían", getNumber(preview, ["documents_to_keep", "kept", "keep"])],
              ["Se archivarían", getNumber(preview, ["documents_to_archive", "archived", "archive"])],
              ["Se fusionarían", getNumber(preview, ["documents_to_merge", "merged", "merge"])],
              ["Bloqueados por duda", getNumber(preview, ["blocked_by_doubt", "blocked"])],
              ["Años distintos", getNumber(preview, ["different_years", "different_year_groups"])],
              ["Inválidos", getNumber(preview, ["invalid_documents", "invalid"])],
            ].map(([label, value]) => (
              <div
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4"
                key={String(label)}
              >
                <strong className="block text-3xl font-black">{value}</strong>
                <span className="text-sm font-bold text-[var(--text-secondary)]">
                  {label}
                </span>
              </div>
            ))}
          </div>
          <PreviewLists preview={preview} />
          <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
            Esta previsualización no modifica datos. Los casos bloqueados por duda
            permanecen visibles y no se archivarán automáticamente.
          </div>
        </AuditModal>
      ) : null}

      {cleanupKind ? (
        <AuditModal
          title={
            cleanupKind === "duplicates"
              ? "Archivar duplicados"
              : "Archivar registros inválidos"
          }
          eyebrow="Confirmación requerida"
          onClose={() => {
            if (!isActionLoading) {
              setCleanupKind(null);
              setConfirmation("");
            }
          }}
        >
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
            <p className="font-bold">
              Esta acción archivará{" "}
              {cleanupKind === "duplicates" ? "duplicados" : "registros inválidos"}{" "}
              de forma reversible. No se borrarán físicamente. ¿Deseas continuar?
            </p>
          </div>
          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">
              Escribe ARCHIVAR para confirmar
            </span>
            <input
              className="h-12 w-full rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] px-4 font-bold outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              value={confirmation}
              autoComplete="off"
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>
          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">
              {error}
            </div>
          ) : null}
          <div className="mt-6 flex justify-end gap-3">
            <button
              className="h-11 rounded-xl border border-[var(--border-color)] px-5 font-bold"
              type="button"
              disabled={isActionLoading}
              onClick={() => setCleanupKind(null)}
            >
              Cancelar
            </button>
            <button
              className="h-11 rounded-xl bg-amber-600 px-5 font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={confirmation !== "ARCHIVAR" || isActionLoading}
              onClick={() => void handleCleanup()}
            >
              {isActionLoading ? "Archivando..." : "Confirmar archivado"}
            </button>
          </div>
        </AuditModal>
      ) : null}

      {result ? (
        <AuditModal
          title="Resultado del archivado"
          eyebrow="Operación completada"
          onClose={() => setResult(null)}
        >
          {result.message ? (
            <p className="mb-5 text-[var(--text-secondary)]">{result.message}</p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Archivados", getNumber(result, ["archived", "invalid_archived", "archived_count"])],
              ["Fusionados", getNumber(result, ["merged", "merged_count"])],
              ["Conservados", getNumber(result, ["kept", "kept_count"])],
              ["Bloqueados por duda", getNumber(result, ["blocked", "blocked_by_doubt"])],
            ].map(([label, value]) => (
              <div
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4"
                key={String(label)}
              >
                <strong className="block text-3xl font-black">{value}</strong>
                <span className="text-sm font-bold text-[var(--text-secondary)]">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </AuditModal>
      ) : null}
    </>
  );
}
