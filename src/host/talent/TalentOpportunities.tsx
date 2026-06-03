import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createApplication, getMyApplications } from "../../service/applicationApi";
import {
  getOpportunityById,
  getPublicOpportunitiesPage,
} from "../../service/publicOpportunityApi";
import { getMyTalentCommitments } from "../../service/talentApi";
import type {
  PublicOpportunity,
  TalentApplication,
  TalentCommitment,
} from "../../types/talent";
import { useCurrentProfile } from "../useCurrentProfile";
import { useAutoTranslate, useFestivalFlowLanguage } from "../../hooks/useAutoTranslate";
import { combineTranslationTexts } from "../../utils/translationTexts";

type FilterState = {
  search: string;
  specialty: string;
  location: string;
  modality: string;
};

type SecondaryData = {
  applications: PromiseSettledResult<TalentApplication[]>;
  commitments: PromiseSettledResult<TalentCommitment[]>;
};

const ALL_FILTER = "__ALL__";
const ANY_FILTER = "__ANY__";
const cardClass =
  "rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_50px_-40px_rgba(15,23,42,0.35)] sm:p-7";
const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition hover:border-blue-200 focus:border-blue-300 focus:bg-blue-50";
const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-xl border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60";

function normalizeText(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function formatModality(
  value: string | null | undefined,
  t: ReturnType<typeof useTranslation>["t"]
): string {
  if (!normalizeText(value)) {
    return t("talent.opportunities.unreportedModality");
  }

  return t(`options.opportunityModality.${value}`, { defaultValue: value });
}

function formatDate(value: string | null | undefined, locale: string, fallback: string): string {
  if (!value) {
    return fallback;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(parsedDate);
}

function getOpportunityTitle(opportunity: PublicOpportunity, fallback: string): string {
  return opportunity.title?.trim() || opportunity.role_needed?.trim() || fallback;
}

function getProjectLabel(opportunity: PublicOpportunity, fallback: string): string {
  return opportunity.project?.title?.trim() || fallback;
}

function hasDateConflict(
  opportunity: PublicOpportunity,
  commitments: TalentCommitment[]
): boolean {
  const startDate = opportunity.project?.start_date;
  const endDate = opportunity.project?.end_date;

  if (!startDate || !endDate) {
    return false;
  }

  return commitments.some(
    (commitment) =>
      commitment.start_date &&
      commitment.end_date &&
      startDate <= commitment.end_date &&
      endDate >= commitment.start_date
  );
}

function matchesFilter(
  opportunity: PublicOpportunity,
  filters: FilterState,
  fallbackTitle: string,
  fallbackProject: string
): boolean {
  const searchTarget = [
    getOpportunityTitle(opportunity, fallbackTitle),
    getProjectLabel(opportunity, fallbackProject),
    opportunity.role_needed,
    opportunity.specialty,
    opportunity.description,
    opportunity.location,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const searchMatch =
    !filters.search.trim() || searchTarget.includes(filters.search.trim().toLowerCase());
  const specialtyMatch =
    filters.specialty === ALL_FILTER || opportunity.specialty === filters.specialty;
  const locationMatch =
    filters.location === ANY_FILTER || opportunity.location === filters.location;
  const modalityMatch =
    filters.modality === ALL_FILTER || opportunity.modality === filters.modality;

  return searchMatch && specialtyMatch && locationMatch && modalityMatch;
}

function TalentOpportunities() {
  const { t, i18n } = useTranslation();
  const { user, token, profile, isProfileLoading } = useCurrentProfile();
  const language = useFestivalFlowLanguage();
  const tRef = useRef(t);
  tRef.current = t;
  const opportunitiesRequestRef = useRef<{
    token: string;
    promise: ReturnType<typeof getPublicOpportunitiesPage>;
  } | null>(null);
  const secondaryRequestRef = useRef<{
    token: string;
    promise: Promise<SecondaryData>;
  } | null>(null);
  const [opportunities, setOpportunities] = useState<PublicOpportunity[]>([]);
  const [commitments, setCommitments] = useState<TalentCommitment[]>([]);
  const [appliedOpportunityIds, setAppliedOpportunityIds] = useState<Set<string>>(new Set());
  const [selectedOpportunity, setSelectedOpportunity] = useState<PublicOpportunity | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSecondaryDataLoading, setIsSecondaryDataLoading] = useState(true);
  const [error, setError] = useState("");
  const [secondaryError, setSecondaryError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submittingOpportunityId, setSubmittingOpportunityId] = useState("");
  const [loadingDetailId, setLoadingDetailId] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    specialty: ALL_FILTER,
    location: ANY_FILTER,
    modality: ALL_FILTER,
  });
  const missingTitle = t("talent.opportunities.fallbackTitle");
  const missingProject = t("talent.opportunities.fallbackProject");
  const translationTexts = useMemo(
    () =>
      combineTranslationTexts(
        [],
        opportunities.flatMap((opportunity) => [
          getOpportunityTitle(opportunity, missingTitle),
          getProjectLabel(opportunity, missingProject),
          opportunity.role_needed,
          opportunity.specialty,
          opportunity.description,
          opportunity.location,
          formatModality(opportunity.modality, t),
          opportunity.status,
          ...(opportunity.requirements ?? []),
        ])
      ),
    [missingProject, missingTitle, opportunities, t]
  );
  const { tAuto } = useAutoTranslate(translationTexts, language, token);

  useEffect(() => {
    if (isProfileLoading) {
      setIsLoading(true);
      return;
    }

    if (!user || !profile || !token) {
      setError("");
      setSecondaryError("");
      setIsLoading(false);
      setIsSecondaryDataLoading(false);
      return;
    }

    let isMounted = true;
    const authenticatedToken = token;

    if (opportunitiesRequestRef.current?.token !== authenticatedToken) {
      opportunitiesRequestRef.current = {
        token: authenticatedToken,
        promise: getPublicOpportunitiesPage(null, authenticatedToken),
      };
    }

    async function loadSecondaryData() {
      if (secondaryRequestRef.current?.token !== authenticatedToken) {
        secondaryRequestRef.current = {
          token: authenticatedToken,
          promise: Promise.allSettled([
            getMyApplications(authenticatedToken),
            getMyTalentCommitments(authenticatedToken),
          ]).then(([applications, commitments]) => ({ applications, commitments })),
        };
      }

      setIsSecondaryDataLoading(true);
      const { applications, commitments } = await secondaryRequestRef.current.promise;

      if (!isMounted) {
        return;
      }

      const failedResources: string[] = [];

      if (applications.status === "fulfilled") {
        setAppliedOpportunityIds(
          new Set(applications.value.map((application) => application.opportunity_id))
        );
      } else {
        failedResources.push(tRef.current("talent.opportunities.applicationsResource"));
      }

      if (commitments.status === "fulfilled") {
        setCommitments(commitments.value);
      } else {
        failedResources.push(tRef.current("talent.opportunities.commitmentsResource"));
      }

      setSecondaryError(
        failedResources.length
          ? tRef.current("talent.opportunities.secondaryLoadError", {
              resources: failedResources.join(", "),
            })
          : ""
      );
      setIsSecondaryDataLoading(false);
    }

    async function loadOpportunities() {
      try {
        setIsLoading(true);
        setError("");
        setSuccessMessage("");
        const nextOpportunities = await opportunitiesRequestRef.current!.promise;

        if (!isMounted) {
          return;
        }

        setOpportunities(nextOpportunities.items);
        setNextCursor(nextOpportunities.next_cursor);
        setIsLoading(false);
        void loadSecondaryData();
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : tRef.current("talent.errors.loadOpportunities")
          );
          setIsLoading(false);
        }
      }
    }

    void loadOpportunities();

    return () => {
      isMounted = false;
    };
  }, [isProfileLoading, profile, token, user]);

  useEffect(() => {
    if (!selectedOpportunity) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedOpportunity(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedOpportunity]);

  const specialties = useMemo(() => {
    const values = new Set(
      opportunities
        .map((opportunity) => opportunity.specialty?.trim())
        .filter((value): value is string => Boolean(value))
    );

    return [ALL_FILTER, ...Array.from(values)];
  }, [opportunities]);

  const locations = useMemo(() => {
    const values = new Set(
      opportunities
        .map((opportunity) => opportunity.location?.trim())
        .filter((value): value is string => Boolean(value))
    );

    return [ANY_FILTER, ...Array.from(values)];
  }, [opportunities]);

  const modalities = useMemo(() => {
    const values = new Set(
      opportunities
        .map((opportunity) => opportunity.modality?.trim())
        .filter((value): value is string => Boolean(value))
    );

    return [ALL_FILTER, ...Array.from(values)];
  }, [opportunities]);

  const filteredOpportunities = useMemo(
    () =>
      opportunities.filter((opportunity) =>
        matchesFilter(
          opportunity,
          filters,
          t("talent.opportunities.fallbackTitle"),
          t("talent.opportunities.fallbackProject")
        )
      ),
    [filters, opportunities, t]
  );

  const handleFilterChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const handleApply = async (opportunity: PublicOpportunity) => {
    if (!token || isSecondaryDataLoading) {
      return;
    }

    if (hasDateConflict(opportunity, commitments)) {
      setError(t("talent.opportunities.dateConflict"));
      return;
    }

    try {
      setSubmittingOpportunityId(opportunity.id);
      setError("");
      setSuccessMessage("");
      await createApplication(
        {
          opportunity_id: opportunity.id,
          message: "",
        },
        token
      );
      setAppliedOpportunityIds((current) => new Set(current).add(opportunity.id));
      setSuccessMessage(t("talent.opportunities.success"));
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("talent.errors.sendApplication")
      );
    } finally {
      setSubmittingOpportunityId("");
    }
  };

  const handleViewDetail = async (opportunityId: string) => {
    try {
      setLoadingDetailId(opportunityId);
      setError("");
      const opportunityDetail = await getOpportunityById(opportunityId, token ?? undefined);
      setSelectedOpportunity(opportunityDetail);
    } catch (detailError) {
      setError(
        detailError instanceof Error
          ? detailError.message
          : t("talent.errors.loadOpportunityDetail")
      );
    } finally {
      setLoadingDetailId("");
    }
  };

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) {
      return;
    }

    try {
      setIsLoadingMore(true);
      setError("");
      const page = await getPublicOpportunitiesPage(nextCursor, token ?? undefined);

      setOpportunities((current) => {
        const opportunityById = new Map(current.map((opportunity) => [opportunity.id, opportunity]));
        page.items.forEach((opportunity) => opportunityById.set(opportunity.id, opportunity));
        return Array.from(opportunityById.values());
      });
      setNextCursor(page.next_cursor);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t("talent.errors.loadOpportunities")
      );
    } finally {
      setIsLoadingMore(false);
    }
  };

  const renderApplicationButton = (opportunity: PublicOpportunity) => {
    const isApplied = appliedOpportunityIds.has(opportunity.id);
    const hasConflict = hasDateConflict(opportunity, commitments);
    const isSubmitting = submittingOpportunityId === opportunity.id;

    return (
      <button
        className={primaryButtonClass}
        type="button"
        disabled={!token || isSecondaryDataLoading || isApplied || hasConflict || isSubmitting}
        onClick={() => void handleApply(opportunity)}
      >
        {isSecondaryDataLoading
          ? t("talent.opportunities.verifying")
          : isApplied
          ? t("talent.opportunities.applied")
          : hasConflict
            ? t("talent.opportunities.unavailableByDates")
            : isSubmitting
              ? t("talent.opportunities.applying")
              : t("talent.opportunities.apply")}
      </button>
    );
  };

  const renderStatus = (opportunity: PublicOpportunity) => {
    if (isSecondaryDataLoading) {
      return (
        <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
          {t("talent.opportunities.verifying")}
        </span>
      );
    }

    const isApplied = appliedOpportunityIds.has(opportunity.id);
    const hasConflict = hasDateConflict(opportunity, commitments);
    const className = isApplied
      ? "bg-amber-100 text-amber-800"
      : hasConflict
        ? "bg-rose-100 text-rose-800"
        : "bg-emerald-100 text-emerald-800";
    const label = isApplied
      ? t("talent.opportunities.statusReview")
      : hasConflict
        ? t("talent.opportunities.statusUnavailableByDates")
        : t("talent.opportunities.statusOpen");

    return (
      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <section className={cardClass}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          {t("talent.opportunities.eyebrow")}
        </p>
        <h1 className="text-3xl font-bold leading-tight text-slate-900">
          {t("talent.opportunities.title")}
        </h1>
        <p className="mt-2 max-w-3xl leading-7 text-slate-600">
          {t("talent.opportunities.subtitle")}
        </p>
      </section>

      <section className={cardClass}>
        <h2 className="text-lg font-bold text-slate-900">{t("talent.opportunities.filters")}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {t("talent.opportunities.filtersText")}
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            <span>{t("talent.opportunities.search")}</span>
            <input
              className={inputClass}
              name="search"
              type="text"
              placeholder={t("talent.opportunities.searchPlaceholder")}
              value={filters.search}
              onChange={handleFilterChange}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            <span>{t("talent.opportunities.specialty")}</span>
            <select
              className={inputClass}
              name="specialty"
              value={filters.specialty}
              onChange={handleFilterChange}
            >
              {specialties.map((specialty) => (
                <option key={specialty} value={specialty}>
                  {specialty === ALL_FILTER ? t("talent.opportunities.filterAll") : specialty}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            <span>{t("talent.opportunities.location")}</span>
            <select
              className={inputClass}
              name="location"
              value={filters.location}
              onChange={handleFilterChange}
            >
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location === ANY_FILTER ? t("talent.opportunities.filterAny") : location}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            <span>{t("talent.opportunities.modality")}</span>
            <select
              className={inputClass}
              name="modality"
              value={filters.modality}
              onChange={handleFilterChange}
            >
              {modalities.map((modality) => (
                <option key={modality} value={modality}>
                  {modality === ALL_FILTER
                    ? t("talent.opportunities.filterAll")
                    : formatModality(modality, t)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
      {successMessage ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </p>
      ) : null}
      {secondaryError ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {secondaryError}
        </p>
      ) : null}

      {isLoading ? (
        <section className={cardClass}>
          <p className="text-sm text-slate-600">{t("talent.opportunities.loading")}</p>
        </section>
      ) : filteredOpportunities.length === 0 ? (
        <section className={cardClass}>
          <p className="text-sm text-slate-600">{t("talent.opportunities.empty")}</p>
        </section>
      ) : (
        <section className={`${cardClass} overflow-hidden p-0 sm:p-0`}>
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t("talent.opportunities.call")}</th>
                  <th className="px-4 py-3 font-semibold">{t("talent.opportunities.project")}</th>
                  <th className="px-4 py-3 font-semibold">{t("talent.opportunities.specialty")}</th>
                  <th className="px-4 py-3 font-semibold">{t("talent.opportunities.location")}</th>
                  <th className="px-4 py-3 font-semibold">{t("talent.opportunities.modality")}</th>
                  <th className="px-4 py-3 font-semibold">{t("talent.opportunities.status")}</th>
                  <th className="px-4 py-3 font-semibold">{t("talent.opportunities.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredOpportunities.map((opportunity) => (
                  <tr className="bg-white align-middle transition hover:bg-slate-50" key={opportunity.id}>
                    <td className="px-4 py-4 font-semibold text-slate-900">
                      {tAuto(getOpportunityTitle(opportunity, t("talent.opportunities.fallbackTitle")))}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {tAuto(getProjectLabel(opportunity, t("talent.opportunities.fallbackProject")))}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{opportunity.specialty ? tAuto(opportunity.specialty) : "-"}</td>
                    <td className="px-4 py-4 text-slate-600">{opportunity.location ? tAuto(opportunity.location) : "-"}</td>
                    <td className="px-4 py-4 text-slate-600">
                      {tAuto(formatModality(opportunity.modality, t))}
                    </td>
                    <td className="px-4 py-4">{renderStatus(opportunity)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          className={secondaryButtonClass}
                          type="button"
                          disabled={loadingDetailId === opportunity.id}
                          onClick={() => void handleViewDetail(opportunity.id)}
                        >
                          {loadingDetailId === opportunity.id
                            ? t("common.loading")
                            : t("talent.opportunities.showDetail")}
                        </button>
                        {renderApplicationButton(opportunity)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {nextCursor ? (
            <div className="flex justify-center border-t border-slate-200 bg-slate-50 px-4 py-4">
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={isLoadingMore}
                onClick={() => void handleLoadMore()}
              >
                {isLoadingMore
                  ? t("talent.opportunities.loadingMore")
                  : t("talent.opportunities.loadMore")}
              </button>
            </div>
          ) : null}
        </section>
      )}

      {selectedOpportunity ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setSelectedOpportunity(null);
            }
          }}
        >
          <section
            aria-labelledby="opportunity-detail-title"
            aria-modal="true"
            className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-7"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {t("talent.opportunities.detail")}
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900" id="opportunity-detail-title">
                  {tAuto(getOpportunityTitle(
                    selectedOpportunity,
                    t("talent.opportunities.fallbackTitle")
                  ))}
                </h2>
              </div>
              {renderStatus(selectedOpportunity)}
            </div>

            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                [t("talent.opportunities.project"), tAuto(getProjectLabel(selectedOpportunity, t("talent.opportunities.fallbackProject")))],
                [t("talent.opportunities.roleNeeded"), selectedOpportunity.role_needed ? tAuto(selectedOpportunity.role_needed) : t("talent.opportunities.undefinedRole")],
                [t("talent.opportunities.specialty"), selectedOpportunity.specialty ? tAuto(selectedOpportunity.specialty) : "-"],
                [t("talent.opportunities.location"), selectedOpportunity.location ? tAuto(selectedOpportunity.location) : t("talent.opportunities.pendingLocation")],
                [t("talent.opportunities.modality"), tAuto(formatModality(selectedOpportunity.modality, t))],
                [t("talent.opportunities.deadline"), formatDate(selectedOpportunity.deadline, i18n.language, t("talent.opportunities.noDeadline"))],
              ].map(([label, value]) => (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5" key={label}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5">
              <h3 className="text-sm font-bold text-slate-900">{t("talent.opportunities.description")}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {selectedOpportunity.description
                  ? tAuto(selectedOpportunity.description)
                  : t("talent.opportunities.noDescription")}
              </p>
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-bold text-slate-900">{t("talent.opportunities.requirements")}</h3>
              {selectedOpportunity.requirements?.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
                  {selectedOpportunity.requirements.map((requirement) => (
                    <li key={requirement}>{tAuto(requirement)}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-600">{t("talent.opportunities.noRequirements")}</p>
              )}
            </div>

            <div className="mt-7 flex flex-wrap justify-end gap-2">
              <button
                className={secondaryButtonClass}
                type="button"
                onClick={() => setSelectedOpportunity(null)}
              >
                {t("common.close")}
              </button>
              {renderApplicationButton(selectedOpportunity)}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export default TalentOpportunities;
