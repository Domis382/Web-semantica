import React, { useState } from "react";
import { buscarOntologia, buscarDBpedia } from "../api";
import "./Barrabusqueda.css";

/* ============================================================
   🔤 0. UI MULTILINGÜE (ES / EN / FR)
   ============================================================ */
const ui = {
  es: {
    placeholder: "Buscar enfermedades, razas, síntomas…",
    search: "Buscar",
    clear: "Limpiar",
    title: "🔎 Buscador Veterinario Semántico",
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
    title: "🔎 Veterinary Semantic Search",
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
    title: "🔎 Recherche Sémantique Vétérinaire",
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
  // Parvo
  parvovirose: "parvovirus",
  "canine parvovirus": "parvovirus",
  parvovirus: "parvovirus",
  parvo: "parvovirus",
  cpv: "parvovirus",

  // Moquillo
  distemper: "moquillo",
  "maladie de carré": "moquillo",
  moquillo: "moquillo",

  // Rabia
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

/* ============================================================
   ⭐ 4. COMPONENTE PRINCIPAL
   ============================================================ */
export default function BarraBusqueda() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("todos");

  // 🌍 idioma actual de la interfaz (no simultáneo)
  const [lang, setLang] = useState("es");

  /* ============================================================
     ⭐ 5. DETECTAR SI EL USUARIO BUSCA UNA RAZA
     ============================================================ */
  function isBreedSearch(texto) {
    return ["breed", "raza", "race", "race de chien", "race de chat"].some(
      (w) => texto.toLowerCase().includes(w)
    );
  }

  /* ============================================================
     ⭐ 6. DETECTAR ESPECIE
     ============================================================ */
  function detectSpecies(term) {
    const words = term.toLowerCase().split(/\s+/);
    for (const w of words) {
      if (speciesMap[w]) return speciesMap[w];
    }
    return null;
  }

  /* ============================================================
     ⭐ 7. FUNCIÓN PRINCIPAL DE BÚSQUEDA
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

    // Normalizar semanticamente (parvo, moquillo, rage, rabies…)
    const qNorm = semanticMap[q.toLowerCase()] || q;
    const species = detectSpecies(qNorm);
    const breedMode = isBreedSearch(qNorm);

    try {
      /* ==============================
         🔍 BÚSQUEDA LOCAL (ONTOLOGÍA)
         ============================== */
      let local = [];
      if (species) {
        const res = await buscarOntologia(species.local, lang);
        local = (res.results || []).map((x) => ({
          ...x,
          fuente: "local",
          idioma: lang,
        }));
      } else {
        const res = await buscarOntologia(qNorm, lang);
        local = (res.results || []).map((x) => ({
          ...x,
          fuente: "local",
          idioma: lang,
        }));
      }

      /* ==============================
         🔎 BÚSQUEDA EN DBPEDIA
         ============================== */
      let tokens = tokenizarBusqueda(qNorm);

      // Forzar tokens si es búsqueda de razas
      if (breedMode) {
        tokens = ["breed", "dog", "cat", ...tokens];
      }

      const resDB = await buscarDBpedia(qNorm, tokens, lang);
      const dbpedia = (resDB.results || []).map((x) => ({
        ...x,
        fuente: "dbpedia",
        idioma: lang,
      }));

      /* ==============================
         📌 COMBINAR RESULTADOS
         ============================== */
      const all = [...local, ...dbpedia];
      setResults(all);

      if (all.length === 0) {
        setError(ui[lang].noResults(q));
      }
    } catch (err) {
      console.error(err);
      setError("Error ejecutando búsqueda");
    }

    setLoading(false);
  }

  /* ============================================================
     ⭐ 8. FILTROS POR TABS
     ============================================================ */
  const local = results.filter((r) => r.fuente === "local");
  const dbpedia = results.filter((r) => r.fuente === "dbpedia");

  const visible = tab === "todos" ? results : tab === "local" ? local : dbpedia;

  const t = ui[lang];

  return (
    <section className="vet-container">
      {/* HEADER */}
      <header className="vet-header">
        <div className="vet-header-top">
          <div>
            <h1 className="vet-title">{t.title}</h1>
            <p className="vet-desc">{t.desc}</p>
          </div>

          {/* 🌍 Selector de idioma (no simultáneo) */}
          <div className="lang-switcher">
            <button
              className={lang === "es" ? "lang-btn active" : "lang-btn"}
              onClick={() => setLang("es")}
              title="Español"
            >
              🇪🇸
            </button>

            <button
              className={lang === "en" ? "lang-btn active" : "lang-btn"}
              onClick={() => setLang("en")}
              title="English"
            >
              EN
            </button>

            <button
              className={lang === "fr" ? "lang-btn active" : "lang-btn"}
              onClick={() => setLang("fr")}
              title="Français"
            >
              🇫🇷
            </button>
          </div>
        </div>
      </header>

      {/* SEARCH BAR */}
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

      {loading && <p className="vet-status">🔍 …</p>}
      {error && <p className="vet-error">⚠ {error}</p>}

      {/* TABS */}
      {results.length > 0 && (
        <div className="tabs-container">
          <button
            className={`tab-btn ${tab === "todos" ? "active" : ""}`}
            onClick={() => setTab("todos")}
          >
            {t.tabAll} ({results.length})
          </button>
          <button
            className={`tab-btn ${tab === "local" ? "active" : ""}`}
            onClick={() => setTab("local")}
          >
            {t.tabLocal} ({local.length})
          </button>
          <button
            className={`tab-btn ${tab === "dbpedia" ? "active" : ""}`}
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
              <span className="source-badge">
                {item.fuente === "local" ? "LOCAL" : "DBPEDIA"}
              </span>
            </div>

            {/* LOCAL */}
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
