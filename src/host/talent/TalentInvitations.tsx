import { useEffect, useState } from "react";
import {
  getMyRecruitments,
  updateRecruitmentStatus,
  type RecruitmentResponse,
} from "../../service/recruitmentApi";
import "../../styles/talent.css";

function normalizeStatus(value?: string | null): string {
  return value?.trim().toUpperCase().replaceAll(" ", "_") ?? "";
}

function formatStatus(value?: string | null): string {
  const labels: Record<string, string> = {
    ACCEPTED: "Aceptada",
    PENDING: "Pendiente",
    REJECTED: "Rechazada",
  };
  const normalizedValue = normalizeStatus(value);

  return labels[normalizedValue] ?? value?.trim() ?? "Sin estado";
}

function getProjectTitle(recruitment: RecruitmentResponse): string {
  return (
    recruitment.project_title?.trim() ||
    recruitment.project?.title?.trim() ||
    "Proyecto no informado"
  );
}

function getOpportunityTitle(recruitment: RecruitmentResponse): string {
  return (
    recruitment.opportunity_title?.trim() ||
    recruitment.opportunity?.title?.trim() ||
    "Convocatoria no informada"
  );
}

function getProducerName(recruitment: RecruitmentResponse): string {
  return (
    recruitment.producer_name?.trim() ||
    recruitment.producer?.name?.trim() ||
    recruitment.producer?.display_name?.trim() ||
    recruitment.producer_email?.trim() ||
    "Productor no informado"
  );
}

function TalentInvitations() {
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
              : "No se pudieron cargar tus invitaciones."
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
  }, []);

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
        status === "ACCEPTED" ? "Invitación aceptada." : "Invitación rechazada."
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "No se pudo actualizar la invitación."
      );
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <div className="talent-page">
      <section className="talent-card talent-banner">
        <div>
          <p className="talent-page__eyebrow">Invitaciones</p>
          <h1 className="talent-page__title">Invitaciones de reclutamiento</h1>
          <p className="talent-page__subtitle">
            Revisa propuestas enviadas por productores y responde las pendientes.
          </p>
        </div>
      </section>

      {error ? <p className="talent-feedback talent-feedback--error">{error}</p> : null}
      {successMessage ? (
        <p className="talent-feedback talent-feedback--success">{successMessage}</p>
      ) : null}

      {isLoading ? (
        <section className="talent-card">
          <p className="talent-feedback">Cargando invitaciones...</p>
        </section>
      ) : invitations.length === 0 ? (
        <section className="talent-card">
          <p className="talent-feedback">No tienes invitaciones de reclutamiento.</p>
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
                    <h2 className="talent-list__title">{getProjectTitle(invitation)}</h2>
                    <p className="talent-list__meta">
                      {getOpportunityTitle(invitation)} | {getProducerName(invitation)}
                    </p>
                  </div>
                  <span className="talent-badge">{formatStatus(invitation.status)}</span>
                </div>

                <p className="talent-list__text">
                  Mensaje: {invitation.message?.trim() || "Sin mensaje."}
                </p>

                {isPending ? (
                  <div className="talent-actions talent-actions--inline">
                    <button
                      className="talent-button talent-button--primary"
                      type="button"
                      disabled={!invitationId || updatingId === invitationId}
                      onClick={() => void handleUpdateStatus(invitationId, "ACCEPTED")}
                    >
                      {updatingId === invitationId ? "Actualizando..." : "Aceptar"}
                    </button>
                    <button
                      className="talent-button"
                      type="button"
                      disabled={!invitationId || updatingId === invitationId}
                      onClick={() => void handleUpdateStatus(invitationId, "REJECTED")}
                    >
                      Rechazar
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
