const fs = require("fs");
const path = require("path");
const { RdfXmlParser } = require("rdfxml-streaming-parser");

// --------------------------------------------------------
//  BASE DE TU ONTOLOGÍA
// --------------------------------------------------------
const BASE =
  "http://www.semanticweb.org/erikachino/ontologies/2025/8/veterinaria/";

// ----------------- PROPIEDADES ORIGINALES -----------------
const P_NOMBRE_E = BASE + "NombreEnfermedad";
const P_ESPECIE = BASE + "Especie_afectada";
const P_CATEG = BASE + "CategoriaEnfermedad";
const P_SINTOMA = BASE + "Presenta_Sintoma";

const P_NOMBRE_S = BASE + "NombreSintoma";

// ----------------- NUEVAS PROPIEDADES -----------------
const P_NOMBRE_MASCOTA = BASE + "nombre";
const P_RAZA = BASE + "raza";
const P_EDAD = BASE + "edad";
const P_SEXO = BASE + "sexo";

const P_NOMBRE_PROPIETARIO = BASE + "nombreCompleto";
const P_TELEFONO = BASE + "Telefono";

const P_NOMBRE_MEDICAMENTO = BASE + "medicamento";
const P_PRINCIPIO = BASE + "principioActivo";

const P_NOMBRE_TRATAMIENTO = BASE + "instrucciones";

const P_NOMBRE_VET = BASE + "nombreCompleto";
const P_ESPECIALIDAD = BASE + "especialidad";

const P_FECHA_CONSULTA = BASE + "fecha_consulta";
const P_MOTIVO_CONSULTA = BASE + "Motivo_Consulta";

// rdfs:label y rdfs:comment para etiquetas/descr. multilingües
const RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label";
const RDFS_COMMENT = "http://www.w3.org/2000/01/rdf-schema#comment";

// --------------------------------------------------------
//   MAPAS DE ENTIDADES
// --------------------------------------------------------
let enfermedades = new Map();
let sintomas = new Map();

let mascotas = new Map();
let propietarios = new Map();
let medicamentos = new Map();
let tratamientos = new Map();
let veterinarios = new Map();
let consultas = new Map();

// Etiquetas multilingües por recurso
// Map<uri, { es?:string, en?:string, fr?:string, ... }>
let labels = new Map();
// Comentarios multilingües por recurso
// Map<uri, { es?:string, en?:string, fr?:string, ... }>
let comments = new Map();

// --------------------------------------------------------
//   HELPERS LABELS / COMMENTS
// --------------------------------------------------------
function setLabel(subjectUri, lang, value) {
  if (!lang) return; // sin xml:lang no es útil para multilingüe real
  lang = lang.toLowerCase();
  if (!labels.has(subjectUri)) {
    labels.set(subjectUri, {});
  }
  labels.get(subjectUri)[lang] = value;
}

function getLabel(subjectUri, lang = "es") {
  const map = labels.get(subjectUri);
  if (!map) return null;

  const l = lang.toLowerCase();
  return map[l] || map.es || map.en || map.fr || null;
}

function setComment(subjectUri, lang, value) {
  if (!lang) return;
  lang = lang.toLowerCase();
  if (!comments.has(subjectUri)) {
    comments.set(subjectUri, {});
  }
  comments.get(subjectUri)[lang] = value;
}

function getComment(subjectUri, lang = "es") {
  const map = comments.get(subjectUri);
  if (!map) return null;

  const l = lang.toLowerCase();
  return map[l] || map.es || map.en || map.fr || null;
}

// --------------------------------------------------------
//   TRADUCCIÓN DE ESPECIES / CATEGORÍAS
// --------------------------------------------------------
const translateTerm = {
  // Especies
  Caninos: { es: "Caninos", en: "Canines", fr: "Canidés" },
  Felinos: { es: "Felinos", en: "Felines", fr: "Félins" },
  Aves: { es: "Aves", en: "Birds", fr: "Oiseaux" },
  Reptiles: { es: "Reptiles", en: "Reptiles", fr: "Reptiles" },
  Roedores: { es: "Roedores", en: "Rodents", fr: "Rongeurs" },

  // Categorías
  Infecciosa: { es: "Infecciosa", en: "Infectious", fr: "Infectieuse" },
  Parasitaria: { es: "Parasitaria", en: "Parasitic", fr: "Parasitaire" },
  Viral: { es: "Viral", en: "Viral", fr: "Virale" },
  Bacteriana: { es: "Bacteriana", en: "Bacterial", fr: "Bactérienne" },
  Crónica: { es: "Crónica", en: "Chronic", fr: "Chronique" },
};

function translateValue(value, lang = "es") {
  if (!value) return value;
  const entry = translateTerm[value];
  if (!entry) return value;
  const L = lang.toLowerCase();
  return entry[L] || value;
}

// --------------------------------------------------------
//   LOAD ONTOLOGY
// --------------------------------------------------------
function loadOntology() {
  const filePath = path.join(__dirname, "../data/Veterinaria_multilingual.rdf");

  const rdfStream = fs.createReadStream(filePath);
  const parser = new RdfXmlParser();

  parser.on("data", (quad) => {
    const s = quad.subject.value;
    const p = quad.predicate.value;
    const o = quad.object;

    // =============================
    //   LABELS MULTILINGÜES (RDFS)
    // =============================
    if (p === RDFS_LABEL && o.termType === "Literal") {
      setLabel(s, o.language || "", o.value);
    }

    // =============================
    //   COMMENTS MULTILINGÜES
    // =============================
    if (p === RDFS_COMMENT && o.termType === "Literal") {
      setComment(s, o.language || "", o.value);
    }

    // =============================
    //   SINTOMAS (legacy)
    // =============================
    if (p === P_NOMBRE_S && o.termType === "Literal") {
      sintomas.set(s, o.value);
    }

    // =============================
    //   ENFERMEDADES
    // =============================
    if (!enfermedades.has(s)) {
      enfermedades.set(s, {
        uri: s,
        nombre: null, // legacy
        especie: null,
        categoria: null,
        sintomas: [],
      });
    }

    const enf = enfermedades.get(s);

    if (p === P_NOMBRE_E && o.termType === "Literal") {
      enf.nombre = o.value; // por compatibilidad
    } else if (p === P_ESPECIE && o.termType === "Literal") {
      enf.especie = o.value;
    } else if (p === P_CATEG && o.termType === "Literal") {
      enf.categoria = o.value;
    } else if (p === P_SINTOMA && o.termType === "NamedNode") {
      enf.sintomas.push(o.value);
    }

    // =============================
    //   MASCOTAS
    // =============================
    if (s.includes("/Mascota")) {
      if (!mascotas.has(s)) {
        mascotas.set(s, {
          uri: s,
          nombre: null,
          raza: null,
          edad: null,
          sexo: null,
        });
      }
      const m = mascotas.get(s);

      if (p === P_NOMBRE_MASCOTA && o.termType === "Literal")
        m.nombre = o.value;
      if (p === P_RAZA && o.termType === "Literal") m.raza = o.value;
      if (p === P_EDAD && o.termType === "Literal") m.edad = o.value;
      if (p === P_SEXO && o.termType === "Literal") m.sexo = o.value;
    }

    // =============================
    //   PROPIETARIOS
    // =============================
    if (s.includes("/Propietario")) {
      if (!propietarios.has(s)) {
        propietarios.set(s, {
          uri: s,
          nombre: null,
          telefono: null,
        });
      }
      const pr = propietarios.get(s);

      if (p === P_NOMBRE_PROPIETARIO && o.termType === "Literal")
        pr.nombre = o.value;
      if (p === P_TELEFONO && o.termType === "Literal") pr.telefono = o.value;
    }

    // =============================
    //   MEDICAMENTOS
    // =============================
    if (s.includes("/Medicamento")) {
      if (!medicamentos.has(s)) {
        medicamentos.set(s, {
          uri: s,
          nombre: null,
          principio: null,
        });
      }
      const med = medicamentos.get(s);

      if (p === P_NOMBRE_MEDICAMENTO && o.termType === "Literal")
        med.nombre = o.value;
      if (p === P_PRINCIPIO && o.termType === "Literal")
        med.principio = o.value;
    }

    // =============================
    //   TRATAMIENTOS
    // =============================
    if (s.includes("/Tratamiento")) {
      if (!tratamientos.has(s)) {
        tratamientos.set(s, {
          uri: s,
          instrucciones: null,
        });
      }
      const tr = tratamientos.get(s);

      if (p === P_NOMBRE_TRATAMIENTO && o.termType === "Literal")
        tr.instrucciones = o.value;
    }

    // =============================
    //   VETERINARIOS
    // =============================
    if (s.includes("/Veterinario")) {
      if (!veterinarios.has(s)) {
        veterinarios.set(s, {
          uri: s,
          nombre: null,
          especialidad: null,
        });
      }
      const v = veterinarios.get(s);

      if (p === P_NOMBRE_VET && o.termType === "Literal") v.nombre = o.value;
      if (p === P_ESPECIALIDAD && o.termType === "Literal")
        v.especialidad = o.value;
    }

    // =============================
    //   CONSULTAS
    // =============================
    if (s.includes("/Consulta")) {
      if (!consultas.has(s)) {
        consultas.set(s, {
          uri: s,
          fecha: null,
          motivo: null,
        });
      }
      const c = consultas.get(s);

      if (p === P_FECHA_CONSULTA && o.termType === "Literal") c.fecha = o.value;
      if (p === P_MOTIVO_CONSULTA && o.termType === "Literal")
        c.motivo = o.value;
    }
  });

  parser.on("end", () => {
    console.log("✔ Ontología cargada correctamente");
    console.log("Enfermedades:", enfermedades.size);
    console.log("Síntomas:", sintomas.size);
    console.log("Mascotas:", mascotas.size);
    console.log("Propietarios:", propietarios.size);
    console.log("Medicamentos:", medicamentos.size);
    console.log("Tratamientos:", tratamientos.size);
    console.log("Veterinarios:", veterinarios.size);
    console.log("Consultas:", consultas.size);
    console.log("Labels multilingües:", labels.size);
    console.log("Comments multilingües:", comments.size);
  });

  rdfStream.pipe(parser);
}

// --------------------------------------------------------
//   NORMALIZACIÓN DE BÚSQUEDA
// --------------------------------------------------------
const SYN = {
  perro: "Caninos",
  perros: "Caninos",
  canino: "Caninos",
  caninos: "Caninos",
  gato: "Felinos",
  gatos: "Felinos",
  felino: "Felinos",
  felinos: "Felinos",

  dog: "Caninos",
  dogs: "Caninos",
  chien: "Caninos",
  chat: "Felinos",
  cats: "Felinos",
  cat: "Felinos",
};

function normalizeQuery(q) {
  q = q.toLowerCase().trim();
  return SYN[q] || q;
}

// --------------------------------------------------------
//   BÚSQUEDA GENERAL (TODAS LAS ENTIDADES)
//   con soporte de idioma en TODO
// --------------------------------------------------------
function searchConcepts(rawQuery, lang = "es") {
  const q = normalizeQuery(rawQuery).toLowerCase();
  const results = [];

  const L = lang.toLowerCase();

  // =============================
  //   ENFERMEDADES
  // =============================
  for (const enf of enfermedades.values()) {
    const nombreLabel = getLabel(enf.uri, L) || enf.nombre || "";
    const nombre = nombreLabel.toLowerCase();

    const especieRaw = enf.especie || "";
    const categoriaRaw = enf.categoria || "";

    const especieTrad = translateValue(especieRaw, L);
    const categoriaTrad = translateValue(categoriaRaw, L);

    const especie = especieTrad.toLowerCase();
    const categoria = categoriaTrad.toLowerCase();

    const descripcion = getComment(enf.uri, L) || null;

    if (
      nombre.includes(q) ||
      especie.includes(q) ||
      categoria.includes(q) ||
      (descripcion || "").toLowerCase().includes(q)
    ) {
      results.push({
        tipo: "Enfermedad",
        uri: enf.uri,
        nombre: nombreLabel || enf.nombre,
        descripcion,
        especie: especieTrad,
        categoria: categoriaTrad,
        sintomas: enf.sintomas.map((uri) => {
          // 1) Usar label multilingüe si existe
          const lbl = getLabel(uri, L);
          if (lbl) return lbl;

          // 2) Usar nombreLegacy en español si existe
          const n = sintomas.get(uri);
          if (n) return n;

          // 3) Fallback al fragmento del URI
          const last = uri.split("/").pop() || "";
          return last.replace(/_/g, " ");
        }),
      });
    }
  }

  // =============================
  //   MASCOTAS
  // =============================
  for (const m of mascotas.values()) {
    const label = getLabel(m.uri, L) || m.nombre || "";
    const raza = (m.raza || "").toLowerCase();

    if (label.toLowerCase().includes(q) || raza.includes(q)) {
      results.push({
        tipo: "Mascota",
        ...m,
        nombre: label,
      });
    }
  }

  // =============================
  //   PROPIETARIOS
  // =============================
  for (const p of propietarios.values()) {
    const label = getLabel(p.uri, L) || p.nombre || "";
    if (label.toLowerCase().includes(q)) {
      results.push({
        tipo: "Propietario",
        ...p,
        nombre: label,
      });
    }
  }

  // =============================
  //   MEDICAMENTOS
  // =============================
  for (const m of medicamentos.values()) {
    const label = getLabel(m.uri, L) || m.nombre || "";
    const principio = (m.principio || "").toLowerCase();

    if (label.toLowerCase().includes(q) || principio.includes(q)) {
      results.push({
        tipo: "Medicamento",
        ...m,
        nombre: label,
      });
    }
  }

  // =============================
  //   TRATAMIENTOS
  // =============================
  for (const t of tratamientos.values()) {
    const label = getLabel(t.uri, L) || t.instrucciones || "";
    if (label.toLowerCase().includes(q)) {
      results.push({
        tipo: "Tratamiento",
        ...t,
        instrucciones: label,
      });
    }
  }

  // =============================
  //   VETERINARIOS
  // =============================
  for (const v of veterinarios.values()) {
    const label = getLabel(v.uri, L) || v.nombre || "";
    const especialidad = (v.especialidad || "").toLowerCase();

    if (label.toLowerCase().includes(q) || especialidad.includes(q)) {
      results.push({
        tipo: "Veterinario",
        ...v,
        nombre: label,
      });
    }
  }

  // =============================
  //   CONSULTAS
  // =============================
  for (const c of consultas.values()) {
    const label = getLabel(c.uri, L) || c.motivo || "";
    const fecha = (c.fecha || "").toLowerCase();

    if (label.toLowerCase().includes(q) || fecha.includes(q)) {
      results.push({
        tipo: "Consulta",
        ...c,
        motivo: label,
      });
    }
  }

  return results;
}

module.exports = {
  loadOntology,
  searchConcepts,
};
