const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { adminMiddleware } = require('../middleware/admin');
const reporteController = require('../controllers/reporteController');

// Rutas protegidas (requieren autenticación)
router.post('/', authMiddleware, reporteController.createReporte);
router.get('/mis-reportes', authMiddleware, reporteController.getMisReportes);
router.get('/workflow/metricas', authMiddleware, reporteController.getMetricasWorkflow);

router.patch('/:id/tomar', authMiddleware, reporteController.tomarReporte);
router.patch('/:id/estado', authMiddleware, reporteController.cambiarEstadoReporte);

router.patch(
  '/:id/asignar-operador',
  authMiddleware,
  reporteController.asignarOperador
);

router.patch(
  '/:id/vincular',
  authMiddleware,
  reporteController.vincularIncidente
);

router.get('/:id', authMiddleware, reporteController.getReporteById);
router.put('/:id', authMiddleware, reporteController.updateReporte);
router.delete('/:id', authMiddleware, reporteController.deleteReporte);

// Ruta pública (para ver reportes en el mapa sin login)
router.get('/', reporteController.getReportes);

// Ruta de admin para actualizar categorías con IA
router.put('/:id/categoria-ia', authMiddleware, adminMiddleware, reporteController.updateCategoriaIA);


module.exports = router;