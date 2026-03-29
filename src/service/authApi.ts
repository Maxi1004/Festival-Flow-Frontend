import { getFirebaseToken } from "./auth";

export async function getProfile() {
  const token = await getFirebaseToken();

  if (!token) {
    throw new Error("No hay usuario autenticado");
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("ERROR BACKEND /auth/me:", errorData);
    throw new Error(errorData.detail || "No se pudo obtener el perfil");
  }

  return await response.json();
}