import axios from "axios";
import qs from "qs";
const FUSEKI_URL = "http://localhost:3030/Veterinaria/query"; // URL CORRECTA

export async function buscarEnfermedadesPorCategoria() {
  const sparql = `
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX : <http://www.semanticweb.org/erikachino/ontologies/2025/8/veterinaria/>

    SELECT ?enfermedad ?categoria 
    WHERE { 
      ?enfermedad rdf:type :Enfermedad . 
      ?enfermedad :CategoriaEnfermedad ?categoria . 
      FILTER(regex(str(?categoria), "Viral", "i")) 
    }
  `;

  const response = await axios.get(FUSEKI_URL, {
    params: { query: sparql },
    headers: { Accept: "application/json" },
  });

  return response.data;
}




export async function ejecutarConsultaDinamica(sparql) {
  const response = await axios.post(FUSEKI_URL, qs.stringify({ query: sparql }), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
  });

  return response.data;
}
