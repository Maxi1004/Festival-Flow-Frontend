import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithEmail, loginWithGoogle } from "../service/auth";
import "../styles/login.css";

type StatusType = "idle" | "success" | "error";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [status, setStatus] = useState<StatusType>("idle");
  const [loading, setLoading] = useState<boolean>(false);

  const handleEmailLogin = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setStatus("idle");

    try {
      const credential = await loginWithEmail(email.trim(), password);

      await credential.user.getIdToken();

      setStatus("success");
      setMessage("Inicio de sesión exitoso.");
      navigate("/");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "No fue posible iniciar sesión. Inténtalo nuevamente.";

      setStatus("error");
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (): Promise<void> => {
    setLoading(true);
    setMessage("");
    setStatus("idle");

    try {
      const credential = await loginWithGoogle();

      await credential.user.getIdToken();

      setStatus("success");
      setMessage("Sesión con Google iniciada correctamente.");
      navigate("/");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "No fue posible iniciar sesión con Google. Inténtalo nuevamente.";

      setStatus("error");
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-container">
      <section className="login-card" aria-label="Formulario de inicio de sesion">
        <div className="login-header">
          <p className="login-eyebrow">Festival Flow</p>
          <h1 className="login-title">Iniciar sesion</h1>
          <p className="login-subtitle">
            Accede a tu panel para gestionar tu experiencia.
          </p>
        </div>

        <form className="login-form" onSubmit={handleEmailLogin}>
          <label className="login-field">
            <span className="login-label">Correo electronico</span>
            <input
              className="login-input"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              disabled={loading}
            />
          </label>

          <label className="login-field">
            <span className="login-label">Contrasena</span>
            <input
              className="login-input"
              type="password"
              placeholder="Ingresa tu contrasena"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
            />
          </label>

          <button className="login-button" type="submit" disabled={loading}>
            {loading ? "Cargando..." : "Iniciar sesion"}
          </button>
        </form>

        <div className="login-divider" aria-hidden="true">
          <span>o</span>
        </div>

        <button
          className="login-google"
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? "Procesando..." : "Continuar con Google"}
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
          No tienes cuenta? Registrate
        </button>
      </section>
    </main>
  );
}

export default Login;