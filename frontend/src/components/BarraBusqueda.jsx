import React, { useState } from "react";
import { buscarOntologia, buscarDBpedia } from "../api";
import "./Barrabusqueda.css";
//
// Función para tokenizar búsqueda (elimina stopwords)
function tokenizarBusqueda(termino) {
  const stopwords = new Set([
    "de", "del", "con", "sin", "para", "por", "y", "o", "u",
    "el", "la", "los", "las", "un", "una", "unos", "unas",
    "al", "a", "en", "sobre", "bajo", "entre", "desde", "hasta",
    "que", "como", "muy", "mas", "pero", "si", "no"
  ]);
  
  return termino
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length >= 2 && !stopwords.has(word));
}

export default function BarraBusqueda() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("todos"); // "todos", "local", "dbpedia"

  // Mapas para forzar búsquedas por especie
  const speciesMap = {
    canino: { local: 'Perro', db: 'dog' },
    caninos: { local: 'Perro', db: 'dog' },
    perro: { local: 'Perro', db: 'dog' },
    perros: { local: 'Perro', db: 'dog' },
    felino: { local: 'Gato', db: 'cat' },
    felinos: { local: 'Gato', db: 'cat' },
    gato: { local: 'Gato', db: 'cat' },
    gatos: { local: 'Gato', db: 'cat' },
    ave: { local: 'Aves', db: 'bird' },
    aves: { local: 'Aves', db: 'bird' },
    caballo: { local: 'Caballo', db: 'horse' },
    caballos: { local: 'Caballo', db: 'horse' },
    vaca: { local: 'Vaca', db: 'cow' },
    vacas: { local: 'Vaca', db: 'cattle' },
    cerdo: { local: 'Cerdo', db: 'pig' },
    cerdos: { local: 'Cerdo', db: 'pig' }
  };

  function detectSpecies(term) {
    const words = term.toLowerCase().split(/\s+/);
    for (const w of words) {
      if (speciesMap[w]) return speciesMap[w];
    }
    return null;
  }

  async function handleSearch() {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setError("");
      return;
    }

    try {
      setLoading(true);
      setError("");
      // Detectar si la búsqueda menciona una especie (caninos, felinos, aves, etc.)
      const species = detectSpecies(q);

      // Tokenizar la búsqueda
      const tokens = tokenizarBusqueda(q);

      // Si detectamos especie, forzamos la búsqueda local por la especie y
      // enriquecemos tokens para DBpedia (p.ej. dog + disease)
      let dataLocal;
      if (species) {
        // Buscar localmente usando el nombre local (p.ej. 'Perro')
        dataLocal = await buscarOntologia(species.local);
      } else {
        // Buscar en ontología local con la consulta original
        dataLocal = await buscarOntologia(q);
      }
      const localResults = (dataLocal.results || []).map(item => ({
        ...item,
        fuente: "local"
      }));
      
      // Buscar en DBpedia (con tokens)
      let dbpediaResults = [];
      try {
        // Preparar tokens DBpedia: si detectamos especie, añadir token de especie,
        // 'veterinary' y 'disease' para reforzar contexto veterinario
        let dbTokens = tokens.slice();
        if (species) {
          // poner token de especie en inglés al inicio y añadir 'veterinary' y 'disease'
          const extras = [species.db, 'veterinary', 'disease'];
          dbTokens = [...extras, ...dbTokens.filter(t => !extras.includes(t))];
        }
        const dataDBpedia = await buscarDBpedia(q, dbTokens);
        dbpediaResults = (dataDBpedia.results || []).map(item => ({
          ...item,
          fuente: "dbpedia"
        }));
      } catch (dbErr) {
        console.warn("DBpedia no disponible:", dbErr);
      }
      
      // Combinar resultados: locales primero, luego DBpedia
      setResults([...localResults, ...dbpediaResults]);
      
      if (localResults.length === 0 && dbpediaResults.length === 0) {
        setError(`No se encontraron resultados para "${q}"`);
      }
    } catch (err) {
      console.error(err);
      setError("Error al consultar la ontología");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setQuery("");
    setResults([]);
    setError("");
    setActiveTab("todos");
  }

  // Filtrar resultados por fuente
  const localResults = results.filter(r => r.fuente === "local");
  const dbpediaResults = results.filter(r => r.fuente === "dbpedia");
  
  const filteredResults = 
    activeTab === "todos" ? results :
    activeTab === "local" ? localResults :
    dbpediaResults;

  return (
    <section className="vet-container">
      <header className="vet-header">
        <h1 className="vet-title">🔬 Veterinaria</h1>
        <p className="vet-desc">
          Buscador semántico - Ontología local + DBpedia
        </p>
      </header>

      {/* Barra de búsqueda */}
      <div className="vet-search-wrap">
        <div className="vet-search-bar">
          <input
            className="vet-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar enfermedades, especies, tratamientos..."
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
          />

          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="vet-search-btn"
              type="button"
              onClick={handleSearch}
            >
              Buscar
            </button>
            <button
              className="vet-reset-btn"
              type="button"
              onClick={handleReset}
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Estado de carga / error */}
      {loading && <p className="vet-status">🔍 Buscando en la ontología y DBpedia…</p>}
      {error && <p className="vet-status vet-error">⚠️ {error}</p>}

      {/* Filtros por fuente */}
      {results.length > 0 && (
        <div className="tabs-container">
          <button
            className={`tab-btn ${activeTab === "todos" ? "active" : ""}`}
            onClick={() => setActiveTab("todos")}
          >
            Todos ({results.length})
          </button>
          <button
            className={`tab-btn ${activeTab === "local" ? "active" : ""}`}
            onClick={() => setActiveTab("local")}
          >
            Local ({localResults.length})
          </button>
          <button
            className={`tab-btn ${activeTab === "dbpedia" ? "active" : ""}`}
            onClick={() => setActiveTab("dbpedia")}
          >
            DBpedia ({dbpediaResults.length})
          </button>
        </div>
      )}

      {/* Resultados */}
      <div className="cards-grid">
        {filteredResults.map((item, idx) => (
          <article 
            className={`card ${item.fuente === "dbpedia" ? "card-dbpedia" : "card-local"}`}
            key={`${item.fuente}-${item.uri || idx}`}
          >
            <div className="card-top">
              <span className="card-bullet">|</span>
              <h3 className="card-title">{item.nombre || "Sin nombre"}</h3>
              <span className={`source-badge source-${item.fuente}`}>
                {item.fuente === "local" ? "LOCAL" : "DBPEDIA"}
              </span>
            </div>

            {/* Resultados locales */}
            {item.fuente === "local" && (
              <>
                {item.especie && (
                  <p className="disease-item">
                    <strong>Especie afectada:</strong> {item.especie}
                  </p>
                )}

                {item.categoria && (
                  <p className="disease-item">
                    <strong>Categoría:</strong> {item.categoria}
                  </p>
                )}

                {item.sintomas && item.sintomas.length > 0 && (
                  <ul className="disease-list">
                    {item.sintomas.map((s) => (
                      <li key={s} className="disease-item">
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {/* Resultados DBpedia */}
            {item.fuente === "dbpedia" && (
              <>
                {item.thumbnail && (
                  <div className="thumbnail-container">
                    <img 
                      src={item.thumbnail} 
                      alt={item.nombre}
                      onError={(e) => e.target.style.display = "none"}
                    />
                  </div>
                )}
                
                {item.descripcion && (
                  <p className="db-description disease-item">
                    <strong>Descripción:</strong> {item.descripcion}
                  </p>
                )}

                {item.atributos && Object.keys(item.atributos).length > 0 && (
                  <div className="attributes">
                    {Object.entries(item.atributos).map(([key, value]) => (
                      <p key={key} className="disease-item">
                        <strong>{key}:</strong> {Array.isArray(value) ? value.join(", ") : value}
                      </p>
                    ))}
                  </div>
                )}

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

      {results.length === 0 && !loading && !error && (
        <div className="no-results">
          <p>📝 Escribe un término para comenzar la búsqueda</p>
        </div>
      )}
    </section>
  );
}