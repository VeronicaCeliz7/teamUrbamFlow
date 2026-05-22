const express = require('express');
const router = express.Router();

const {
    getSuperDashboard,
    getSuperClientes,
    getSuperUsuarios,
    getSuperReportes
} = require('../controllers/superController');

router.get('/dashboard', getSuperDashboard);
router.get('/clientes', getSuperClientes);
router.get('/usuarios', getSuperUsuarios);
router.get('/reportes', getSuperReportes);

module.exports = router;