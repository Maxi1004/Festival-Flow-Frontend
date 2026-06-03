import type { ReactNode } from "react";
import "../styles/summary-detail.css";

type ClickableSummaryCardProps = {
  className: string;
  onClick: () => void;
  children: ReactNode;
};

type SummaryDetailModalProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

export function ClickableSummaryCard({
  className,
  onClick,
  children,
}: ClickableSummaryCardProps) {
  return (
    <article
      className={`${className} summary-detail-trigger`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      {children}
      <span className="summary-detail-trigger__hint">Ver detalle</span>
    </article>
  );
}

export function SummaryDetailModal({
  title,
  description,
  onClose,
  children,
}: SummaryDetailModalProps) {
  return (
    <div className="summary-detail-modal" role="dialog" aria-modal="true" aria-label={title}>
      <section className="summary-detail-modal__panel">
        <header className="summary-detail-modal__header">
          <div>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button className="summary-detail-modal__close" type="button" onClick={onClose}>
            Cerrar
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
