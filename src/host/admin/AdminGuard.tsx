import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCurrentProfile } from "../useCurrentProfile";

type AdminGuardProps = {
  children: ReactNode;
};

function AdminGuard({ children }: AdminGuardProps) {
  const { user, token, role, isProfileLoading } = useCurrentProfile();

  if (isProfileLoading || (user && !token)) {
    return (
      <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 shadow-[var(--shadow-soft)]">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-28 rounded-full bg-slate-200" />
          <div className="h-8 w-64 rounded-xl bg-slate-200" />
          <div className="h-4 w-full max-w-xl rounded-full bg-slate-200" />
        </div>
      </section>
    );
  }

  if (!user || !token || role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default AdminGuard;
