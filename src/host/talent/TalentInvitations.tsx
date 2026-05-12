import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getMyRecruitments,
  updateRecruitmentStatus,
  type RecruitmentResponse,
} from "../../service/recruitmentApi";
import { translateStatus } from "../../utils/translateStatus";
import "../../styles/talent.css";

function normalizeStatus(value?: string | null): string {
  return value?.trim().toUpperCase().replaceAll(" ", "_") ?? "";
}

function getProjectTitle(recruitment: RecruitmentResponse, fallback: string): string {
  return (
    recruitment.project_title?.trim() ||
    recruitment.project?.title?.trim() ||
    fallback
  );
}

function getOpportunityTitle(recruitment: RecruitmentResponse, fallback: string): string {
  return (
    recruitment.opportunity_title?.trim() ||
    recruitment.opportunity?.title?.trim() ||
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

function TalentInvitations() {
  const { t } = useTranslation();
  const [invitations, setInvitations] = useState<RecruitmentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadInvitations() {
      try {
        setError("");
        setIsLoading(true);
        const nextInvitations = await getMyRecruitments();

        if (isMounted) {
          setInvitations(nextInvitations);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : t("talent.invitationsPage.errors.load")
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInvitations();

    return () => {
      isMounted = false;
    };
  }, [t]);

  const handleUpdateStatus = async (
    recruitmentId: string,
    status: "ACCEPTED" | "REJECTED"
  ) => {
    try {
      setUpdatingId(recruitmentId);
      setError("");
      setSuccessMessage("");
      const updatedRecruitment = await updateRecruitmentStatus(recruitmentId, status);

      setInvitations((current) =>
        current.map((invitation) =>
          invitation.id === recruitmentId
            ? { ...invitation, ...updatedRecruitment, id: recruitmentId, status }
            : invitation
        )
      );
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

  return (
    <div className="talent-page">
      <section className="talent-card talent-banner">
        <div>
          <p className="talent-page__eyebrow">{t("talent.invitationsPage.eyebrow")}</p>
          <h1 className="talent-page__title">{t("talent.invitationsPage.title")}</h1>
          <p className="talent-page__subtitle">
            {t("talent.invitationsPage.subtitle")}
          </p>
        </div>
      </section>

      {error ? <p className="talent-feedback talent-feedback--error">{error}</p> : null}
      {successMessage ? (
        <p className="talent-feedback talent-feedback--success">{successMessage}</p>
      ) : null}

      {isLoading ? (
        <section className="talent-card">
          <p className="talent-feedback">{t("talent.invitationsPage.loading")}</p>
        </section>
      ) : invitations.length === 0 ? (
        <section className="talent-card">
          <p className="talent-feedback">{t("talent.invitationsPage.empty")}</p>
        </section>
      ) : (
        <section className="talent-list">
          {invitations.map((invitation, index) => {
            const invitationId = invitation.id ?? "";
            const isPending = normalizeStatus(invitation.status) === "PENDING";

            return (
              <article
                key={invitation.id ?? `${invitation.project_id}-${index}`}
                className="talent-card talent-application-card"
              >
                <div className="talent-application-card__top">
                  <div>
                    <h2 className="talent-list__title">
                      {getProjectTitle(invitation, t("crew.projectMissing"))}
                    </h2>
                    <p className="talent-list__meta">
                      {getOpportunityTitle(invitation, t("crew.opportunityMissing"))} |{" "}
                      {getProducerName(invitation, t("crew.producerMissing"))}
                    </p>
                  </div>
                  <span className="talent-badge">{translateStatus(t, invitation.status)}</span>
                </div>

                <p className="talent-list__text">
                  {t("messages.messageLabel", {
                    value: invitation.message?.trim() || t("messages.noMessage"),
                  })}
                </p>

                {isPending ? (
                  <div className="talent-actions talent-actions--inline">
                    <button
                      className="talent-button talent-button--primary"
                      type="button"
                      disabled={!invitationId || updatingId === invitationId}
                      onClick={() => void handleUpdateStatus(invitationId, "ACCEPTED")}
                    >
                      {updatingId === invitationId ? t("common.updating") : t("common.accept")}
                    </button>
                    <button
                      className="talent-button"
                      type="button"
                      disabled={!invitationId || updatingId === invitationId}
                      onClick={() => void handleUpdateStatus(invitationId, "REJECTED")}
                    >
                      {t("common.reject")}
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

export default TalentInvitations;
