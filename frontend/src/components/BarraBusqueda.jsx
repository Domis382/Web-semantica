import React, { useState } from "react";
import './Barrabusqueda.css';

export default function BarraBusqueda() {
  const [query, setQuery] = useState('');
  const [filteredCards, setFilteredCards] = useState(null);
  const cards = [
    {
      title: 'Perro',
      diseases: ['Moquilo', 'Cancer', 'Rabia']
    },
    {
      title: 'Gato',
      diseases: ['Leucemia', 'Panleucopenia', 'Rabia']
    },
    {
      title: 'Caballo',
      diseases: ['Cólera', 'Tétanos', 'Encefalitis']
    },
    {
      title: 'Vaca',
      diseases: ['Brucelosis', 'Tuberculosis', 'Fiebre Aftosa']
    },
    {
      title: 'Cerdo',
      diseases: ['PRRS', 'Peste Porcina', 'Rinitis']
    }
  ];

  return (
    <section className="vet-container">
      <header className="vet-header">
        <h1 className="vet-title">Veterinaria</h1>
        <p className="vet-desc">Esta ontologia trae nueva infromacion</p>
      </header>

      {/* Search bar (static for now) */}
      <div className="vet-search-wrap">
        <div className="vet-search-bar">
          <input
            className="vet-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar mascotas, enfermedades..."
            aria-label="Buscar"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                // trigger search on Enter
                const q = query.trim().toLowerCase();
                if (!q) {
                  setFilteredCards(null);
                } else {
                  setFilteredCards(
                    cards.filter((c) =>
                      c.title.toLowerCase().includes(q) ||
                      c.diseases.some((d) => d.toLowerCase().includes(q))
                    )
                  );
                }
              }
            }}
          />
          <div style={{display: 'flex', gap: 8}}>
            <button
              className="vet-search-btn"
              type="button"
              aria-label="Buscar"
              onClick={() => {
                const q = query.trim().toLowerCase();
                if (!q) {
                  setFilteredCards(null);
                } else {
                  setFilteredCards(
                    cards.filter((c) =>
                      c.title.toLowerCase().includes(q) ||
                      c.diseases.some((d) => d.toLowerCase().includes(q))
                    )
                  );
                }
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M21 21l-4.35-4.35" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="11" cy="11" r="5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              className="vet-reset-btn"
              type="button"
              onClick={() => {
                setQuery('');
                setFilteredCards(null);
              }}
            >
              Mostrar todos
            </button>
          </div>
        </div>
      </div>

      <div className="cards-grid">
        {(filteredCards ?? cards).map((card) => (
          <article className="card" key={card.title}>
            <div className="card-top">
              <span className="card-bullet">|</span>
              <h3 className="card-title">{card.title}</h3>
            </div>
            <ul className="disease-list">
              {card.diseases.map((d) => (
                <li key={d} className="disease-item">{d}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}