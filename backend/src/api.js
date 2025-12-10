const API_URL = "http://localhost:4000";

export async function buscarOntologia(q, lang = "es") {
  const url = `${API_URL}/api/search?q=${encodeURIComponent(q)}&lang=${lang}`;
  const res = await fetch(url);
  return res.json();
}

export async function buscarDBpedia(q, tokens = [], lang = "es") {
  const url =
    `${API_URL}/api/search-dbpedia?q=${encodeURIComponent(q)}` +
    `&tokens=${encodeURIComponent(tokens.join(","))}` +
    `&lang=${lang}`;
  const res = await fetch(url);
  return res.json();
}
