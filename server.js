require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { clerkClient, createClerkClient } = require('@clerk/clerk-sdk-node');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Middleware manual para verificar el token
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const token = authHeader.split(' ')[1];
        const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
        
        // Verificar el token
        const payload = await clerk.verifyToken(token);
        req.auth = { userId: payload.sub };
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Ruta pública para probar
app.get('/api/health', (req, res) => {
    res.json({ status: 'Backend funcionando' });
});

// Ruta protegida - requiere autenticación
app.get('/api/protected', authMiddleware, (req, res) => {
    res.json({
        mensaje: "¡Funciona! Este es tu JSON",
        userId: req.auth.userId,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Backend corriendo en http://localhost:${PORT}`);
    console.log(`📡 Probar salud: http://localhost:${PORT}/api/health`);
    console.log(`🔒 Ruta protegida: http://localhost:${PORT}/api/protected`);
});