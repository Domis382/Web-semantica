import { 
  buscarEnfermedadesPorCategoria,
  ejecutarConsultaDinamica 
} from "./ontologie.service.js";

export const obtenerEnfermedadesVirales = async (req, res) => {
  try {
    const data = await buscarEnfermedadesPorCategoria();
    res.json({
      ok: true,
      results: data,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Error ejecutando consulta estática",
      error: error.message,
    });
  }
};

export const consultaSPARQL = async (req, res) => {
  const { sparql } = req.body;

  if (!sparql) {
    return res.status(400).json({
      ok: false,
      message: "Debes enviar un campo 'sparql' en el body",
    });
  }

  try {
    const data = await ejecutarConsultaDinamica(sparql);
    res.json({
      ok: true,
      results: data,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Error ejecutando consulta dinámica",
      error: error.message,
    });
  }
};
