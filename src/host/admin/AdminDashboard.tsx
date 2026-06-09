import { FiArrowRight, FiFilm } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import AdminGuard from "./AdminGuard";

function AdminDashboardContent() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6 text-[var(--text-primary)]">
      <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-7 shadow-[var(--shadow-soft)]">
        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--text-muted)]">
          ADMIN
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Dashboard Administrativo
        </h1>
        <p className="mt-2 max-w-2xl leading-7 text-[var(--text-secondary)]">
          Administra el catálogo de festivales y sus estados desde un único lugar.
        </p>
      </section>

      <button
        className="group flex w-full max-w-xl items-center justify-between gap-5 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 text-left shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg"
        type="button"
        onClick={() => navigate("/admin/festivals")}
      >
        <span className="flex items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-100 text-xl text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            <FiFilm aria-hidden="true" />
          </span>
          <span>
            <strong className="block text-lg">Gestión de Festivales</strong>
            <span className="mt-1 block text-sm text-[var(--text-muted)]">
              Importar, revisar y editar festivales.
            </span>
          </span>
        </span>
        <FiArrowRight
          className="shrink-0 text-xl text-blue-600 transition group-hover:translate-x-1"
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

function AdminDashboard() {
  return (
    <AdminGuard>
      <AdminDashboardContent />
    </AdminGuard>
  );
}

export default AdminDashboard;
