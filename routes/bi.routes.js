const express = require("express");
const router = express.Router();

const {
  getBiHealth,
  getBiDashboard,
  getBiIncidentes,
  getBiUsuarios,
  getBiClientes,
} = require("../controllers/bi.controller");

const {
  validatePowerBiApiKey,
} = require("../middleware/apiKey.middleware");

// Scope exclusivo BI:
// urbanflow.bi.read
//
// Todos los endpoints son GET.
// Power BI solo puede leer datos.
// No se expone conexión directa a MongoDB.

router.get("/health", validatePowerBiApiKey, getBiHealth);
router.get("/dashboard", validatePowerBiApiKey, getBiDashboard);
router.get("/incidentes", validatePowerBiApiKey, getBiIncidentes);
router.get("/usuarios", validatePowerBiApiKey, getBiUsuarios);
router.get("/clientes", validatePowerBiApiKey, getBiClientes);

module.exports = router;