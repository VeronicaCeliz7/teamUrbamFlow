const express = require("express");
const router = express.Router();

const {
  getBiHealth,
  getBiDashboard,
  getBiIncidentes,
  getBiUsuarios,
  getBiClientes,
  getBiEstados,
  getBiCategorias,
  getBiAsignaciones,
} = require("../controllers/bi.controller");

const {
  validatePowerBiApiKey,
} = require("../middleware/apiKey.middleware");

// ==============================================
// SCOPE EXCLUSIVO BI: urbanflow.bi.read
// ==============================================
// Todos los endpoints son GET.
// Power BI solo puede leer datos.
// No se expone conexión directa a MongoDB.
// ==============================================

// Health check (para verificar conectividad)
router.get("/health", validatePowerBiApiKey, getBiHealth);

// Dashboard consolidado (resumen de KPIs)
router.get("/dashboard", validatePowerBiApiKey, getBiDashboard);

// Incidentes (tabla de hechos principal)
router.get("/incidentes", validatePowerBiApiKey, getBiIncidentes);

// Usuarios (dimensión)
router.get("/usuarios", validatePowerBiApiKey, getBiUsuarios);

// Clientes (dimensión)
router.get("/clientes", validatePowerBiApiKey, getBiClientes);

// Estados (dimensión)
router.get("/estados", validatePowerBiApiKey, getBiEstados);

// Categorías (dimensión)
router.get("/categorias", validatePowerBiApiKey, getBiCategorias);

// Asignaciones (reporte de incidentes por operador)
router.get("/asignaciones", validatePowerBiApiKey, getBiAsignaciones);

module.exports = router;