const express = require('express');
const router = express.Router();

const {
    clasificarIncidente
} = require('../controllers/iaController');

router.post('/clasificar', clasificarIncidente);

module.exports = router;