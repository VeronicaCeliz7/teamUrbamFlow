const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/auth');
const { adminMiddleware } = require('../middleware/admin');
const reporteController = require('../controllers/reporteController');

// Rutas protegidas
router.post('/', authMiddleware, reporteController.createReporte);
router.get('/mis-reportes', authMiddleware, reporteController.getMisReportes);

// Tomar incidente por operador
router.put('/:id/tomar', authMiddleware, reporteController.tomarReporte);
router.patch('/:id/tomar', authMiddleware, reporteController.tomarReporte);

// CRUD reportes
router.get('/:id', authMiddleware, reporteController.getReporteById);
router.put('/:id', authMiddleware, reporteController.updateReporte);
router.delete('/:id', authMiddleware, reporteController.deleteReporte);

// Ruta pública
router.get('/', reporteController.getReportes);

// IA / Admin
router.put(
  '/:id/categoria-ia',
  authMiddleware,
  adminMiddleware,
  reporteController.updateCategoriaIA
);

module.exports = router;