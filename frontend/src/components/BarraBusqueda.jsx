import React, { useState } from "react";
import { buscarOntologia } from "../api";
import "./Barrabusqueda.css";

export default function BarraBusqueda() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      const data = await buscarOntologia(q);
      setResults(data.results || []);
    } catch (err) {
      console.error(err);
      setError("No se pudo consultar la ontología");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setQuery("");
    setResults([]);
    setError("");
  }

  return (
    <section className="vet-container">
      <header className="vet-header">
        <h1 className="vet-title">Veterinaria</h1>
        <p className="vet-desc">
          Buscador conectado a la ontología Veterinaria.rdf
        </p>
      </header>

      {/* Barra de búsqueda */}
      <div className="vet-search-wrap">
        <div className="vet-search-bar">
          <input
            className="vet-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar enfermedades, especies..."
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
      {loading && <p className="vet-status">Buscando en la ontología…</p>}
      {error && <p className="vet-status vet-error">{error}</p>}

      {/* Resultados */}
      <div className="cards-grid">
        {results.map((item) => (
          <article className="card" key={item.uri}>
            <div className="card-top">
              <span className="card-bullet">|</span>
              <h3 className="card-title">{item.nombre || "Sin nombre"}</h3>
            </div>

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
          </article>
        ))}
      </div>
    </section>
  );
}
