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
    "caballo": "horse", "caballos": "horse",
    "vaca": "cow", "vacas": "cattle",
    "cerdo": "pig", "cerdos": "pig",
    "vacuna": "vaccine", "vacunas": "vaccine",
    "rabia": "rabies",
    "parvovirus": "parvovirus",
    "moquillo": "distemper",
    "enfermedad": "disease", "afección": "disease", "enfermedades": "disease",
    "cirugía": "surgery",
    "esterilización": "spay",
    "ovario": "ovary",
    "pulga": "flea",
    "garrapata": "tick",
    "veterinaria": "veterinary", "veterinario": "veterinary",
    "tratamiento": "treatment"
  };
  
  // Traducir tokens
  const searchTokens = tokens.map(t => termTranslations[t] || t);
  
  // Construir filtro SPARQL
  const filterConditions = searchTokens
    .map(token => `CONTAINS(LCASE(?label), LCASE("${token}"))`)
    .join(" || ");
  
  // Consulta SPARQL mejorada: priorizar tipos veterinarios y abstracts con contexto veterinario;
  // además ampliar exclusiones de personas/actores/deportistas
  const sparqlQuery = `
    PREFIX dbo: <http://dbpedia.org/ontology/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    PREFIX schema: <http://schema.org/>

    SELECT DISTINCT ?item ?label ?thumbnail ?abstract
    WHERE {
      ?item rdfs:label ?label .
      OPTIONAL { ?item a ?type . }

      OPTIONAL { ?item dbo:abstract ?abstract . FILTER(LANG(?abstract) = "en") }

      FILTER(LANG(?label) = "en")
      FILTER(${filterConditions || `CONTAINS(LCASE(?label), LCASE("${query}"))`})

      # Requerir que el recurso sea de un tipo veterinario conocido
      # o que su abstract contenga palabras clave veterinarias (disease, veterinary, symptom)
      FILTER(
        (bound(?type) && ?type IN (
          dbo:Animal, dbo:Mammal, dbo:Bird, dbo:Fish,
          dbo:Disease, dbo:Infection, dbo:MedicalCondition,
          dbo:Virus, dbo:Bacteria,
          dbo:Drug, dbo:AnatomicalStructure
        ))
        || (
          bound(?abstract) && (
            CONTAINS(LCASE(?abstract), "disease") ||
            CONTAINS(LCASE(?abstract), "veterinary") ||
            CONTAINS(LCASE(?abstract), "symptom") ||
            CONTAINS(LCASE(?abstract), "vaccine")
          )
        )
      )

      # Excluir personas y agentes humanos explícitos
      FILTER(!(?type IN (dbo:Person, foaf:Person, schema:Person, dbo:Agent)))
      FILTER(!REGEX(STR(?item), "[Pp]erson|[Pp]layer|[Aa]ctor|[Ss]portsperson|[Pp]olitician|[Mm]usician"))

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
      
      // Filtrado adicional: excluir resultados que contengan palabras clave no veterinarias
      const excludeKeywords = ['athlete', 'player', 'actor', 'politician', 'author', 'actress', 'sportsperson', 'musician', 'director'];
      const isExcluded = excludeKeywords.some(kw => label.toLowerCase().includes(kw));

      if (!isExcluded) {
        // No incluir la URI completa dentro de `atributos` para evitar que se muestre
        // en bruto en la UI; la URI se expone en `dbpedia_uri` y/o `uri`.
        results.push({
          uri,
          dbpedia_uri: uri,
          nombre: label,
          descripcion,
          thumbnail,
          atributos: {}
        });
      }
    }
    
  } catch (err) {
    console.error("Error consultando DBpedia:", err);
  }
  
  return results;
}

app.listen(PORT, () => {
  console.log(`🚀 Backend escuchando en http://localhost:${PORT}`);
});

