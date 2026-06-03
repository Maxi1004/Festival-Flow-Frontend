import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCurrentProfile } from "../useCurrentProfile";

type ProducerGuardProps = {
  children: ReactNode;
};

function ProducerGuard({ children }: ProducerGuardProps) {
  const { t } = useTranslation();
  const { user, token, profile, isProfileLoading } = useCurrentProfile();

  if (isProfileLoading || (user && !token)) {
    return (
      <section className="producer-shell">
        <article className="producer-card producer-empty">
          <h1 className="producer-card__title">{t("producer.guard.loadingTitle")}</h1>
          <p className="producer-card__text">{t("producer.guard.loadingText")}</p>
        </article>
      </section>
    );
  }

  if (!user || !token || profile?.role !== "PRODUCER") {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProducerGuard;
