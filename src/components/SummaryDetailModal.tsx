import type { ReactNode } from "react";
import { useAutoTranslate, useFestivalFlowLanguage } from "../hooks/useAutoTranslate";
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

const CLICKABLE_CARD_TEXTS = ["Ver detalle"];
const SUMMARY_MODAL_TEXTS = ["Cerrar"];

export function ClickableSummaryCard({
  className,
  onClick,
  children,
}: ClickableSummaryCardProps) {
  const language = useFestivalFlowLanguage();
  const { tAuto } = useAutoTranslate(CLICKABLE_CARD_TEXTS, language);

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
      <span className="summary-detail-trigger__hint">{tAuto("Ver detalle")}</span>
    </article>
  );
}

export function SummaryDetailModal({
  title,
  description,
  onClose,
  children,
}: SummaryDetailModalProps) {
  const language = useFestivalFlowLanguage();
  const { tAuto } = useAutoTranslate(SUMMARY_MODAL_TEXTS, language);

  return (
    <div className="summary-detail-modal" role="dialog" aria-modal="true" aria-label={title}>
      <section className="summary-detail-modal__panel">
        <header className="summary-detail-modal__header">
          <div>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button className="summary-detail-modal__close" type="button" onClick={onClose}>
            {tAuto("Cerrar")}
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
