const { createClerkClient } = require('@clerk/clerk-sdk-node');
const User = require('../models/User');
const jwt = require('jsonwebtoken'); // 👈 AGREGAR ESTA LÍNEA

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
        
        // 🔄 SINCRONIZACIÓN AUTOMÁTICA
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
                    createdAt: new Date(),
                    rol: 'user' // 👈 Agregar rol por defecto
                });
                
                await user.save();
                console.log(`✅ Usuario sincronizado correctamente: ${user.email}`);
            } else {
                console.log(`✅ Usuario ya existe en MongoDB: ${user.email}`);
                user.ultimoAcceso = new Date();
                await user.save();
            }
            
            // Guardar el usuario en req para usarlo en los controladores
            req.user = user;
            console.log('👤 USUARIO LOGUEADO');
            console.log(user);
            // 🍪 NUEVO: Generar cookie propia (urbanflow_session)
            // Esta cookie contendrá la información del usuario
            const sessionToken = jwt.sign(
                { 
                    userId: user.clerkUserId, 
                    email: user.email, 
                    rol: user.rol 
                },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );
            
            // Establecer la cookie en el navegador
            res.cookie('urbanflow_session', sessionToken, {
                httpOnly: true,        // No accesible por JavaScript (seguro)
                secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
                sameSite: 'lax',       // Protección CSRF
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
            });
            
            console.log(`🍪 Cookie generada para: ${user.email}`);
            
        } catch (syncError) {
            console.error('❌ Error en sincronización automática:', syncError);
        }
        
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = { authMiddleware };