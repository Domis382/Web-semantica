import React, { useState } from "react";
import { buscarOntologia, buscarDBpedia } from "../api";
import "./Barrabusqueda.css";

/* ============================================================
   ⭐ 1. STOPWORDS para limpiar consultas
   ============================================================ */
function tokenizarBusqueda(termino) {
  const stopwords = new Set([
    "de",
    "del",
    "la",
    "las",
    "el",
    "los",
    "y",
    "o",
    "u",
    "a",
    "en",
    "por",
    "para",
    "sans",
    "avec",
    "des",
    "les",
    "le",
    "un",
    "une",
    "au",
    "du",
    "the",
    "of",
  ]);

  return termino
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopwords.has(w));
}

/* ============================================================
   ⭐ 2. MAPA MULTILINGÜE DE ESPECIES
   ============================================================ */
const speciesMap = {
  // Perros
  perro: { local: "Perro", db: "dog" },
  perros: { local: "Perro", db: "dog" },
  dog: { local: "Perro", db: "dog" },
  dogs: { local: "Perro", db: "dog" },
  chien: { local: "Perro", db: "dog" },

  // Gatos
  gato: { local: "Gato", db: "cat" },
  gatos: { local: "Gato", db: "cat" },
  cat: { local: "Gato", db: "cat" },
  cats: { local: "Gato", db: "cat" },
  chat: { local: "Gato", db: "cat" },

  // Caballos
  caballo: { local: "Caballo", db: "horse" },
  horse: { local: "Caballo", db: "horse" },
  cheval: { local: "Caballo", db: "horse" },

  // Aves
  ave: { local: "Aves", db: "bird" },
  bird: { local: "Aves", db: "bird" },
  oiseau: { local: "Aves", db: "bird" },

  // Vacas
  vaca: { local: "Vaca", db: "cow" },
  cow: { local: "Vaca", db: "cow" },
  vache: { local: "Vaca", db: "cow" },

  // Cerdos
  cerdo: { local: "Cerdo", db: "pig" },
  pig: { local: "Cerdo", db: "pig" },
  porc: { local: "Cerdo", db: "pig" },
};

/* ============================================================
   ⭐ 3. DICCIONARIO MULTILINGÜE DE ENFERMEDADES / RAZAS
   ============================================================ */
const semanticMap = {
  parvovirose: "parvovirus",
  "canine parvovirus": "parvovirus",
  parvovirus: "parvovirus",
  parvo: "parvovirus",
  cpv: "parvovirus",

  distemper: "moquillo",
  "maladie de carré": "moquillo",
  moquillo: "moquillo",

  rage: "rabia",
  rabies: "rabia",
  rabia: "rabia",

  // Razas (marca de búsqueda de razas)
  breed: "breed",
  raza: "breed",
  race: "breed",
  "race de chien": "breed",
  "race de chat": "breed",
};

export default function BarraBusqueda() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("todos");

  /* ============================================================
     ⭐ 4. DETECTAR SI EL USUARIO BUSCA UNA RAZA
     ============================================================ */
  function isBreedSearch(texto) {
    return ["breed", "raza", "race", "race de chien", "race de chat"].some(
      (w) => texto.toLowerCase().includes(w)
    );
  }

  /* ============================================================
     ⭐ 5. DETECTAR ESPECIE
     ============================================================ */
  function detectSpecies(term) {
    const words = term.toLowerCase().split(/\s+/);
    for (const w of words) {
      if (speciesMap[w]) return speciesMap[w];
    }
    return null;
  }

  /* ============================================================
     ⭐ 6. FUNCIÓN PRINCIPAL DE BÚSQUEDA
     ============================================================ */
  async function handleSearch() {
    let q = query.trim();
    if (!q) {
      setResults([]);
      setError("");
      return;
    }

    setLoading(true);
    setError("");

    const qNorm = semanticMap[q.toLowerCase()] || q;
    const species = detectSpecies(qNorm);
    const isBreed = isBreedSearch(qNorm);

    try {
      /* ==============================
         🔍 BÚSQUEDA LOCAL
         ============================== */
      let local = [];
      if (species) {
        const res = await buscarOntologia(species.local);
        local = (res.results || []).map((x) => ({ ...x, fuente: "local" }));
      } else {
        const res = await buscarOntologia(qNorm);
        local = (res.results || []).map((x) => ({ ...x, fuente: "local" }));
      }

      /* ==============================
         🔎 BÚSQUEDA EN DBPEDIA MULTILINGÜE
         ============================== */
      let tokens = tokenizarBusqueda(qNorm);

      // Forzar tokens si es búsqueda de razas
      if (isBreed) {
        tokens = ["breed", "dog", "cat", ...tokens];
      }

      const resDB = await buscarDBpedia(qNorm, tokens);
      const dbpedia = (resDB.results || []).map((x) => ({
        ...x,
        fuente: "dbpedia",
      }));

      /* ==============================
         📌 COMBINAR RESULTADOS
         ============================== */
      const all = [...local, ...dbpedia];
      setResults(all);

      if (all.length === 0) {
        setError(`No se encontraron resultados para "${q}"`);
      }
    } catch (err) {
      console.error(err);
      setError("Error ejecutando búsqueda");
    }

    setLoading(false);
  }

  /* ============================================================
     ⭐ FILTROS POR TABS
     ============================================================ */
  const local = results.filter((r) => r.fuente === "local");
  const dbpedia = results.filter((r) => r.fuente === "dbpedia");

  const visible = tab === "todos" ? results : tab === "local" ? local : dbpedia;

  return (
    <section className="vet-container">
      {/* HEADER */}
      <header className="vet-header">
        <h1 className="vet-title">🔎 Buscador Veterinario Semántico</h1>
        <p className="vet-desc">Ontología Local + DBpedia (EN/ES/FR)</p>
      </header>

      {/* SEARCH BAR */}
      <div className="vet-search-wrap">
        <div className="vet-search-bar">
          <input
            className="vet-search-input"
            placeholder="Buscar enfermedades, razas, síntomas…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />

          <button className="vet-search-btn" onClick={handleSearch}>
            Buscar
          </button>

          <button
            className="vet-reset-btn"
            onClick={() => {
              setQuery("");
              setResults([]);
              setError("");
            }}
          >
            Limpiar
          </button>
        </div>
      </div>

      {loading && <p className="vet-status">🔍 Buscando…</p>}
      {error && <p className="vet-error">⚠ {error}</p>}

      {/* TABS */}
      {results.length > 0 && (
        <div className="tabs-container">
          <button
            className={`tab-btn ${tab === "todos" ? "active" : ""}`}
            onClick={() => setTab("todos")}
          >
            Todos ({results.length})
          </button>
          <button
            className={`tab-btn ${tab === "local" ? "active" : ""}`}
            onClick={() => setTab("local")}
          >
            Local ({local.length})
          </button>
          <button
            className={`tab-btn ${tab === "dbpedia" ? "active" : ""}`}
            onClick={() => setTab("dbpedia")}
          >
            DBpedia ({dbpedia.length})
          </button>
        </div>
      )}

      {/* RESULTADOS */}
      <div className="cards-grid">
        {visible.map((item, idx) => (
          <article
            key={idx}
            className={`card ${
              item.fuente === "dbpedia" ? "card-dbpedia" : "card-local"
            }`}
          >
            <div className="card-top">
              <h3 className="card-title">
                {item.nombre}
                {item.idioma === "fr" && " 🇫🇷"}
                {item.idioma === "en" && " 🇬🇧"}
                {item.idioma === "es" && " 🇪🇸"}
              </h3>
              <span className="source-badge">
                {item.fuente === "local" ? "LOCAL" : "DBPEDIA"}
              </span>
            </div>

            {/* LOCAL */}
            {item.fuente === "local" && (
              <>
                {item.especie && (
                  <p>
                    <strong>Especie:</strong> {item.especie}
                  </p>
                )}
                {item.categoria && (
                  <p>
                    <strong>Categoría:</strong> {item.categoria}
                  </p>
                )}

                {item.sintomas?.length > 0 && (
                  <ul>
                    {item.sintomas.map((s, id) => (
                      <li key={id}>{s}</li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {/* DBPEDIA */}
            {item.fuente === "dbpedia" && (
              <>
                {item.thumbnail && (
                  <img
                    src={item.thumbnail}
                    className="thumbnail"
                    alt={item.nombre}
                  />
                )}
                {item.descripcion && <p>{item.descripcion}</p>}

                {item.dbpedia_uri && (
                  <a
                    href={item.dbpedia_uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dbpedia-link"
                  >
                    Ver en DBpedia →
                  </a>
                )}
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
