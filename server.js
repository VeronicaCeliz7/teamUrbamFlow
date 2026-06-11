require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Importar rutas
const userRoutes = require('./routes/userRoutes');
const reporteRoutes = require('./routes/reporteRoutes');
const superRoutes = require('./routes/superRoutes');
const biRoutes = require('./routes/bi.routes');
const iaRoutes = require('./routes/iaRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Conectar a MongoDB
connectDB();

// Rutas base
app.get('/api/health', (req, res) => {
    res.json({
        status: 'Backend funcionando',
        mongodb: 'Conectado',
        version: '1.0.0'
    });
});

// Rutas principales
app.use('/api/users', userRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/super', superRoutes);
app.use('/api/bi', biRoutes);
app.use('/api/ia', iaRoutes);

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
    console.log(`   GET    /api/users/municipio/lista`);
    console.log(`   POST   /api/users/municipio/invitar`);

    console.log(`   ──────── Reportes ────────`);
    console.log(`   POST   /api/reportes`);
    console.log(`   GET    /api/reportes`);
    console.log(`   GET    /api/reportes/mis-reportes`);
    console.log(`   GET    /api/reportes/:id`);
    console.log(`   PUT    /api/reportes/:id`);
    console.log(`   DELETE /api/reportes/:id`);
    console.log(`   PUT    /api/reportes/:id/categoria-ia (admin)`);

    console.log('   _____ Súper Usuario _____');
    console.log('   GET    /api/super/dashboard');
    console.log('   GET    /api/super/clientes');
    console.log('   GET    /api/super/usuarios');
    console.log('   GET    /api/super/reportes');

    console.log('   _____ Business Intelligence / Power BI _____');
    console.log('   Scope  urbanflow.bi.read');
    console.log('   GET    /api/bi/health');
    console.log('   GET    /api/bi/dashboard');
    console.log('   GET    /api/bi/incidentes');
    console.log('   GET    /api/bi/usuarios');
    console.log('   GET    /api/bi/clientes');

    console.log(`   ──────── IA ────────`);
    console.log(`   POST   /api/ia/clasificar`);
    console.log(`   POST   /api/ia/reclasificar`);
    console.log(`   POST   /api/ia/vectorizar`);
    console.log(`   POST   /api/ia/vectorizar-pendientes`);
    console.log(`   POST   /api/ia/similares`);
    console.log(`   GET    /api/ia/heatmap`);
});