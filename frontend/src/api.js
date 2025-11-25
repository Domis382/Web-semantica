// frontend/src/api.js
const API_URL = "http://localhost:4000/api";

export async function buscarOntologia(query) {
  const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    throw new Error("Error al consultar el backend");
  }
  return res.json();
}
