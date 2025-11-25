// backend/src/ontologyLoader.js
const fs = require("fs");
const path = require("path");
const { RdfXmlParser } = require("rdfxml-streaming-parser");
const { DataFactory } = require("n3");

const BASE = "http://www.semanticweb.org/erikachino/ontologies/2025/8/veterinaria/";

const P_NOMBRE_E   = BASE + "NombreEnfermedad";
const P_ESPECIE    = BASE + "Especie_afectada";
const P_CATEG      = BASE + "CategoriaEnfermedad";
const P_SINTOMA    = BASE + "Presenta_Sintoma";

const P_NOMBRE_S   = BASE + "NombreSintoma";

let enfermedades = new Map(); // uri -> enfermedad
let sintomas = new Map();     // uri -> nombreSintoma

function loadOntology() {
  const filePath = path.join(__dirname, "../data/Veterinaria.rdf");

  const rdfStream = fs.createReadStream(filePath);
  const parser = new RdfXmlParser();

  parser.on("data", (quad) => {
    const s = quad.subject.value;
    const p = quad.predicate.value;
    const o = quad.object;

    // SINTOMAS
    if (p === P_NOMBRE_S) {
      sintomas.set(s, o.value);
    }

    // ENFERMEDADES
    if (!enfermedades.has(s)) {
      enfermedades.set(s, { uri: s, nombre: null, especie: null, categoria: null, sintomas: [] });
    }

    const enf = enfermedades.get(s);

    if (p === P_NOMBRE_E && o.termType === "Literal") {
      enf.nombre = o.value;
    } else if (p === P_ESPECIE) {
      enf.especie = o.value;
    } else if (p === P_CATEG) {
      enf.categoria = o.value;
    } else if (p === P_SINTOMA && o.termType === "NamedNode") {
      enf.sintomas.push(o.value);
    }
  });

  parser.on("end", () => {
    console.log(`✔ Enfermedades: ${enfermedades.size}`);
    console.log(`✔ Síntomas: ${sintomas.size}`);
  });

  rdfStream.pipe(parser);
}

// Diccionario de sinónimos
const SYN = {
  perro: "Caninos",
  perros: "Caninos",
  canino: "Caninos",
  caninos: "Caninos",
  gato: "Felinos",
  gatos: "Felinos",
  felino: "Felinos",
  felinos: "Felinos",
};

function normalizeQuery(q) {
  q = q.toLowerCase().trim();
  return SYN[q] || q;
}

function searchConcepts(rawQuery) {
  const q = normalizeQuery(rawQuery).toLowerCase();
  const results = [];

  for (const enf of enfermedades.values()) {
    const nombre = enf.nombre?.toLowerCase() || "";
    const especie = enf.especie?.toLowerCase() || "";
    const categoria = enf.categoria?.toLowerCase() || "";

    if (nombre.includes(q) || especie.includes(q) || categoria.includes(q)) {
      results.push({
        uri: enf.uri,
        nombre: enf.nombre,
        especie: enf.especie,
        categoria: enf.categoria,

        // 🔴 AQUÍ ESTÁ LA MAGIA PARA QUE NO SALGA LA URL
        sintomas: enf.sintomas.map((uri) => {
          const nombreSintoma = sintomas.get(uri);
          if (nombreSintoma) return nombreSintoma;

          // Fallback: limpiar la URI y convertirla en texto legible
          const lastPart = uri.split("/").pop() || "";
          const clean = lastPart
            .replace(/_/g, " ")     // "_" -> espacio
            .replace(/Sintoma/i, "") // quitar la palabra "Sintoma"
            .trim();

          // si por alguna razón queda vacío, devolvemos algo genérico
          return clean || "Síntoma sin nombre";
        }),
      });
    }
  }

  return results;
}


module.exports = { loadOntology, searchConcepts };
