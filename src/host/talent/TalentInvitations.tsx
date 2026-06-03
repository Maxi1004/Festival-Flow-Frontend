import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SummaryDetailModal } from "../../components/SummaryDetailModal";
import {
  getMyRecruitmentsFeed,
  getMyRecruitmentsSummary,
  updateRecruitmentStatus,
  type RecruitmentResponse,
  type RecruitmentSummary,
} from "../../service/recruitmentApi";
import { reusePendingRequest } from "../../service/pendingRequest";
import { translateStatus } from "../../utils/translateStatus";
import { useCurrentProfile } from "../useCurrentProfile";
import { useAutoTranslate, useFestivalFlowLanguage } from "../../hooks/useAutoTranslate";
import { combineTranslationTexts } from "../../utils/translationTexts";
import "../../styles/talent.css";

const EMPTY_SUMMARY: RecruitmentSummary = {
  total: 0,
  pending: 0,
  accepted: 0,
  rejected: 0,
  cancelled: 0,
};

const talentInvitationsBaseTexts = [
  "No se pudo calcular el resumen.",
  "Total",
  "Pendientes",
  "Aceptadas",
  "Rechazadas",
  "Canceladas",
  "Ver detalle",
  "Resumen de invitaciones",
  "Calculando resumen...",
  "Bandeja profesional",
  "Seguimiento de invitaciones",
  "cargadas",
  "Proyecto",
  "Convocatoria",
  "Rol / Categoría",
  "Productor",
  "Estado",
  "Fecha",
  "Acciones",
  "Cargando...",
  "Cargar más",
  "Mensaje",
];

function normalizeStatus(value?: string | null): string {
  return value?.trim().toUpperCase().replaceAll(" ", "_") ?? "";
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
    timeStyle: "short",
  }).format(parsedDate);
}

function getProjectTitle(recruitment: RecruitmentResponse, fallback: string): string {
  return recruitment.project_title?.trim() || recruitment.project?.title?.trim() || fallback;
}

function getOpportunityTitle(recruitment: RecruitmentResponse, fallback: string): string {
  return recruitment.opportunity_title?.trim() || recruitment.opportunity?.title?.trim() || fallback;
}

function getRole(recruitment: RecruitmentResponse, fallback: string): string {
  return (
    recruitment.role?.trim() ||
    recruitment.category?.trim() ||
    recruitment.opportunity?.role_needed?.trim() ||
    recruitment.opportunity?.specialty?.trim() ||
    fallback
  );
}

function getProducerName(recruitment: RecruitmentResponse, fallback: string): string {
  return (
    recruitment.producer_name?.trim() ||
    recruitment.producer?.name?.trim() ||
    recruitment.producer?.display_name?.trim() ||
    recruitment.producer_email?.trim() ||
    fallback
  );
}

function appendUniqueRecruitments(
  current: RecruitmentResponse[],
  next: RecruitmentResponse[]
): RecruitmentResponse[] {
  const recruitmentsById = new Map(
    current.map((recruitment, index) => [recruitment.id ?? `${recruitment.project_id}-${index}`, recruitment])
  );

  next.forEach((recruitment, index) => {
    recruitmentsById.set(recruitment.id ?? `${recruitment.project_id}-${index}`, recruitment);
  });

  return Array.from(recruitmentsById.values());
}

function updateSummaryStatus(
  summary: RecruitmentSummary,
  previousStatus: string | undefined,
  nextStatus: "ACCEPTED" | "REJECTED"
): RecruitmentSummary {
  const previousKey = normalizeStatus(previousStatus).toLowerCase() as keyof RecruitmentSummary;
  const nextKey = nextStatus.toLowerCase() as keyof RecruitmentSummary;

  return {
    ...summary,
    ...(previousKey in summary ? { [previousKey]: Math.max(0, summary[previousKey] - 1) } : {}),
    [nextKey]: summary[nextKey] + 1,
  };
}

function TalentInvitations() {
  const { t, i18n } = useTranslation();
  const { user, token, profile, isProfileLoading } = useCurrentProfile();
  const language = useFestivalFlowLanguage();
  const tRef = useRef(t);
  tRef.current = t;
  const [invitations, setInvitations] = useState<RecruitmentResponse[]>([]);
  const [summary, setSummary] = useState<RecruitmentSummary>(EMPTY_SUMMARY);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedInvitation, setSelectedInvitation] = useState<RecruitmentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const missingValue = t("common.notProvided");
  const translationTexts = useMemo(
    () =>
      combineTranslationTexts(
        talentInvitationsBaseTexts,
        invitations.flatMap((invitation) => [
          getProjectTitle(invitation, missingValue),
          getOpportunityTitle(invitation, missingValue),
          getRole(invitation, missingValue),
          translateStatus(t, invitation.status, "talent.invitationsPage.noStatus"),
          invitation.message,
          invitation.opportunity?.specialty,
        ])
      ),
    [invitations, missingValue, t]
  );
  const { tAuto } = useAutoTranslate(translationTexts, language, token);

  useEffect(() => {
    if (isProfileLoading) {
      setIsLoading(true);
      return;
    }

    if (!user || !token || !profile) {
      setInvitations([]);
      setSummary(EMPTY_SUMMARY);
      setNextCursor(null);
      setError("");
      setSummaryError("");
      setIsLoading(false);
      setIsSummaryLoading(false);
      return;
    }

    let isMounted = true;
    const authenticatedToken = token;

    async function loadInvitations() {
      try {
        setIsLoading(true);
        setIsSummaryLoading(true);
        setError("");
        setSummaryError("");
        const feed = await reusePendingRequest(
          `talent-invitations-feed:${authenticatedToken}:initial`,
          () => getMyRecruitmentsFeed(null, authenticatedToken)
        );

        if (isMounted) {
          setInvitations(feed.items);
          setNextCursor(feed.next_cursor);
          setIsLoading(false);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : tRef.current("talent.invitationsPage.errors.load")
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }

      if (!isMounted) {
        return;
      }

      try {
        const nextSummary = await reusePendingRequest(
          `talent-invitations-summary:${authenticatedToken}`,
          () => getMyRecruitmentsSummary(authenticatedToken)
        );

        if (isMounted) {
          setSummary(nextSummary);
        }
      } catch {
        if (isMounted) {
          setSummaryError(tAuto("No se pudo calcular el resumen."));
        }
      } finally {
        if (isMounted) {
          setIsSummaryLoading(false);
        }
      }
    }

    void loadInvitations();

    return () => {
      isMounted = false;
    };
  }, [isProfileLoading, profile, token, user]);

  const handleUpdateStatus = async (
    recruitmentId: string,
    status: "ACCEPTED" | "REJECTED"
  ) => {
    const previousInvitation = invitations.find((invitation) => invitation.id === recruitmentId);

    try {
      setUpdatingId(recruitmentId);
      setError("");
      setSuccessMessage("");
      const updatedRecruitment = await updateRecruitmentStatus(recruitmentId, status, token ?? undefined);
      const nextInvitation = {
        ...previousInvitation,
        ...updatedRecruitment,
        id: recruitmentId,
        status,
      } as RecruitmentResponse;

      setInvitations((current) =>
        current.map((invitation) => invitation.id === recruitmentId ? nextInvitation : invitation)
      );
      setSelectedInvitation((current) => current?.id === recruitmentId ? nextInvitation : current);

      if (!isSummaryLoading && !summaryError) {
        setSummary((current) => updateSummaryStatus(current, previousInvitation?.status, status));
      }

      setSuccessMessage(
        status === "ACCEPTED"
          ? t("talent.invitationsPage.accepted")
          : t("talent.invitationsPage.rejected")
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : t("talent.invitationsPage.errors.update")
      );
    } finally {
      setUpdatingId("");
    }
  };

  const handleLoadMore = async () => {
    if (!nextCursor || !token || isLoadingMore) {
      return;
    }

    try {
      setIsLoadingMore(true);
      setError("");
      const cursor = nextCursor;
      const feed = await reusePendingRequest(
        `talent-invitations-feed:${token}:${cursor}`,
        () => getMyRecruitmentsFeed(cursor, token)
      );

      setInvitations((current) => appendUniqueRecruitments(current, feed.items));
      setNextCursor(feed.next_cursor);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t("talent.invitationsPage.errors.load")
      );
    } finally {
      setIsLoadingMore(false);
    }
  };

  const kpis: Array<[string, number]> = [
    [tAuto("Total"), summary.total],
    [tAuto("Pendientes"), summary.pending],
    [tAuto("Aceptadas"), summary.accepted],
    [tAuto("Rechazadas"), summary.rejected],
    [tAuto("Canceladas"), summary.cancelled],
  ];

  const renderActions = (invitation: RecruitmentResponse, showDetail = true) => {
    const invitationId = invitation.id ?? "";
    const isPending = normalizeStatus(invitation.status) === "PENDING";
    const isUpdating = updatingId === invitationId;

    return (
      <div className="talent-invitation-actions">
        {showDetail ? (
          <button
            className="talent-button talent-application-table__action"
            type="button"
            onClick={() => setSelectedInvitation(invitation)}
          >
            {tAuto("Ver detalle")}
          </button>
        ) : null}
        {isPending ? (
          <>
            <button
              className="talent-button talent-button--primary talent-application-table__action"
              type="button"
              disabled={!invitationId || isUpdating}
              onClick={() => void handleUpdateStatus(invitationId, "ACCEPTED")}
            >
              {isUpdating ? t("common.updating") : t("common.accept")}
            </button>
            <button
              className="talent-button talent-application-table__action"
              type="button"
              disabled={!invitationId || isUpdating}
              onClick={() => void handleUpdateStatus(invitationId, "REJECTED")}
            >
              {t("common.reject")}
            </button>
          </>
        ) : null}
      </div>
    );
  };

  return (
    <div className="talent-page talent-applications-page">
      <section className="talent-card talent-banner">
        <div>
          <p className="talent-page__eyebrow">{t("talent.invitationsPage.eyebrow")}</p>
          <h1 className="talent-page__title">{t("talent.invitationsPage.title")}</h1>
          <p className="talent-page__subtitle">{t("talent.invitationsPage.subtitle")}</p>
        </div>
      </section>

      <section className="talent-invitation-kpis" aria-label={tAuto("Resumen de invitaciones")}>
        {kpis.map(([label, value]) => (
          <article className="talent-card talent-application-kpi" key={label}>
            <span className={isSummaryLoading ? "talent-application-kpi__skeleton" : ""}>
              {isSummaryLoading ? null : summaryError ? "--" : value}
            </span>
            <p>{label}</p>
          </article>
        ))}
      </section>

      {isSummaryLoading ? <p className="talent-feedback">{tAuto("Calculando resumen...")}</p> : null}
      {summaryError ? <p className="talent-feedback talent-feedback--error">{summaryError}</p> : null}
      {error ? <p className="talent-feedback talent-feedback--error">{error}</p> : null}
      {successMessage ? <p className="talent-feedback talent-feedback--success">{successMessage}</p> : null}

      <section className="talent-card talent-application-crm">
        <div className="talent-application-crm__heading">
          <div>
            <p className="talent-page__eyebrow">{tAuto("Bandeja profesional")}</p>
            <h2>{tAuto("Seguimiento de invitaciones")}</h2>
          </div>
          <span>
            {summaryError
              ? `${invitations.length} ${tAuto("cargadas")}`
              : `${invitations.length} de ${isSummaryLoading ? "..." : summary.total}`}
          </span>
        </div>

        {isLoading ? (
          <p className="talent-feedback">{t("talent.invitationsPage.loading")}</p>
        ) : invitations.length === 0 ? (
          <p className="talent-feedback">{t("talent.invitationsPage.empty")}</p>
        ) : (
          <>
            <div className="talent-application-table-wrap">
              <table className="talent-application-table talent-invitation-table">
                <thead>
                  <tr>
                    <th>{tAuto("Proyecto")}</th>
                    <th>{tAuto("Convocatoria")}</th>
                    <th>{tAuto("Rol / Categoría")}</th>
                    <th>{tAuto("Productor")}</th>
                    <th>{tAuto("Estado")}</th>
                    <th>{tAuto("Fecha")}</th>
                    <th>{tAuto("Acciones")}</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((invitation, index) => (
                    <tr key={invitation.id ?? `${invitation.project_id}-${index}`}>
                      <td>{tAuto(getProjectTitle(invitation, t("crew.projectMissing")))}</td>
                      <td>{tAuto(getOpportunityTitle(invitation, t("crew.opportunityMissing")))}</td>
                      <td>{tAuto(getRole(invitation, t("crew.roleMissing")))}</td>
                      <td>{getProducerName(invitation, t("crew.producerMissing"))}</td>
                      <td>
                        <span className={`talent-application-status talent-application-status--${normalizeStatus(invitation.status).toLowerCase()}`}>
                          {tAuto(translateStatus(t, invitation.status))}
                        </span>
                      </td>
                      <td>{formatDate(invitation.created_at, i18n.language, missingValue)}</td>
                      <td>{renderActions(invitation)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {nextCursor ? (
              <div className="talent-application-crm__footer">
                <button
                  className="talent-button talent-button--primary"
                  type="button"
                  disabled={isLoadingMore}
                  onClick={() => void handleLoadMore()}
                >
                  {isLoadingMore ? tAuto("Cargando...") : tAuto("Cargar más")}
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      {selectedInvitation ? (
        <SummaryDetailModal
          title={tAuto(getProjectTitle(selectedInvitation, t("crew.projectMissing")))}
          description={tAuto(getOpportunityTitle(selectedInvitation, t("crew.opportunityMissing")))}
          onClose={() => setSelectedInvitation(null)}
        >
          <dl className="talent-application-detail">
            <div><dt>{tAuto("Proyecto")}</dt><dd>{tAuto(getProjectTitle(selectedInvitation, missingValue))}</dd></div>
            <div><dt>{tAuto("Convocatoria")}</dt><dd>{tAuto(getOpportunityTitle(selectedInvitation, missingValue))}</dd></div>
            <div><dt>{tAuto("Rol / Categoría")}</dt><dd>{tAuto(getRole(selectedInvitation, missingValue))}</dd></div>
            <div><dt>{tAuto("Productor")}</dt><dd>{getProducerName(selectedInvitation, missingValue)}</dd></div>
            <div><dt>{tAuto("Mensaje")}</dt><dd>{selectedInvitation.message?.trim() ? tAuto(selectedInvitation.message.trim()) : t("messages.noMessage")}</dd></div>
            <div><dt>{tAuto("Estado")}</dt><dd>{tAuto(translateStatus(t, selectedInvitation.status))}</dd></div>
            <div><dt>{tAuto("Fecha")}</dt><dd>{formatDate(selectedInvitation.created_at, i18n.language, missingValue)}</dd></div>
          </dl>
          {normalizeStatus(selectedInvitation.status) === "PENDING" ? (
            <div className="talent-invitation-modal__actions">
              {renderActions(selectedInvitation, false)}
            </div>
          ) : null}
        </SummaryDetailModal>
      ) : null}
    </div>
  );
}

export default TalentInvitations;
