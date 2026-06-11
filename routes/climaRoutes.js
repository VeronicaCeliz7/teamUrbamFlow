const express = require('express');
const router = express.Router();

const {
  obtenerPronostico,
  obtenerRiesgoClimatico
} = require('../controllers/climaController');

router.get('/pronostico', obtenerPronostico);

router.get('/riesgo', obtenerRiesgoClimatico);

module.exports = router;