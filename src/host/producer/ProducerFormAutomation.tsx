import { useState } from "react";
import {
  FiAlertTriangle,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiCode,
  FiCopy,
  FiGlobe,
  FiInfo,
  FiKey,
  FiLoader,
  FiLock,
  FiTable,
  FiUser,
  FiZap,
} from "react-icons/fi";
import {
  scraperExtractForm,
  scraperGenerateUnifiedForm,
  scraperLogin,
} from "../../service/scraperApi";
import type { ExtractFormResponse, UnifiedFormResponse } from "../../service/scraperApi";
import { useCurrentProfile } from "../useCurrentProfile";
import ProducerGuard from "./ProducerGuard";

type LoginStatus = "idle" | "ok" | "captcha" | "failed";
type ExtractStatus = "idle" | "done" | "error";

function ProducerFormAutomationContent() {
  const { token } = useCurrentProfile();
  const [loginUrl, setLoginUrl] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [credentialsSent, setCredentialsSent] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loginStatus, setLoginStatus] = useState<LoginStatus>("idle");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [extractStatus, setExtractStatus] = useState<ExtractStatus>("idle");
  const [extractError, setExtractError] = useState("");
  const [extractLoading, setExtractLoading] = useState(false);
  const [extractedForm, setExtractedForm] = useState<ExtractFormResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [unifiedForm, setUnifiedForm] = useState<UnifiedFormResponse | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  const handleTestAccess = async () => {
    if (!loginUrl || !targetUrl || !username || !password) return;
    setLoginLoading(true);
    setLoginStatus("idle");
    setLoginError("");
    try {
      const result = await scraperLogin({
        login_url: loginUrl,
        target_url: targetUrl,
        username,
        password,
      });
      setPassword("");
      setCredentialsSent(true);
      if (result.status === "LOGIN_OK") {
        setSessionId(result.session_id);
        setLoginStatus("ok");
      } else if (result.status === "CAPTCHA_REQUIRED") {
        setLoginStatus("captcha");
      } else {
        setLoginStatus("failed");
        setLoginError(result.message);
      }
    } catch (err) {
      setPassword("");
      setCredentialsSent(true);
      setLoginStatus("failed");
      setLoginError(
        err instanceof Error ? err.message : "Error de red. Verifica la conexión."
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handleExtractForm = async () => {
    if (!targetUrl) return;
    setExtractLoading(true);
    setExtractStatus("idle");
    setExtractError("");
    try {
      const payload: { target_url: string; session_id?: string } = {
        target_url: targetUrl,
      };
      if (sessionId) payload.session_id = sessionId;
      const result = await scraperExtractForm(payload);
      setExtractedForm(result);
      setExtractStatus("done");
    } catch (err) {
      setExtractStatus("error");
      setExtractError(
        err instanceof Error ? err.message : "Error de red. Verifica la conexión."
      );
    } finally {
      setExtractLoading(false);
    }
  };

  const handleCopyJson = async () => {
    if (!extractedForm) return;
    await navigator.clipboard.writeText(JSON.stringify(extractedForm, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToAI = async () => {
    if (!extractedForm || !token) return;
    setAiLoading(true);
    setAiError("");
    setUnifiedForm(null);
    setExpandedSections(new Set());
    try {
      const result = await scraperGenerateUnifiedForm(
        { source_url: extractedForm.url, fields: extractedForm.fields },
        token
      );
      setUnifiedForm(result);
      setExpandedSections(new Set(result.form.sections.map((_, i) => i)));
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Error al generar formulario con IA.");
    } finally {
      setAiLoading(false);
    }
  };

  const toggleSection = (index: number) => {
    setExpandedSections((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6 pb-10 text-[var(--text-primary)]">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">
          Automatización
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          Automatización de Formularios
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          Ingresa tus credenciales para autenticarte en plataformas externas,
          extrae campos de formularios y prepara el envío automático con IA.
        </p>
      </header>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300">
        <FiLock className="mt-0.5 shrink-0" />
        <p>
          Las credenciales se usan solo para iniciar sesión en la plataforma
          destino y no se almacenan ni se muestran nuevamente tras el envío.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <h2 className="mb-5 text-lg font-extrabold">Credenciales y URLs</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <FiGlobe /> URL de Login
            </span>
            <input
              className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              type="url"
              placeholder="https://plataforma.com/login"
              value={loginUrl}
              onChange={(e) => setLoginUrl(e.target.value)}
              disabled={loginLoading}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <FiGlobe /> URL Formulario objetivo
            </span>
            <input
              className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              type="url"
              placeholder="https://plataforma.com/submit"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              disabled={loginLoading}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <FiUser /> Usuario / Email
            </span>
            <input
              className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              type="text"
              placeholder="usuario@email.com"
              value={username}
              autoComplete="username"
              onChange={(e) => setUsername(e.target.value)}
              disabled={loginLoading}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <FiKey /> Contraseña
            </span>
            <input
              className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              type="password"
              placeholder={credentialsSent ? "Contraseña enviada" : "Contraseña"}
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              disabled={loginLoading}
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={loginLoading || !loginUrl || !targetUrl || !username || !password}
            onClick={() => void handleTestAccess()}
          >
            {loginLoading ? <FiLoader className="animate-spin" /> : <FiCheck />}
            {loginLoading ? "Probando acceso..." : "Probar acceso"}
          </button>

          <button
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm font-bold transition hover:border-blue-300 hover:bg-[var(--hover-bg)] disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={extractLoading || !targetUrl}
            title={
              !sessionId
                ? "Sin session_id — puede fallar si la página requiere autenticación"
                : undefined
            }
            onClick={() => void handleExtractForm()}
          >
            {extractLoading ? (
              <FiLoader className="animate-spin" />
            ) : (
              <FiTable />
            )}
            {extractLoading ? "Extrayendo..." : "Extraer formulario"}
          </button>
        </div>

        {!sessionId && targetUrl ? (
          <p className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <FiInfo className="shrink-0" />
            Sin sesión activa — la extracción puede fallar si la página requiere
            autenticación.
          </p>
        ) : null}
      </div>

      {loginStatus === "ok" ? (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">
            <FiCheck />
          </span>
          Acceso correcto. Sesión iniciada correctamente.
        </div>
      ) : null}

      {loginStatus === "captcha" ? (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300">
          <FiAlertTriangle className="shrink-0" />
          La página requiere captcha. La automatización no puede completarse en
          este caso.
        </div>
      ) : null}

      {loginStatus === "failed" ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
          <FiAlertTriangle className="mt-0.5 shrink-0" />
          <span>
            Error al iniciar sesión:{" "}
            {loginError || "Credenciales inválidas o URL incorrecta."}
          </span>
        </div>
      ) : null}

      {extractStatus === "error" ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
          <FiAlertTriangle className="mt-0.5 shrink-0" />
          <span>Error al extraer el formulario: {extractError}</span>
        </div>
      ) : null}

      {extractedForm ? (
        <>
          <section className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-[var(--shadow-soft)]">
            <div className="flex flex-col gap-3 border-b border-[var(--border-color)] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-extrabold">Campos extraídos</h2>
                <p className="text-sm text-[var(--text-muted)]">
                  {extractedForm.fields.length} campo
                  {extractedForm.fields.length !== 1 ? "s" : ""} en{" "}
                  <span className="font-mono text-xs break-all">
                    {extractedForm.url}
                  </span>
                </p>
              </div>
              <button
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                disabled={aiLoading || !token}
                onClick={() => void handleSendToAI()}
              >
                {aiLoading ? <FiLoader className="animate-spin" /> : <FiZap />}
                {aiLoading ? "Generando..." : "Enviar a IA"}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <thead className="bg-[var(--bg-secondary)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3">Label</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Tag</th>
                    <th className="px-4 py-3">Requerido</th>
                    <th className="px-4 py-3">Placeholder</th>
                    <th className="px-4 py-3">Opciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {extractedForm.fields.map((field, index) => (
                    <tr
                      key={`${field.name}-${index}`}
                      className="transition hover:bg-[var(--hover-bg)]"
                    >
                      <td className="px-4 py-3 font-semibold">
                        {field.label || "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">
                        {field.name || "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">
                        {field.id || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-lg bg-[var(--bg-secondary)] px-2 py-1 font-mono text-xs">
                          {field.type || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-lg bg-blue-100 px-2 py-1 font-mono text-xs font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                          {field.tag || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {field.required ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <FiCheck /> Sí
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">
                        {field.placeholder || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {field.options && field.options.length > 0 ? (
                          <span className="rounded-full bg-[var(--bg-secondary)] px-2 py-0.5 text-xs font-bold">
                            {field.options.length} opcs.
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--border-color)] p-5">
              <div className="flex items-center gap-2">
                <FiCode className="text-blue-600 dark:text-blue-300" />
                <h2 className="text-lg font-extrabold">JSON extraído</h2>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2 text-sm font-bold transition hover:bg-[var(--hover-bg)]"
                type="button"
                onClick={() => void handleCopyJson()}
              >
                {copied ? (
                  <FiCheck className="text-emerald-600" />
                ) : (
                  <FiCopy />
                )}
                {copied ? "¡Copiado!" : "Copiar JSON"}
              </button>
            </div>
            <pre className="max-h-96 overflow-auto p-5 font-mono text-xs leading-relaxed text-[var(--text-secondary)]">
              {JSON.stringify(extractedForm, null, 2)}
            </pre>
          </section>
        </>
      ) : null}

      {aiError ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
          <FiAlertTriangle className="mt-0.5 shrink-0" />
          <span>Error al generar formulario con IA: {aiError}</span>
        </div>
      ) : null}

      {unifiedForm ? (
        <section className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-[var(--shadow-soft)]">
          <div className="border-b border-[var(--border-color)] p-5">
            <div className="flex items-center gap-2">
              <FiZap className="text-blue-600 dark:text-blue-300" />
              <h2 className="text-lg font-extrabold">{unifiedForm.form.title}</h2>
            </div>
            {unifiedForm.form.description ? (
              <p className="mt-1 text-sm text-[var(--text-muted)]">{unifiedForm.form.description}</p>
            ) : null}
          </div>

          <div className="divide-y divide-[var(--border-color)]">
            {unifiedForm.form.sections.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-[var(--hover-bg)]"
                  onClick={() => toggleSection(sectionIndex)}
                >
                  <span className="text-sm font-bold">{section.title}</span>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    {section.fields.length} campo{section.fields.length !== 1 ? "s" : ""}
                    {expandedSections.has(sectionIndex) ? (
                      <FiChevronDown className="text-[var(--text-secondary)]" />
                    ) : (
                      <FiChevronRight className="text-[var(--text-secondary)]" />
                    )}
                  </span>
                </button>

                {expandedSections.has(sectionIndex) ? (
                  <div className="overflow-x-auto border-t border-[var(--border-color)]">
                    <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                      <thead className="bg-[var(--bg-secondary)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                        <tr>
                          <th className="px-4 py-3">Label</th>
                          <th className="px-4 py-3">Key</th>
                          <th className="px-4 py-3">Tipo</th>
                          <th className="px-4 py-3">Requerido</th>
                          <th className="px-4 py-3">Opciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)]">
                        {section.fields.map((field, fieldIndex) => (
                          <tr
                            key={`${field.key}-${fieldIndex}`}
                            className="transition hover:bg-[var(--hover-bg)]"
                          >
                            <td className="px-4 py-3 font-semibold">{field.label}</td>
                            <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">
                              {field.key}
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded-lg bg-[var(--bg-secondary)] px-2 py-1 font-mono text-xs">
                                {field.type}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {field.required ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  <FiCheck /> Sí
                                </span>
                              ) : (
                                <span className="text-[var(--text-muted)]">No</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {field.options.length > 0 ? (
                                <span className="rounded-full bg-[var(--bg-secondary)] px-2 py-0.5 text-xs font-bold">
                                  {field.options.length} opcs.
                                </span>
                              ) : (
                                <span className="text-[var(--text-muted)]">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function ProducerFormAutomation() {
  return (
    <ProducerGuard>
      <ProducerFormAutomationContent />
    </ProducerGuard>
  );
}

export default ProducerFormAutomation;
