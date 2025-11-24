import express from "express";
import { 
  obtenerEnfermedadesVirales,
  consultaSPARQL
} from "./ontologie.controller.js";

const router = express.Router();

// Consulta de prueba
router.get("/test", obtenerEnfermedadesVirales);

// Consultas SPARQL dinámicas
router.post("/query", consultaSPARQL);

export default router;
