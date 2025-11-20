const API_URL = "http://localhost:4000/api";

export async function checkHealth() {
  const res = await fetch(`${API_URL}/health`);
  if (!res.ok) throw new Error("Error al conectar con el backend");
  return res.json();
}
