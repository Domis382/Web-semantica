import React, { useState, useEffect } from "react";
import { buscarOntologia, buscarDBpedia } from "../api";
import "./Barrabusqueda.css";

/* ============================================================
   UI MULTILINGÜE ES / EN / FR
   ============================================================ */
const ui = {
  es: {
    placeholder: "Buscar enfermedades, razas, síntomas…",
    search: "Buscar",
    clear: "Limpiar",
    title: "🔬 Veterinaria",
    desc: "Ontología Local + DBpedia (ES/EN/FR)",
    noResults: (q) => `No se encontraron resultados para "${q}"`,
    tabAll: "Todos",
    tabLocal: "Local",
    tabDB: "DBpedia",
    species: "Especie",
    category: "Categoría",
  },
  en: {
    placeholder: "Search diseases, breeds, symptoms…",
    search: "Search",
    clear: "Clear",
    title: "🔬 Veterinary",
    desc: "Local Ontology + DBpedia (ES/EN/FR)",
    noResults: (q) => `No results found for "${q}"`,
    tabAll: "All",
    tabLocal: "Local",
    tabDB: "DBpedia",
    species: "Species",
    category: "Category",
  },
  fr: {
    placeholder: "Rechercher maladies, races, symptômes…",
    search: "Chercher",
    clear: "Effacer",
    title: "🔬 Vétérinaire",
    desc: "Ontologie Locale + DBpedia (ES/EN/FR)",
    noResults: (q) => `Aucun résultat trouvé pour "${q}"`,
    tabAll: "Tous",
    tabLocal: "Local",
    tabDB: "DBpedia",
    species: "Espèce",
    category: "Catégorie",
  },
};

/* ============================================================
   STOPWORDS
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
   MAPA MULTILINGÜE ESPECIES
   ============================================================ */
const speciesMap = {
  perro: { local: "Perro", db: "dog" },
  dogs: { local: "Perro", db: "dog" },
  chien: { local: "Perro", db: "dog" },
  gato: { local: "Gato", db: "cat" },
  chat: { local: "Gato", db: "cat" },
  caballo: { local: "Caballo", db: "horse" },
  cheval: { local: "Caballo", db: "horse" },
  vaca: { local: "Vaca", db: "cow" },
  vache: { local: "Vaca", db: "cow" },
  cerdo: { local: "Cerdo", db: "pig" },
  porc: { local: "Cerdo", db: "pig" },
};

/* ============================================================
   MAPA SEMÁNTICO (ENFERMEDADES / RAZAS)
   ============================================================ */
const semanticMap = {
  parvovirose: "parvovirus",
  parvovirus: "parvovirus",
  distemper: "moquillo",
  "maladie de carré": "moquillo",
  rabies: "rabia",
  rage: "rabia",
  rabia: "rabia",
  breed: "breed",
  raza: "breed",
  race: "breed",
};

/* ============================================================
   COMPONENTE PRINCIPAL
   ============================================================ */
export default function BarraBusqueda() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("todos");

  // idioma actual
  const [lang, setLang] = useState("es");

  /* ============================================================
     AUTO-RECARGAR RESULTADOS AL CAMBIAR IDIOMA
     ============================================================ */
  useEffect(() => {
    if (query.trim() !== "") {
      handleSearch();
    }
  }, [lang]);

  function isBreedSearch(text) {
    return ["breed", "raza", "race"].some((w) =>
      text.toLowerCase().includes(w)
    );
  }

  function detectSpecies(term) {
    const words = term.toLowerCase().split(/\s+/);
    for (const w of words) if (speciesMap[w]) return speciesMap[w];
    return null;
  }

  /* ============================================================
     FUNCIÓN PRINCIPAL DE BÚSQUEDA
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
    const breedMode = isBreedSearch(qNorm);

    try {
      /* 🔍 BÚSQUEDA LOCAL */
      const resLocal = await buscarOntologia(
        species ? species.local : qNorm,
        lang
      );
      const local = (resLocal.results || []).map((x) => ({
        ...x,
        fuente: "local",
        idioma: lang,
      }));

      /* 🌐 DBPEDIA */
      let tokens = tokenizarBusqueda(qNorm);
      if (breedMode) tokens = ["breed", "dog", "cat", ...tokens];

      const resDB = await buscarDBpedia(qNorm, tokens, lang);
      const dbpedia = (resDB.results || []).map((x) => ({
        ...x,
        fuente: "dbpedia",
        idioma: lang,
      }));

      const all = [...local, ...dbpedia];
      setResults(all);

      if (all.length === 0) setError(ui[lang].noResults(q));
    } catch (err) {
      console.error(err);
      setError("Error ejecutando búsqueda");
    }

    setLoading(false);
  }

  const local = results.filter((r) => r.fuente === "local");
  const dbpedia = results.filter((r) => r.fuente === "dbpedia");
  const visible = tab === "todos" ? results : tab === "local" ? local : dbpedia;

  const t = ui[lang];

  return (
    <section className="vet-container">
      <header className="vet-header">
        <div className="header-row">
          <div>
            <h1 className="vet-title">{t.title}</h1>
            <p className="vet-desc">{t.desc}</p>
          </div>

          {/* Banderas reales */}
          <div className="lang-flags">
            <img
              src="/flags/ES.jpg"
              className={lang === "es" ? "flag active" : "flag"}
              onClick={() => setLang("es")}
            />
            <img
              src="/flags/EN.png"
              className={lang === "en" ? "flag active" : "flag"}
              onClick={() => setLang("en")}
            />
            <img
              src="/flags/FR.jpg"
              className={lang === "fr" ? "flag active" : "flag"}
              onClick={() => setLang("fr")}
            />
          </div>
        </div>
      </header>

      {/* Search bar */}
      <div className="vet-search-wrap">
        <div className="vet-search-bar">
          <input
            className="vet-search-input"
            placeholder={t.placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />

          <button className="vet-search-btn" onClick={handleSearch}>
            {t.search}
          </button>

          <button
            className="vet-reset-btn"
            onClick={() => {
              setQuery("");
              setResults([]);
              setError("");
            }}
          >
            {t.clear}
          </button>
        </div>
      </div>

      {loading && <p className="vet-status">🔍 ...</p>}
      {error && <p className="vet-error">⚠ {error}</p>}

      {/* TABS */}
      {results.length > 0 && (
        <div className="tabs-container">
          <button
            className={tab === "todos" ? "tab-btn active" : "tab-btn"}
            onClick={() => setTab("todos")}
          >
            {t.tabAll} ({results.length})
          </button>
          <button
            className={tab === "local" ? "tab-btn active" : "tab-btn"}
            onClick={() => setTab("local")}
          >
            {t.tabLocal} ({local.length})
          </button>
          <button
            className={tab === "dbpedia" ? "tab-btn active" : "tab-btn"}
            onClick={() => setTab("dbpedia")}
          >
            {t.tabDB} ({dbpedia.length})
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
            </div>

            {item.fuente === "local" && (
              <>
                {item.especie && (
                  <p>
                    <strong>{t.species}:</strong> {item.especie}
                  </p>
                )}
                {item.categoria && (
                  <p>
                    <strong>{t.category}:</strong> {item.categoria}
                  </p>
                )}
              </>
            )}

            {item.fuente === "dbpedia" && (
              <>
                {item.thumbnail && (
                  <img src={item.thumbnail} className="thumbnail" />
                )}
                {item.descripcion && <p>{item.descripcion}</p>}
                {item.dbpedia_uri && (
                  <a
                    href={item.dbpedia_uri}
                    target="_blank"
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
