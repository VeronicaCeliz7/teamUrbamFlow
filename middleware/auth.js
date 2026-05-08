const { createClerkClient } = require('@clerk/clerk-sdk-node');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const token = authHeader.split(' ')[1];
        const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
        
        const payload = await clerk.verifyToken(token);
        req.auth = { userId: payload.sub };
        
        // 🔄 SINCRONIZACIÓN AUTOMÁTICA - Esta es la parte clave
        try {
            console.log(`🔄 Verificando usuario en MongoDB: ${payload.sub}`);
            
            let user = await User.findOne({ clerkUserId: payload.sub });
            
            if (!user) {
                console.log(`👤 Usuario no encontrado, sincronizando desde Clerk: ${payload.sub}`);
                
                const clerkUser = await clerk.users.getUser(payload.sub);
                console.log(`📧 Email obtenido de Clerk: ${clerkUser.emailAddresses[0]?.emailAddress}`);
                
                user = new User({
                    clerkUserId: payload.sub,
                    email: clerkUser.emailAddresses[0]?.emailAddress || '',
                    nombre: clerkUser.firstName || '',
                    apellido: clerkUser.lastName || '',
                    ultimoAcceso: new Date(),
                    activo: true,
                    createdAt: new Date()
                });
                
                await user.save();
                console.log(`✅ Usuario sincronizado correctamente: ${user.email}`);
            } else {
                console.log(`✅ Usuario ya existe en MongoDB: ${user.email}`);
                // Actualizar último acceso
                user.ultimoAcceso = new Date();
                await user.save();
            }
            
            // Guardar el usuario en req para usarlo en los controladores
            req.user = user;
            
        } catch (syncError) {
            console.error('❌ Error en sincronización automática:', syncError);
            // No bloqueamos la request, pero logueamos el error
        }
        
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = { authMiddleware };