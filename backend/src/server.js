// backend/src/server.js
const express = require("express");
const cors = require("cors");
const { loadOntology, searchConcepts } = require("./ontologyLoader");

// *** NUEVO: para manejar archivos y rutas (caché DBpedia)
const fs = require("fs");
const path = require("path");

// *** NUEVO: carpeta donde se guardará la caché de DBpedia
const CACHE_DIR = path.join(__dirname, "../data/cache");

// *** NUEVO: crear carpeta si no existe
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Cargar la ontología
loadOntology();

/**
 * Healthcheck
 */
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "API Web Semántica funcionando ✅" });
});

/**
 * Búsqueda LOCAL
 */
app.get("/api/search", (req, res) => {
  const q = req.query.q || "";
  const results = searchConcepts(q);
  res.json({ query: q, count: results.length, results });
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

  if (!q) return res.json({ query: q, count: 0, results: [] });

  try {
    const results = await searchDBpedia(q, tokens);
    res.json({ query: q, count: results.length, results });
  } catch (err) {
    console.error("Error en DBpedia:", err);
    res.status(500).json({ error: "Error consultando DBpedia" });
  }
});

// ===========================================================
//   FUNCIÓN searchDBpedia()  — CON TODOS LOS COMENTARIOS
// ===========================================================

async function searchDBpedia(query, tokens = []) {
  const DBPEDIA_ENDPOINT = "https://dbpedia.org/sparql";

  // ---------------------------------------------------------
  //  Mapeo ES → EN
  // Ayuda a traducir palabras veterinarias al inglés
  // ---------------------------------------------------------
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
    afeccion: "disease",
    cirugia: "surgery",
    cirugía: "surgery",
    tratamiento: "treatment",
    parasito: "parasite",
    parásito: "parasite",

    veterinaria: "veterinary",
    veterinario: "veterinary",

    //  NUEVO — para búsquedas como "doctor"
    doctor: "veterinarian",
    doctores: "veterinarian",
    medico: "veterinarian",
    médico: "veterinarian",
  };

  const qNorm = query.toLowerCase().trim();

  // *** NUEVO: ruta del archivo de caché para este término normalizado
  const cacheFile = path.join(CACHE_DIR, `${qNorm}.json`);

  // Traducción de tokens
  let searchTokens = tokens.map(
    (t) => termTranslations[t.toLowerCase()] || t.toLowerCase()
  );

  // Si no enviaron tokens, usar la expresión principal
  if (searchTokens.length === 0) {
    const translated = termTranslations[qNorm] || qNorm;
    searchTokens = [translated];
  }

  // ---------------------------------------------------------
  //  Filtro SPARQL para buscar en labels y abstracts
  // ---------------------------------------------------------
  const filterConditions = searchTokens
    .map(
      (token) => `
        CONTAINS(LCASE(STR(?label)),    LCASE("${token}")) ||
        CONTAINS(LCASE(STR(?abstract)), LCASE("${token}"))
      `
    )
    .join(" || ");

  // Consulta SPARQL
  const sparqlQuery = `
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX dbo:  <http://dbpedia.org/ontology/>

    SELECT DISTINCT ?item ?label ?thumbnail ?abstract
    WHERE {
      ?item rdfs:label ?label .
      FILTER(LANG(?label) = "en")

      OPTIONAL { ?item dbo:abstract ?abstract . FILTER(LANG(?abstract)="en") }
      OPTIONAL { ?item dbo:thumbnail ?thumbnail . }

      FILTER( ${filterConditions} )
    }
    LIMIT 80
  `;

  const results = [];

  // ---------------------------------------------------------
  //  FILTROS VETERINARIOS (POST-PROCESAMIENTO EN JS)
  // ---------------------------------------------------------

  // 1️ Palabras que DEMUESTRAN que el contenido es veterinario
  const vetWordBoundaryTerms = [
    "dog",
    "cat",
    "canine",
    "feline",
    "animal",
    "breed",
  ];

  const vetSubstringTerms = [
    "disease",
    "infection",
    "virus",
    "bacteria",
    "parasite",
    "vaccine",
    "vaccination",
    "pathogen",
    "syndrome",
    "condition",
    "veterinary",
    "veterinarian",
    "rabies",
    "distemper",
    "parvovirus",
  ];

  // 2️ Palabras PROHIBIDAS para filtrar basura:
  //    (personas, políticos, jugadores, actores, música, TV…)
  const forbiddenPatterns = [
    /politician/i,
    /footballer/i,
    /basketball/i,
    /wrestler/i,
    /boxer/i,
    /player/i,
    /club/i,
    /team/i,
    /singer/i,
    /musician/i,
    /band/i,
    /album/i,
    /song/i,
    /actor/i,
    /actress/i,
    /film/i,
    /movie/i,
    /television/i,
    /tv series/i,
    /episode/i,
    /character/i,
    /cartoon/i,
    /comic/i,
    /poet/i,
    /writer/i,
    /lawyer/i,
    /president/i,
    /minister/i,
  ];

  try {
    // ======================================================
    //   CASO NORMAL: hay internet → consultamos DBpedia
    // ======================================================
    const response = await fetch(DBPEDIA_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: `query=${encodeURIComponent(sparqlQuery)}`,
    });

    if (!response.ok) {
      throw new Error(`DBpedia devolvió estado ${response.status}`);
    }

    const data = await response.json();
    const bindings = data.results?.bindings || [];

    for (const binding of bindings) {
      const uri = binding.item?.value;
      const label = binding.label?.value || uri?.split("/").pop() || "";
      const thumbnail = binding.thumbnail?.value;
      let descripcion = binding.abstract?.value || "Descripción no disponible";

      const text = (label + " " + descripcion).toLowerCase();

      // 1️ Si contiene palabras prohibidas → se descarta
      if (forbiddenPatterns.some((p) => p.test(text))) continue;

      // 2️ Si NO contiene nada veterinario → se descarta
      const hasBoundary = vetWordBoundaryTerms.some((w) =>
        new RegExp(`\\b${w}\\b`).test(text)
      );
      const hasSubstring = vetSubstringTerms.some((w) => text.includes(w));

      if (!(hasBoundary || hasSubstring)) continue;

      // ✔ Si llegó aquí → es veterinario
      results.push({
        uri,
        dbpedia_uri: uri,
        nombre: label,
        descripcion,
        thumbnail,
        atributos: {},
      });
    }

    // *** NUEVO: guardar en caché SOLO cuando la consulta fue exitosa
    try {
      const top3 = results.slice(0, 3); // máximo 3 resultados
      fs.writeFileSync(cacheFile, JSON.stringify(top3, null, 2), "utf-8");
      console.log("💾 Caché DBpedia guardado para:", qNorm);
    } catch (e) {
      console.error("Error guardando caché DBpedia:", e);
    }

    // *** CAMBIO: con internet devolvemos TODOS los resultados filtrados
    return results;
  } catch (err) {
    // ======================================================
    //   CASO SIN INTERNET / ERROR: usar la caché si existe
    // ======================================================
    console.error("Error consultando DBpedia:", err);

    if (fs.existsSync(cacheFile)) {
      try {
        console.log("📦 Usando caché DBpedia (sin internet) para:", qNorm);
        const cached = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
        return cached; // aquí normalmente vienen esos 3 resultados guardados
      } catch (e) {
        console.error("Error leyendo caché DBpedia:", e);
      }
    }

    // Si tampoco hay caché, devolvemos lista vacía
    return [];
  }
}

// Iniciar servidor
app.listen(PORT, () =>
  console.log(`🚀 Backend escuchando en http://localhost:${PORT}`)
);
