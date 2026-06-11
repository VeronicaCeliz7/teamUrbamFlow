const express = require('express');
const router = express.Router();

const {
  clasificarIncidente,
  reclasificarIncidentes
} = require('../controllers/iaController');

const {
  vectorizarReporte,
  vectorizarPendientes,
  buscarSimilares,
  heatmapData
} = require('../controllers/embeddingController');

router.post('/clasificar', clasificarIncidente);

router.post('/reclasificar', reclasificarIncidentes);

router.post('/vectorizar', vectorizarReporte);

router.post('/vectorizar-pendientes', vectorizarPendientes);

router.post('/similares', buscarSimilares);

router.get('/heatmap', heatmapData);

module.exports = router;