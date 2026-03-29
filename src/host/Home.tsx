import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import { getProfile } from "../service/authapi";
import "../styles/home.css";

const summaryCards = [
  { value: "12", label: "Proyectos activos" },
  { value: "24", label: "Miembros del equipo" },
  { value: "08", label: "Postulaciones" },
];

const recentActivity = [
  'Se actualizo el proyecto "Luz de Medianoche".',
  "Ana Torres se unio al equipo de produccion.",
  "Se envio una nueva postulacion al Festival Solaris.",
];

const quickActions = ["Crear proyecto", "Buscar equipo", "Ver reportes"];

function Home() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      console.log("Usuario autenticado:", firebaseUser);

      if (firebaseUser) {
        try {
          const profile = await getProfile();
          console.log("Respuesta /auth/me:", profile);
        } catch (error) {
          console.error("Error al obtener /auth/me:", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="home">
      <section className="home__hero">
        <div>
          <h1 className="home__title">Bienvenido de nuevo</h1>
          <p className="home__subtitle">
            Revisa el estado general de tu trabajo y organiza los siguientes pasos
            desde un solo lugar.
          </p>
          <p className="home__subtitle">
            Usuario actual: {user?.email ?? "No autenticado"}
          </p>
        </div>
      </section>

      <section className="home__section">
        <div className="section-heading">
          <h2 className="section-heading__title">Resumen</h2>
          <p className="section-heading__text">
            Un vistazo rapido a la operacion de hoy.
          </p>
        </div>

        <div className="summary-grid">
          {summaryCards.map((card) => (
            <article key={card.label} className="summary-card">
              <span className="summary-card__value">{card.value}</span>
              <p className="summary-card__label">{card.label}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home__grid">
        <article className="panel">
          <div className="section-heading">
            <h2 className="section-heading__title">Actividad reciente</h2>
            <p className="section-heading__text">
              Ultimos movimientos dentro de la plataforma.
            </p>
          </div>

          <ul className="activity-list">
            {recentActivity.map((item) => (
              <li key={item} className="activity-list__item">
                {item}
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <div className="section-heading">
            <h2 className="section-heading__title">Acciones rapidas</h2>
            <p className="section-heading__text">
              Atajos para mantener el flujo de trabajo en movimiento.
            </p>
          </div>

          <div className="actions">
            {quickActions.map((action) => (
              <button key={action} className="actions__button" type="button">
                {action}
              </button>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

export default Home;