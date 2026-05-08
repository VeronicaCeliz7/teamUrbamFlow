const User = require('../models/User');

const adminMiddleware = async (req, res, next) => {
    try {
        const user = await User.findOne({ clerkUserId: req.auth.userId });
        if (!user || user.rol !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
        }
        req.user = user;
        next();
    } catch (error) {
        res.status(500).json({ error: 'Error al verificar permisos' });
    }
};

module.exports = { adminMiddleware };