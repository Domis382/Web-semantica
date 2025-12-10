export async function buscarOntologia(q, lang = "es") {
  return fetch(
    `${API_URL}/api/search?q=${encodeURIComponent(q)}&lang=${lang}`
  ).then((r) => r.json());
}

export async function buscarDBpedia(q, tokens = [], lang = "es") {
  return fetch(
    `${API_URL}/api/search-dbpedia?q=${encodeURIComponent(
      q
    )}&tokens=${encodeURIComponent(tokens.join(","))}&lang=${lang}`
  ).then((r) => r.json());
}
