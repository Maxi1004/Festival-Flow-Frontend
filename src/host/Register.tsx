import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/useAuth";
import { registerUser, syncGoogleUser } from "../service/authApi";
import { USER_ROLE_OPTIONS, type UserRole } from "../types/auth";
import "../styles/register.css";

type StatusType = "idle" | "success" | "error";

function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loginWithEmail, loginWithGoogle, refreshProfile } = useAuth();
  const redirectTimeoutRef = useRef<number | null>(null);

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [role, setRole] = useState<UserRole | "">("");
  const [message, setMessage] = useState<string>("");
  const [status, setStatus] = useState<StatusType>("idle");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current !== null) {
        window.clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  const handleRegister = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    if (!role) {
      setStatus("error");
      setMessage(t("auth.register.roleRequired"));
      return;
    }

    setLoading(true);
    setMessage("");
    setStatus("idle");

    try {
      await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });

      await loginWithEmail(email.trim(), password);

      setStatus("success");
      setMessage(t("auth.register.success"));

      redirectTimeoutRef.current = window.setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : t("auth.register.error");

      setStatus("error");
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async (): Promise<void> => {
    if (!role) {
      setStatus("error");
      setMessage(t("auth.register.googleRoleRequired"));
      return;
    }

    setLoading(true);
    setMessage("");
    setStatus("idle");

    try {
      const credential = await loginWithGoogle();
      const googleName = credential.user.displayName?.trim() || t("common.user");
      const googleEmail = credential.user.email?.trim();

      if (!googleEmail) {
        throw new Error(t("auth.login.googleEmailError"));
      }

      await syncGoogleUser({
        uid: credential.user.uid,
        name: googleName,
        email: googleEmail,
        picture: credential.user.photoURL?.trim() || "",
        provider: "google",
        role,
      });

      await credential.user.getIdToken();
      await refreshProfile();

      setStatus("success");
      setMessage(t("auth.register.success"));

      redirectTimeoutRef.current = window.setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : t("auth.register.googleError");

      setStatus("error");
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="register-container">
      <section className="register-card" aria-label={t("auth.register.aria")}>
        <div className="register-header">
          <p className="register-eyebrow">{t("common.brand")}</p>
          <h1 className="register-title">{t("auth.register.title")}</h1>
          <p className="register-subtitle">{t("auth.register.subtitle")}</p>
        </div>

        <form className="register-form" onSubmit={handleRegister}>
          <label className="register-field">
            <span className="register-label">{t("auth.register.name")}</span>
            <input
              className="register-input"
              type="text"
              placeholder={t("auth.register.namePlaceholder")}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
              disabled={loading}
            />
          </label>

          <label className="register-field">
            <span className="register-label">{t("auth.email")}</span>
            <input
              className="register-input"
              type="email"
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              disabled={loading}
            />
          </label>

          <label className="register-field">
            <span className="register-label">{t("auth.password")}</span>
            <input
              className="register-input"
              type="password"
              placeholder={t("auth.newPasswordPlaceholder")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
              disabled={loading}
            />
          </label>

          <div className="register-role-group">
            <span className="register-label">{t("auth.register.role")}</span>
            <div
              className="register-role-options"
              role="radiogroup"
              aria-label={t("auth.register.roleAria")}
            >
              {USER_ROLE_OPTIONS.map((roleOption) => (
                <label key={roleOption.value} className="register-role-option">
                  <input
                    type="radio"
                    name="role"
                    value={roleOption.value}
                    checked={role === roleOption.value}
                    onChange={() => setRole(roleOption.value)}
                    disabled={loading}
                  />
                  <span>{t(`roles.${roleOption.value}`)}</span>
                </label>
              ))}
            </div>
          </div>

          <button className="register-button" type="submit" disabled={loading}>
            {loading ? t("common.processing") : t("auth.register.button")}
          </button>
        </form>

        <div className="register-divider" aria-hidden="true">
          <span>{t("auth.or")}</span>
        </div>

        <button
          className="register-google"
          type="button"
          onClick={handleGoogleRegister}
          disabled={loading}
        >
          {loading ? t("common.processing") : t("auth.register.googleButton")}
        </button>

        {message ? (
          <p
            className={`register-message ${
              status === "success" ? "is-success" : "is-error"
            }`}
            role="status"
          >
            {message}
          </p>
        ) : null}

        <button
          className="register-link"
          type="button"
          onClick={() => navigate("/login")}
          disabled={loading}
        >
          {t("auth.register.loginLink")}
        </button>
      </section>
    </main>
  );
}

export default Register;
