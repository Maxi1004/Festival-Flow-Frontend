import { Navigate } from "react-router-dom";
import { useCurrentProfile } from "./useCurrentProfile";
import "../styles/home.css";

function Home() {
  const { user, profile, isProfileLoading } = useCurrentProfile();

  if (isProfileLoading) {
    return (
      <div className="home">
        <section className="home__hero">
          <div>
            <h1 className="home__title">Cargando perfil...</h1>
            <p className="home__subtitle">Estamos preparando tu panel principal.</p>
          </div>
        </section>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="home">
        <section className="home__hero">
          <div>
            <h1 className="home__title">Inicia sesion para continuar</h1>
            <p className="home__subtitle">
              Tu panel se personalizara segun el rol asociado a tu cuenta.
            </p>
          </div>
        </section>
      </div>
    );
  }

  if (profile?.role === "TALENT") {
    return <Navigate to="/talent" replace />;
  }

  if (profile?.role === "PRODUCER") {
    return <Navigate to="/producer" replace />;
  }

  return (
    <div className="home">
      <section className="home__hero">
        <div>
          <h1 className="home__title">No encontramos un rol disponible</h1>
          <p className="home__subtitle">
            Intenta cerrar sesion y volver a entrar para refrescar tu perfil.
          </p>
        </div>
      </section>
    </div>
  );
}

export default Home;
