const express = require('express');
const router = express.Router();

const {
  clasificarIncidente,
  detectarDuplicado
} = require('../controllers/iaController');

router.post('/clasificar', clasificarIncidente);
router.post('/duplicado', detectarDuplicado);

module.exports = router;