import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCurrentProfile } from "../useCurrentProfile";

type ProducerGuardProps = {
  children: ReactNode;
};

function ProducerGuard({ children }: ProducerGuardProps) {
  const { user, profile, isProfileLoading } = useCurrentProfile();

  if (isProfileLoading) {
    return (
      <section className="producer-shell">
        <article className="producer-card producer-empty">
          <h1 className="producer-card__title">Cargando perfil...</h1>
          <p className="producer-card__text">Estamos preparando tu espacio de produccion.</p>
        </article>
      </section>
    );
  }

  if (!user || profile?.role !== "PRODUCER") {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProducerGuard;
