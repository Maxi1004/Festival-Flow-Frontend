import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCurrentProfile } from "./useCurrentProfile";
import "../styles/home.css";

function Home() {
  const { t } = useTranslation();
  const { user, role, isProfileLoading } = useCurrentProfile();

  if (isProfileLoading) {
    return (
      <div className="home">
        <section className="home__hero">
          <div>
            <h1 className="home__title">{t("home.loadingTitle")}</h1>
            <p className="home__subtitle">{t("home.loadingSubtitle")}</p>
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
            <h1 className="home__title">{t("home.loginTitle")}</h1>
            <p className="home__subtitle">{t("home.loginSubtitle")}</p>
          </div>
        </section>
      </div>
    );
  }

  if (role === "TALENT") {
    return <Navigate to="/talent" replace />;
  }

  if (role === "PRODUCER") {
    return <Navigate to="/producer" replace />;
  }

  if (role === "ADMIN") {
    return <Navigate to="/admin/festivals" replace />;
  }

  return (
    <div className="home">
      <section className="home__hero">
        <div>
          <h1 className="home__title">{t("home.missingRoleTitle")}</h1>
          <p className="home__subtitle">{t("home.missingRoleSubtitle")}</p>
        </div>
      </section>
    </div>
  );
}

export default Home;
