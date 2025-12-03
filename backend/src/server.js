// backend/src/server.js
const express = require("express");
const cors = require("cors");
const { loadOntology, searchConcepts } = require("./ontologyLoader");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Cargar la ontología al arrancar
loadOntology();

/**
 * Healthcheck simple para probar conexión desde el frontend
 */
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "API Web Semántica funcionando ✅" });
});

/**
 * Búsqueda local sobre la ontología veterinaria
 */
app.get("/api/search", (req, res) => {
  const q = req.query.q || "";
  const results = searchConcepts(q);

  res.json({
    query: q,
    count: results.length,
    results,
  });
});
/**
 * Búsqueda en DBpedia
 */
app.get("/api/search-dbpedia", async (req, res) => {
  const q = req.query.q || "";
  const tokens = (req.query.tokens || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (!q) {
    return res.json({ query: q, count: 0, results: [] });
  }

  try {
    const results = await searchDBpedia(q, tokens);
    res.json({ query: q, count: results.length, results });
  } catch (err) {
    console.error("Error en DBpedia:", err);
    res.status(500).json({
      error: "Error al consultar DBpedia",
      details: err.message,
    });
  }
});

// ==========================
//  FUNCIÓN searchDBpedia()
// ==========================

async function searchDBpedia(query, tokens = []) {
  const DBPEDIA_ENDPOINT = "https://dbpedia.org/sparql";

  // Traducciones útiles ES -> EN para armar mejor la búsqueda
  const termTranslations = {
    perro: "dog",
    perros: "dog",
    canino: "dog",
    caninos: "dog",
    gato: "cat",
    gatos: "cat",
    felino: "cat",
    felinos: "cat",
    caballo: "horse",
    caballos: "horse",
    vaca: "cow",
    vacas: "cattle",
    cerdo: "pig",
    cerdos: "pig",
    oveja: "sheep",
    ovejas: "sheep",

    vacuna: "vaccine",
    vacunas: "vaccine",
    rabia: "rabies",
    parvovirus: "parvovirus",
    moquillo: "distemper",
    enfermedad: "disease",
    enfermedades: "disease",
    afección: "disease",
    cirugía: "surgery",
    esterilización: "spay",
    ovario: "ovary",
    pulga: "flea",
    garrapata: "tick",
    veterinaria: "veterinary",
    veterinario: "veterinary",
    tratamiento: "treatment",
  };

  // Palabras que indican que el usuario está buscando una ESPECIE
  const speciesTerms = [
    "perro",
    "perros",
    "canino",
    "caninos",
    "gato",
    "gatos",
    "felino",
    "felinos",
    "vaca",
    "vacas",
    "caballo",
    "caballos",
    "cerdo",
    "cerdos",
    "oveja",
    "ovejas",
  ];

  const qNorm = query.toLowerCase().trim();
  const isSpeciesQuery = speciesTerms.includes(qNorm);

  // Tokens traducidos a EN
  const searchTokens = tokens.map(
    (t) => termTranslations[t.toLowerCase()] || t
  );

  // Si no hay tokens, usamos el query traducido
  if (searchTokens.length === 0) {
    const translated = termTranslations[qNorm] || query;
    searchTokens.push(translated);
  }

  // Filtro básico en SPARQL: label contiene alguno de los tokens
  const filterConditions = searchTokens
    .map((token) => `CONTAINS(LCASE(?label), LCASE("${token}"))`)
    .join(" || ");

  const sparqlQuery = `
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX dbo:  <http://dbpedia.org/ontology/>

    SELECT DISTINCT ?item ?label ?thumbnail ?abstract
    WHERE {
      ?item rdfs:label ?label .
      FILTER(LANG(?label) = "en")

      OPTIONAL { ?item dbo:thumbnail ?thumbnail . }
      OPTIONAL { ?item dbo:abstract  ?abstract  . FILTER(LANG(?abstract) = "en") }

      FILTER(${filterConditions})
    }
    LIMIT 40
  `;

  const results = [];

  try {
    const response = await fetch(DBPEDIA_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: `query=${encodeURIComponent(sparqlQuery)}`,
    });

    if (!response.ok) {
      throw new Error(`DBpedia returned ${response.status}`);
    }

    const data = await response.json();
    const bindings = data.results?.bindings || [];

    // ---------------------------
    //  POST-FILTRADO EN JS
    // ---------------------------

    // 1) Patrones para excluir personas/cosas que no queremos
    const forbiddenPatterns = [
      // Profesiones humanas
      /politician/i,
      /footballer/i,
      /basketball/i,
      /actress?/i,
      /actor/i,
      /singer/i,
      /musician/i,
      /writer/i,
      /novelist/i,
      /poet/i,

      // Entretenimiento: películas, shows, música
      /film/i,
      /movie/i,
      /album/i,
      /song/i,
      /band/i,
      /player/i,
      /club/i,
      /team/i,

      // Ficción, TV, animación, episodios, series
      /television/i,
      /tv series/i,
      /\bseries\b/i,
      /episode/i,
      /animated/i,
      /animation/i,
      /fictional/i,
      /fiction/i,
      /character/i,
      /cartoon/i,
      /show/i,
      /network/i,
      /nickelodeon/i,
      /toon/i,
      /season/i,
      /cast/i,
      /voice actor/i,
    ];

    // 2) Palabras que sí o sí queremos en enfermedades/temas médicos
    const mustContain = [
      "dog",
      "canine",
      "animal",
      "mammal",
      "disease",
      "infection",
      "virus",
      "bacteria",
      "vaccine",
      "breed",
      "symptom",
      "veterinary",
      "parasite",
      "pathogen",
      "syndrome",
      "condition",
      "treatment",
      "therapy",
    ];

    // 3) Palabras permitidas cuando la intención es ESPECIE
    const allowedForSpecies = ["dog", "canine", "animal", "breed"];

    for (const binding of bindings) {
      const uri = binding.item?.value;
      const label = binding.label?.value || uri?.split("/").pop() || "";
      const thumbnail = binding.thumbnail?.value;
      let descripcion = binding.abstract?.value || "Descripción no disponible";

      if (descripcion.length > 400) {
        descripcion = descripcion.substring(0, 397) + "...";
      }

      const labelLower = label.toLowerCase();
      const descLower = descripcion.toLowerCase();

      // a) Excluir por patrones claros de personas/música/deportes
      const matchesForbiddenPattern = forbiddenPatterns.some(
        (pat) => pat.test(labelLower) || pat.test(descLower)
      );
      if (matchesForbiddenPattern) continue;

      if (isSpeciesQuery) {
        // -------------------------
        //  MODO ESPECIE (perro/gato)
        // -------------------------
        const isAllowedForSpecies = allowedForSpecies.some(
          (w) =>
            new RegExp(`\\b${w}\\b`, "i").test(labelLower) ||
            new RegExp(`\\b${w}\\b`, "i").test(descLower)
        );

        if (!isAllowedForSpecies) continue;
      } else {
        // -------------------------
        //  MODO ENFERMEDAD / MÉDICO
        // -------------------------
        const containsVetContext = mustContain.some(
          (w) => labelLower.includes(w) || descLower.includes(w)
        );
        if (!containsVetContext) continue;
      }

      // Si pasa todos los filtros, lo agregamos
      results.push({
        uri,
        dbpedia_uri: uri,
        nombre: label,
        descripcion,
        thumbnail,
        atributos: {}, // para no mostrar la URI en bruto en la UI
      });
    }

    console.log(
      "🐶 DBpedia RESULTS:",
      results.map((r) => r.nombre)
    );
  } catch (err) {
    console.error("Error consultando DBpedia:", err);
  }

  return results;
}

// ==========================

app.listen(PORT, () => {
  console.log(`🚀 Backend escuchando en http://localhost:${PORT}`);
});
