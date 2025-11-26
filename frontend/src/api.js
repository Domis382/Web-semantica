// frontend/src/api.js
const API_URL = "http://localhost:4000/api";

export async function buscarOntologia(query) {
  const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    throw new Error("Error al consultar el backend");
  }
  return res.json();
}

export async function buscarDBpedia(query, tokens = []) {
  // tokens es opcional; si se proporciona, se envía para mejorar búsqueda
  const params = new URLSearchParams({
    q: query,
    tokens: tokens.join(",")
  });
  
  const res = await fetch(`${API_URL}/search-dbpedia?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Error al consultar DBpedia");
  }
  return res.json();
}