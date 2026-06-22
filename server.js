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
const climaRoutes = require('./routes/climaRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// 1. CONTROL DE CONEXIÓN A MONGODB - UNA SOLA VEZ
// ============================================================
let isConnected = false;

// LOGS DE INICIO - SOLO EN DESARROLLO
if (process.env.NODE_ENV !== 'production') {
  console.log('🚀 INICIANDO SERVIDOR...');
  console.log('📦 MONGODB_URI:', process.env.MONGODB_URI ? '✅ CONFIGURADA' : '❌ FALTA');
  console.log('📦 JWT_SECRET:', process.env.JWT_SECRET ? '✅ CONFIGURADO' : '❌ FALTA');
  console.log('📦 CLERK_SECRET_KEY:', process.env.CLERK_SECRET_KEY ? '✅ CONFIGURADO' : '❌ FALTA');
}

// ============================================================
// 2. MIDDLEWARES - CON LÍMITE DE TAMAÑO
// ============================================================
app.use(cors({
  origin: [
    'https://team-urbam-flow.vercel.app',
    'https://frontflow-nu.vercel.app',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// ============================================================
// 3. CONEXIÓN A MONGODB - CON REUTILIZACIÓN
// ============================================================
async function connectToDatabase() {
  if (isConnected) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ MongoDB ya está conectado (reutilizando)');
    }
    return;
  }
  
  try {
    await connectDB();
    isConnected = true;
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ MongoDB conectado correctamente');
    }
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
  }
}

// Ejecutar conexión UNA SOLA VEZ
connectToDatabase();

// ============================================================
// 4. RUTAS - EXACTAMENTE IGUAL
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Backend funcionando',
    mongodb: isConnected ? 'Conectado' : 'Desconectado',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/users', userRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/super', superRoutes);
app.use('/api/bi', biRoutes);
app.use('/api/ia', iaRoutes);
app.use('/api/clima', climaRoutes);

app.get('/api/protected', require('./middleware/auth').authMiddleware, (req, res) => {
  res.json({
    mensaje: "¡Funciona! Este es tu JSON",
    userId: req.auth.userId,
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// 5. MANEJO DE ERRORES - PARA QUE NO SE CAIGA
// ============================================================
app.use((req, res) => {
  res.status(404).json({ ok: false, mensaje: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ 
    ok: false, 
    mensaje: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message
  });
});

// ============================================================
// 6. INICIAR SERVIDOR - SOLO EN LOCAL
// ============================================================
if (process.env.NODE_ENV !== 'production') {
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
    console.log(`   ──────── Clima Predictivo ────────`);
    console.log(`   GET    /api/clima/pronostico`);
    console.log(`   GET    /api/clima/riesgo`);
  });
}

// ============================================================
// 7. EXPORTAR PARA VERCEL
// ============================================================
module.exports = app;