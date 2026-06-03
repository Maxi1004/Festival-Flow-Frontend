import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/useAuth";
import { syncGoogleUser } from "../service/authApi";
import { USER_ROLE_OPTIONS, type UserRole } from "../types/auth";
import "../styles/login.css";

type StatusType = "idle" | "success" | "error";

function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loginWithEmail, loginWithGoogle, refreshProfile } = useAuth();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [googleRole, setGoogleRole] = useState<UserRole | "">("");
  const [message, setMessage] = useState<string>("");
  const [status, setStatus] = useState<StatusType>("idle");
  const [loading, setLoading] = useState<boolean>(false);

  const handleEmailLogin = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setStatus("idle");

    try {
      const credential = await loginWithEmail(email.trim(), password);

      await credential.user.getIdToken();

      setStatus("success");
      setMessage(t("auth.login.success"));
      navigate("/");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : t("auth.login.error");

      setStatus("error");
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (): Promise<void> => {
    if (!googleRole) {
      setStatus("error");
      setMessage(t("auth.login.roleRequired"));
      return;
    }

    setLoading(true);
    setMessage("");
    setStatus("idle");

    try {
      const credential = await loginWithGoogle();
      const name = credential.user.displayName?.trim() || t("common.user");
      const email = credential.user.email?.trim();

      if (!email) {
        throw new Error(t("auth.login.googleEmailError"));
      }

      await syncGoogleUser({
        uid: credential.user.uid,
        name,
        email,
        picture: credential.user.photoURL?.trim() || "",
        provider: "google",
        role: googleRole,
      });

      await credential.user.getIdToken();
      await refreshProfile();

      setStatus("success");
      setMessage(t("auth.login.googleSuccess"));
      navigate("/");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : t("auth.login.googleError");

      setStatus("error");
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-container">
      <section className="login-card" aria-label={t("auth.login.aria")}>
        <div className="login-header">
          <p className="login-eyebrow">{t("common.brand")}</p>
          <h1 className="login-title">{t("auth.login.title")}</h1>
          <p className="login-subtitle">{t("auth.login.subtitle")}</p>
        </div>

        <form className="login-form" onSubmit={handleEmailLogin}>
          <label className="login-field">
            <span className="login-label">{t("auth.email")}</span>
            <input
              className="login-input"
              type="email"
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              disabled={loading}
            />
          </label>

          <label className="login-field">
            <span className="login-label">{t("auth.password")}</span>
            <input
              className="login-input"
              type="password"
              placeholder={t("auth.passwordPlaceholder")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
            />
          </label>

          <button className="login-button" type="submit" disabled={loading}>
            {loading ? t("common.loading") : t("auth.login.button")}
          </button>
        </form>

        <div className="login-divider" aria-hidden="true">
          <span>{t("auth.or")}</span>
        </div>

        <div className="login-role-group">
          <span className="login-label">{t("auth.login.googleRole")}</span>
          <div
            className="login-role-options"
            role="radiogroup"
            aria-label={t("auth.login.roleAria")}
          >
            {USER_ROLE_OPTIONS.map((roleOption) => (
              <label key={roleOption.value} className="login-role-option">
                <input
                  type="radio"
                  name="google-role"
                  value={roleOption.value}
                  checked={googleRole === roleOption.value}
                  onChange={() => setGoogleRole(roleOption.value)}
                  disabled={loading}
                />
                <span>{t(`roles.${roleOption.value}`)}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          className="login-google"
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? t("common.processing") : t("auth.login.googleButton")}
        </button>

        {message ? (
          <p
            className={`login-message ${
              status === "success" ? "is-success" : "is-error"
            }`}
            role="status"
          >
            {message}
          </p>
        ) : null}

        <button
          className="login-link"
          type="button"
          onClick={() => navigate("/register")}
          disabled={loading}
        >
          {t("auth.login.registerLink")}
        </button>
      </section>
    </main>
  );
}

export default Login;
