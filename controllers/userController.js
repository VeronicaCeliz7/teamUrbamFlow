const User = require('../models/User');
const { createClerkClient } = require('@clerk/clerk-sdk-node');

// Obtener o crear perfil del usuario autenticado
const getProfile = async (req, res) => {
    try {
        let user = await User.findOne({ clerkUserId: req.auth.userId });
        
        if (!user) {
            const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
            const clerkUser = await clerk.users.getUser(req.auth.userId);
            
            user = new User({
                clerkUserId: req.auth.userId,
                email: clerkUser.emailAddresses[0]?.emailAddress,
                nombre: clerkUser.firstName || '',
                apellido: clerkUser.lastName || '',
                ultimoAcceso: new Date()
            });
            await user.save();
            console.log(`📝 Nuevo usuario creado: ${user.email}`);
        } else {
            user.ultimoAcceso = new Date();
            await user.save();
        }
        
        res.json({ success: true, data: user });
    } catch (error) {
        console.error('Error en perfil:', error);
        res.status(500).json({ error: 'Error al obtener perfil' });
    }
};

// Actualizar usuario actual
const updateProfile = async (req, res) => {
    try {
        const { nombre, apellido, edad, telefono, direccion, ciudad, pais, preferencias } = req.body;
        
        const user = await User.findOneAndUpdate(
            { clerkUserId: req.auth.userId },
            { 
                nombre, 
                apellido, 
                edad, 
                telefono, 
                direccion, 
                ciudad, 
                pais,
                preferencias,
                updatedAt: Date.now() 
            },
            { new: true, runValidators: true }
        );
        
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json({ success: true, data: user });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
};

// Eliminar usuario (soft delete)
const deleteProfile = async (req, res) => {
    try {
        const user = await User.findOneAndUpdate(
            { clerkUserId: req.auth.userId },
            { activo: false, updatedAt: Date.now() },
            { new: true }
        );
        
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json({ success: true, message: 'Usuario desactivado correctamente' });
    } catch (error) {
        console.error('Error al desactivar usuario:', error);
        res.status(500).json({ error: 'Error al desactivar usuario' });
    }
};

// Obtener todos los usuarios (admin)
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.json({ 
            success: true, 
            count: users.length,
            data: users 
        });
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
};

// Obtener usuario por ID (admin)
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener usuario' });
    }
};

// Actualizar rol de usuario (admin)
const updateUserRole = async (req, res) => {
    try {
        const { rol } = req.body;
        if (!['user', 'admin', 'moderador'].includes(rol)) {
            return res.status(400).json({ error: 'Rol inválido' });
        }
        
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { rol, updatedAt: Date.now() },
            { new: true }
        );
        
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar rol' });
    }
};

// Eliminar usuario permanentemente (admin)
const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json({ success: true, message: 'Usuario eliminado permanentemente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    deleteProfile,
    getAllUsers,
    getUserById,
    updateUserRole,
    deleteUser
};