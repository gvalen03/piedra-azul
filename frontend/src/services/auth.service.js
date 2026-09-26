const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000/api";

export async function login(credentials) {
  const response = await fetch(
    `${API_URL}/auth/login`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(credentials)
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
      "No fue posible iniciar sesión"
    );
  }

  return data;
}