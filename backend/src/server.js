const express = require("express");
const cors = require("cors");
const { loadOntology, searchConcepts } = require("./ontologyLoader");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Cargar la ontología al arrancar
loadOntology();

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "API Web Semántica funcionando ✅" });
});

// Endpoint de búsqueda local
app.get("/api/search", (req, res) => {
  const q = req.query.q || "";
  const results = searchConcepts(q);
  res.json({ query: q, count: results.length, results });
});

// Endpoint de búsqueda en DBpedia
app.get("/api/search-dbpedia", async (req, res) => {
  const q = req.query.q || "";
  const tokens = (req.query.tokens || "").split(",").filter(t => t.trim());
  
  if (!q) {
    return res.json({ query: q, count: 0, results: [] });
  }

  try {
    const results = await searchDBpedia(q, tokens);
    res.json({ query: q, count: results.length, results });
  } catch (err) {
    console.error("Error en DBpedia:", err);
    res.status(500).json({ error: "Error al consultar DBpedia", details: err.message });
  }
});

// Función para buscar en DBpedia
async function searchDBpedia(query, tokens = []) {
  const DBPEDIA_ENDPOINT = "https://dbpedia.org/sparql";
  
  // Traducciones útiles español -> inglés
  const termTranslations = {
    "perro": "dog", "perros": "dog",
    "gato": "cat", "gatos": "cat",
    "vacuna": "vaccine", "vacunas": "vaccine",
    "rabia": "rabies",
    "parvovirus": "parvovirus",
    "enfermedad": "disease", "afección": "disease",
    "cirugía": "surgery",
    "esterilización": "spay",
    "ovario": "ovary",
    "pulga": "flea",
    "garrapata": "tick"
  };
  
  // Traducir tokens
  const searchTokens = tokens.map(t => termTranslations[t] || t);
  
  // Construir filtro SPARQL
  const filterConditions = searchTokens
    .map(token => `CONTAINS(LCASE(?label), LCASE("${token}"))`)
    .join(" || ");
  
  // Consulta SPARQL
  const sparqlQuery = `
    PREFIX dbo: <http://dbpedia.org/ontology/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

    SELECT DISTINCT ?item ?label ?thumbnail
    WHERE {
      ?item rdfs:label ?label .
      ?item a ?type .

      FILTER(LANG(?label) = "en")
      FILTER(${filterConditions || `CONTAINS(LCASE(?label), LCASE("${query}"))`})
      FILTER(?type IN (dbo:Animal, dbo:Disease))

      OPTIONAL { ?item dbo:thumbnail ?thumbnail . }
    }
    LIMIT 12
  `;
  
  const results = [];
  
  try {
    // Realizar consulta SPARQL
    const response = await fetch(DBPEDIA_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: `query=${encodeURIComponent(sparqlQuery)}`
    });
    
    if (!response.ok) {
      throw new Error(`DBpedia returned ${response.status}`);
    }
    
    const data = await response.json();
    const bindings = data.results?.bindings || [];
    
    // Procesar resultados
    for (const binding of bindings) {
      const uri = binding.item?.value;
      const label = binding.label?.value || uri.split("/").pop();
      const thumbnail = binding.thumbnail?.value;
      
      // Obtener descripción (request separado)
      let descripcion = "Descripción no disponible";
      try {
        const absQuery = `
          PREFIX dbo: <http://dbpedia.org/ontology/>
          PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

          SELECT ?text WHERE {
            { <${uri}> dbo:abstract ?text . FILTER(LANG(?text) = "en") }
            UNION
            { <${uri}> rdfs:comment ?text . FILTER(LANG(?text) = "en") }
            UNION
            { <${uri}> dbo:description ?text . }
          }
          LIMIT 1
        `;
        
        const absResponse = await fetch(DBPEDIA_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json"
          },
          body: `query=${encodeURIComponent(absQuery)}`
        });
        
        if (absResponse.ok) {
          const absData = await absResponse.json();
          const absBindings = absData.results?.bindings || [];
          if (absBindings.length > 0) {
            descripcion = absBindings[0].text?.value || descripcion;
            if (descripcion.length > 400) {
              descripcion = descripcion.substring(0, 397) + "...";
            }
          }
        }
      } catch (err) {
        console.warn("No se pudo obtener descripción para", uri);
      }
      
      results.push({
        uri,
        nombre: label,
        descripcion,
        thumbnail,
        atributos: {
          "dbpedia_uri": uri
        }
      });
    }
    
  } catch (err) {
    console.error("Error consultando DBpedia:", err);
  }
  
  return results;
}

app.listen(PORT, () => {
  console.log(`🚀 Backend escuchando en http://localhost:${PORT}`);
});

