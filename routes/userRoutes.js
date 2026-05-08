const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { adminMiddleware } = require('../middleware/admin');
const userController = require('../controllers/userController');

// Rutas de perfil propio
router.get('/profile', authMiddleware, userController.getProfile);
router.put('/profile', authMiddleware, userController.updateProfile);
router.delete('/profile', authMiddleware, userController.deleteProfile);

// Rutas de admin
router.get('/', authMiddleware, adminMiddleware, userController.getAllUsers);
router.get('/:id', authMiddleware, adminMiddleware, userController.getUserById);
router.put('/:id/role', authMiddleware, adminMiddleware, userController.updateUserRole);
router.delete('/:id', authMiddleware, adminMiddleware, userController.deleteUser);

module.exports = router;