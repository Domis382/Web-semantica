export async function buscarDBpedia(q, tokens) {
  const params = new URLSearchParams({
    q,
    tokens: tokens.join(","),
  });

  const res = await fetch(`http://localhost:4000/api/search-dbpedia?${params}`);
  return res.json();
}
