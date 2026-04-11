import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithEmail, loginWithGoogle } from "../service/auth";
import { registerUser, syncGoogleUser } from "../service/authApi";
import { USER_ROLE_OPTIONS, type UserRole } from "../types/auth";
import "../styles/register.css";

type StatusType = "idle" | "success" | "error";

function Register() {
  const navigate = useNavigate();
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
      setMessage("Debes seleccionar un rol para crear tu cuenta.");
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
      setMessage("Cuenta creada correctamente. Redirigiendo al inicio...");

      redirectTimeoutRef.current = window.setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "No pudimos crear la cuenta en este momento. Intenta nuevamente.";

      setStatus("error");
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async (): Promise<void> => {
    if (!role) {
      setStatus("error");
      setMessage("Debes seleccionar un rol antes de continuar con Google.");
      return;
    }

    setLoading(true);
    setMessage("");
    setStatus("idle");

    try {
      const credential = await loginWithGoogle();
      const googleName = credential.user.displayName?.trim() || "Usuario";
      const googleEmail = credential.user.email?.trim();

      if (!googleEmail) {
        throw new Error(
          "No pudimos obtener el correo de tu cuenta de Google. Intenta con otro metodo."
        );
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

      setStatus("success");
      setMessage("Cuenta creada correctamente. Redirigiendo al inicio...");

      redirectTimeoutRef.current = window.setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "No pudimos completar el registro con Google. Intenta nuevamente.";

      setStatus("error");
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="register-container">
      <section className="register-card" aria-label="Formulario de registro">
        <div className="register-header">
          <p className="register-eyebrow">Festival Flow</p>
          <h1 className="register-title">Crear cuenta</h1>
          <p className="register-subtitle">
            Registrate para comenzar a gestionar tus proyectos y festivales.
          </p>
        </div>

        <form className="register-form" onSubmit={handleRegister}>
          <label className="register-field">
            <span className="register-label">Nombre completo</span>
            <input
              className="register-input"
              type="text"
              placeholder="Tu nombre completo"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
              disabled={loading}
            />
          </label>

          <label className="register-field">
            <span className="register-label">Correo electronico</span>
            <input
              className="register-input"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              disabled={loading}
            />
          </label>

          <label className="register-field">
            <span className="register-label">Contrasena</span>
            <input
              className="register-input"
              type="password"
              placeholder="Crea una contrasena segura"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
              disabled={loading}
            />
          </label>

          <div className="register-role-group">
            <span className="register-label">Selecciona tu rol</span>
            <div
              className="register-role-options"
              role="radiogroup"
              aria-label="Seleccion de rol"
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
                  <span>{roleOption.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button className="register-button" type="submit" disabled={loading}>
            {loading ? "Procesando..." : "Registrarse"}
          </button>
        </form>

        <div className="register-divider" aria-hidden="true">
          <span>o</span>
        </div>

        <button
          className="register-google"
          type="button"
          onClick={handleGoogleRegister}
          disabled={loading}
        >
          {loading ? "Procesando..." : "Continuar con Google"}
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
          Ya tienes cuenta? Inicia sesion
        </button>
      </section>
    </main>
  );
}

export default Register;
