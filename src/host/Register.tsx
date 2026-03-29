import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase/config";
import { loginWithEmail } from "../service/auth";
import "../styles/register.css";



type StatusType = "idle" | "success" | "error";

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

type ApiErrorDetailObject = {
  message?: string;
};

type ApiErrorDetailArrayItem = {
  msg?: string;
};

type ApiErrorResponse = {
  detail?: string | ApiErrorDetailObject | ApiErrorDetailArrayItem[];
  message?: string;
};

const API_URL = import.meta.env.VITE_API_URL;
const REGISTER_ENDPOINT = `${API_URL}/auth/register`;

async function syncGoogleUser(data: {
  uid: string;
  name: string;
  email: string;
}) {
  const response = await fetch(`${API_URL}/auth/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("No se pudo sincronizar el usuario con el backend");
  }

  return await response.json();
}

function Register() {
  const navigate = useNavigate();
  const redirectTimeoutRef = useRef<number | null>(null);

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
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

  const getErrorMessage = async (response: Response): Promise<string> => {
    try {
      const errorData = (await response.json()) as ApiErrorResponse;

      if (typeof errorData.detail === "string" && errorData.detail.trim()) {
        return errorData.detail;
      }

      if (Array.isArray(errorData.detail)) {
        const firstError = errorData.detail[0];
        if (firstError?.msg && typeof firstError.msg === "string") {
          return firstError.msg;
        }
      }

      if (
        typeof errorData.detail === "object" &&
        errorData.detail !== null &&
        !Array.isArray(errorData.detail) &&
        "message" in errorData.detail &&
        typeof errorData.detail.message === "string" &&
        errorData.detail.message.trim()
      ) {
        return errorData.detail.message;
      }

      if (typeof errorData.message === "string" && errorData.message.trim()) {
        return errorData.message;
      }
    } catch {
      return "No pudimos crear la cuenta en este momento. Intenta nuevamente.";
    }

    return "No pudimos crear la cuenta en este momento. Intenta nuevamente.";
  };

  const registerUser = async (payload: RegisterPayload): Promise<void> => {
    const response = await fetch(REGISTER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response));
    }
  };

  const handleRegister = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setStatus("idle");

    try {
      await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
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
    setLoading(true);
    setMessage("");
    setStatus("idle");

    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
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
      });

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
