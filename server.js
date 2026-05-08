require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Importar rutas
const userRoutes = require('./routes/userRoutes');
const reporteRoutes = require('./routes/reporteRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Conectar a MongoDB
connectDB();

// Rutas
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'Backend funcionando',
        mongodb: 'Conectado',
        version: '1.0.0'
    });
});

app.use('/api/users', userRoutes);
app.use('/api/reportes', reporteRoutes);

// Ruta protegida original (por compatibilidad)
app.get('/api/protected', require('./middleware/auth').authMiddleware, (req, res) => {
    res.json({
        mensaje: "¡Funciona! Este es tu JSON",
        userId: req.auth.userId,
        timestamp: new Date().toISOString()
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Backend corriendo en http://localhost:${PORT}`);
    console.log(`📡 Endpoints disponibles:`);
    console.log(`   GET    /api/health`);
    console.log(`   GET    /api/protected`);
    console.log(`   ──────── Usuarios ────────`);
    console.log(`   GET    /api/users/profile`);
    console.log(`   PUT    /api/users/profile`);
    console.log(`   DELETE /api/users/profile`);
    console.log(`   GET    /api/users (admin)`);
    console.log(`   ──────── Reportes ────────`);
    console.log(`   POST   /api/reportes`);
    console.log(`   GET    /api/reportes`);
    console.log(`   GET    /api/reportes/mis-reportes`);
    console.log(`   GET    /api/reportes/:id`);
    console.log(`   PUT    /api/reportes/:id`);
    console.log(`   DELETE /api/reportes/:id`);
    console.log(`   PUT    /api/reportes/:id/categoria-ia (admin)`);
});