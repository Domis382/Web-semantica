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

// Endpoint de búsqueda
app.get("/api/search", (req, res) => {
  const q = req.query.q || "";
  const results = searchConcepts(q);
  res.json({ query: q, count: results.length, results });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend escuchando en http://localhost:${PORT}`);
});
