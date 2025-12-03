// backend/src/ontologyLoader.js
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

// --------------------------------------------------------
//   MAPAS DE ENTIDADES
// --------------------------------------------------------
let enfermedades = new Map();
let sintomas = new Map();

// NUEVOS
let mascotas = new Map();
let propietarios = new Map();
let medicamentos = new Map();
let tratamientos = new Map();
let veterinarios = new Map();
let consultas = new Map();

// --------------------------------------------------------
//   LOAD ONTOLOGY
// --------------------------------------------------------
function loadOntology() {
  const filePath = path.join(__dirname, "../data/VeterinariaFinal");

  const rdfStream = fs.createReadStream(filePath);
  const parser = new RdfXmlParser();

  parser.on("data", (quad) => {
    const s = quad.subject.value;
    const p = quad.predicate.value;
    const o = quad.object;

    // =============================
    //   SINTOMAS
    // =============================
    if (p === P_NOMBRE_S) {
      sintomas.set(s, o.value);
    }

    // =============================
    //   ENFERMEDADES
    // =============================
    if (!enfermedades.has(s)) {
      enfermedades.set(s, {
        uri: s,
        nombre: null,
        especie: null,
        categoria: null,
        sintomas: [],
      });
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

      if (p === P_NOMBRE_MASCOTA) m.nombre = o.value;
      if (p === P_RAZA) m.raza = o.value;
      if (p === P_EDAD) m.edad = o.value;
      if (p === P_SEXO) m.sexo = o.value;
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

      if (p === P_NOMBRE_PROPIETARIO) pr.nombre = o.value;
      if (p === P_TELEFONO) pr.telefono = o.value;
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

      if (p === P_NOMBRE_MEDICAMENTO) med.nombre = o.value;
      if (p === P_PRINCIPIO) med.principio = o.value;
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

      if (p === P_NOMBRE_TRATAMIENTO) tr.instrucciones = o.value;
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

      if (p === P_NOMBRE_VET) v.nombre = o.value;
      if (p === P_ESPECIALIDAD) v.especialidad = o.value;
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

      if (p === P_FECHA_CONSULTA) c.fecha = o.value;
      if (p === P_MOTIVO_CONSULTA) c.motivo = o.value;
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
// --------------------------------------------------------
function searchConcepts(rawQuery) {
  const q = normalizeQuery(rawQuery).toLowerCase();
  const results = [];

  // ENFERMEDADES
  for (const enf of enfermedades.values()) {
    const nombre = enf.nombre?.toLowerCase() || "";
    const especie = enf.especie?.toLowerCase() || "";
    const categoria = enf.categoria?.toLowerCase() || "";

    if (nombre.includes(q) || especie.includes(q) || categoria.includes(q)) {
      results.push({
        tipo: "Enfermedad",
        uri: enf.uri,
        nombre: enf.nombre,
        especie: enf.especie,
        categoria: enf.categoria,
        sintomas: enf.sintomas.map((uri) => {
          const n = sintomas.get(uri);
          if (n) return n;

          const last = uri.split("/").pop() || "";
          return last.replace(/_/g, " ");
        }),
      });
    }
  }

  // MASCOTAS
  for (const m of mascotas.values()) {
    if ((m.nombre?.toLowerCase() || "").includes(q)) {
      results.push({ tipo: "Mascota", ...m });
    }
  }

  // PROPIETARIOS
  for (const p of propietarios.values()) {
    if ((p.nombre?.toLowerCase() || "").includes(q)) {
      results.push({ tipo: "Propietario", ...p });
    }
  }

  // MEDICAMENTOS
  for (const m of medicamentos.values()) {
    if ((m.nombre?.toLowerCase() || "").includes(q)) {
      results.push({ tipo: "Medicamento", ...m });
    }
  }

  // TRATAMIENTOS
  for (const t of tratamientos.values()) {
    if ((t.instrucciones?.toLowerCase() || "").includes(q)) {
      results.push({ tipo: "Tratamiento", ...t });
    }
  }

  // VETERINARIOS
  for (const v of veterinarios.values()) {
    if ((v.nombre?.toLowerCase() || "").includes(q)) {
      results.push({ tipo: "Veterinario", ...v });
    }
  }

  // CONSULTAS
  for (const c of consultas.values()) {
    const fecha = c.fecha?.toLowerCase() || "";
    const motivo = c.motivo?.toLowerCase() || "";
    if (fecha.includes(q) || motivo.includes(q)) {
      results.push({ tipo: "Consulta", ...c });
    }
  }

  return results;
}

module.exports = {
  loadOntology,
  searchConcepts,
};
