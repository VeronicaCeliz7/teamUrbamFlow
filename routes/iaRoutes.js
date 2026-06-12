const express = require('express');
const router = express.Router();

// IA clásica temporalmente desactivada porque iaController.js tiene error de sintaxis.
// Cuando se corrija iaController.js, se vuelve a importar:
// const {
//   clasificarIncidente,
//   reclasificarIncidentes,
//   detectarDuplicado
// } = require('../controllers/iaController');

const {
  vectorizarReporte,
  vectorizarPendientes,
  buscarSimilares,
  heatmapData
} = require('../controllers/embeddingController');

router.post('/clasificar', (req, res) => {
  res.status(503).json({
    ok: false,
    mensaje: 'Clasificación IA temporalmente desactivada'
  });
});

router.post('/duplicado', (req, res) => {
  res.status(503).json({
    ok: false,
    mensaje: 'Detección de duplicados temporalmente desactivada'
  });
});

router.post('/reclasificar', (req, res) => {
  res.status(503).json({
    ok: false,
    mensaje: 'Reclasificación IA temporalmente desactivada'
  });
});

router.post('/vectorizar', vectorizarReporte);
router.post('/vectorizar-pendientes', vectorizarPendientes);
router.post('/similares', buscarSimilares);
router.get('/heatmap', heatmapData);

module.exports = router;