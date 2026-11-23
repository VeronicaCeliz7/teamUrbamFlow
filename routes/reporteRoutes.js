const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/auth');
const { adminMiddleware } = require('../middleware/admin');
const reporteController = require('../controllers/reporteController');

// Rutas públicas / catálogos maestros
router.get('/catalogos', reporteController.getCatalogos);
router.get('/', reporteController.getReportes);

// Rutas protegidas
router.post('/', authMiddleware, reporteController.createReporte);
router.get('/mis-reportes', authMiddleware, reporteController.getMisReportes);

// Tomar incidente por operador / cambiar estado / asignar operador
router.put('/:id/tomar', authMiddleware, reporteController.tomarReporte);
router.put('/:id/estado', authMiddleware, reporteController.cambiarEstadoReporte);
router.put('/:id/asignar-operador', authMiddleware, reporteController.asignarOperador);

// CRUD reportes
router.get('/:id', authMiddleware, reporteController.getReporteById);
router.put('/:id', authMiddleware, reporteController.updateReporte);
router.delete('/:id', authMiddleware, reporteController.deleteReporte);

// IA / Admin
router.put(
  '/:id/categoria-ia',
  authMiddleware,
  adminMiddleware,
  reporteController.updateCategoriaIA
);

module.exports = router;