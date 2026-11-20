require('dotenv').config();
const mongoose = require('mongoose');

const Cliente = require('../models/Cliente');
const User = require('../models/User');
const Reporte = require('../models/Reporte');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('ERROR: Falta MONGODB_URI en el archivo .env');
    process.exit(1);
}

// ==============================================
// CONFIGURACIÓN
// ==============================================
const CONFIG = {
    TOTAL_REPORTES: 1000,
    TOTAL_CIUDADANOS: 700,
    TOTAL_OPERADORES: 10,
    TOTAL_ADMINISTRADORES: 3,
};

// ==============================================
// CLIENTES
// ==============================================
const clientesBase = [
    {
        nombre: 'Municipalidad de Villa María',
        tipo: 'municipio',
        localidad: 'Villa María',
        provincia: 'Córdoba',
        pais: 'Argentina',
        direccion: 'Centro, Villa María, Córdoba',
        latitud: -32.4075,
        longitud: -63.2402
    }
];

// ==============================================
// CATEGORÍAS, ESTADOS Y PRIORIDADES
// ==============================================
const categoriasPonderadas = [
    { categoria: 'bache', peso: 25 },
    { categoria: 'alumbrado', peso: 20 },
    { categoria: 'vereda', peso: 15 },
    { categoria: 'basura', peso: 12 },
    { categoria: 'agua', peso: 10 },
    { categoria: 'semaforo', peso: 8 },
    { categoria: 'microbasural', peso: 5 },
    { categoria: 'inseguridad', peso: 3 },
    { categoria: 'ruido', peso: 1 },
    { categoria: 'animal_suelto', peso: 1 }
];

const estadosDistribucion = [
    { estado: 'pendiente', peso: 30 },
    { estado: 'en_proceso', peso: 25 },
    { estado: 'resuelto', peso: 35 },
    { estado: 'rechazado', peso: 10 }
];

const ESTADOS_CON_OPERADOR = ['en_proceso', 'resuelto', 'rechazado'];

const prioridades = ['baja', 'media', 'alta', 'critica'];

// ==============================================
// NOMBRES Y APELLIDOS
// ==============================================
const nombres = [
    'Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Federico', 'Gabriela', 'Hugo', 'Isabel', 'Joaquín',
    'Laura', 'Martín', 'Natalia', 'Oscar', 'Paula', 'Ricardo', 'Sofía', 'Tomás', 'Valentina', 'Walter',
    'Camila', 'Lucas', 'Micaela', 'Nicolás', 'Rocío', 'Agustín', 'Florencia', 'Marcos', 'Julieta', 'Sebastián',
    'Lucía', 'Mateo', 'Pilar', 'Ramiro', 'Victoria', 'Emilia', 'Franco', 'Josefina', 'Lautaro', 'Malena',
    'Renata', 'Santiago', 'Delfina', 'Benjamín', 'Martina', 'Thiago', 'Catalina', 'Juan', 'Emma', 'Pedro'
];

const apellidos = [
    'Gómez', 'Pérez', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Romero', 'Díaz', 'Torres',
    'Morales', 'Ortiz', 'Cruz', 'Reyes', 'Gutiérrez', 'Mendoza', 'Herrera', 'Vargas', 'Medina', 'Flores',
    'Rivera', 'Rojas', 'Muñoz', 'Álvarez', 'Castillo', 'Silva', 'García', 'Martínez', 'Núñez', 'Acosta',
    'Paredes', 'Duarte', 'Ramos', 'Valdez', 'Luna', 'Ponce', 'Quiroga', 'Molina', 'Barrios', 'Salazar',
    'Guerrero', 'Arias', 'Peralta', 'Giménez', 'Salas', 'Córdoba', 'Maldonado', 'Bustos', 'Domínguez', 'Correa'
];

// ==============================================
// TÍTULOS POR CATEGORÍA
// ==============================================
const titulosPorCategoria = {
    bache: [
        'Bache profundo en Av. Libertador',
        'Pozo peligroso en calle 5 de Mayo',
        'Calle deteriorada en barrio Los Olivos',
        'Bache en Av. Principal afecta tránsito'
    ],
    alumbrado: [
        'Luminaria fuera de servicio en calle 9 de Julio',
        'Zona oscura en barrio La Floresta',
        'Poste de luz intermitente en Av. Sabattini',
        'Cuadrante completo sin luz en barrio San Juan'
    ],
    basura: [
        'Basura acumulada en calle Córdoba',
        'Contenedores desbordados en barrio Belgrano',
        'Residuos sin retirar en la cuadra de Av. Perón'
    ],
    agua: [
        'Pérdida de agua en calle Independencia',
        'Fuga constante en cañería de calle Buenos Aires',
        'Agua acumulada en calzada de Av. España',
        'Rotura de caño en calle Chile'
    ],
    semaforo: [
        'Semáforo sin funcionar en Av. Libertador y San Martín',
        'Semáforo intermitente en calle 9 de Julio',
        'Cruce peligroso en Av. Sabattini y Rivadavia'
    ],
    inseguridad: [
        'Zona insegura en barrio La Floresta',
        'Actividad sospechosa en calle 5 de Mayo',
        'Sector con alta incidencia delictiva en barrio San Juan'
    ],
    vereda: [
        'Vereda rota en calle San Martín',
        'Baldosas levantadas en Av. Principal',
        'Obstrucción peatonal en calle Córdoba'
    ],
    ruido: [
        'Ruidos molestos en barrio Centro',
        'Música alta en calle Rivadavia',
        'Molestias sonoras en zona residencial'
    ],
    animal_suelto: [
        'Perro suelto en Av. Libertador',
        'Caballo suelto en ruta 2',
        'Animales abandonados en barrio La Floresta'
    ],
    microbasural: [
        'Microbasural en terreno baldío de calle Moreno',
        'Acumulación de residuos en barrio San Juan',
        'Basural informal en Av. Sabattini'
    ]
};

// ==============================================
// FUNCIONES UTILITARIAS
// ==============================================
function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function randomWeighted(weightedArray) {
    const total = weightedArray.reduce((sum, item) => sum + item.peso, 0);
    let random = Math.random() * total;
    for (const item of weightedArray) {
        random -= item.peso;
        if (random <= 0) return item;
    }
    return weightedArray[weightedArray.length - 1];
}

function randomDate(start, end) {
    const diff = end.getTime() - start.getTime();
    return new Date(start.getTime() + Math.random() * diff);
}

function randomCoordinate(base, delta = 0.025) {
    return Number((base + (Math.random() - 0.5) * delta).toFixed(6));
}

function buildTitulo(categoria) {
    const titulos = titulosPorCategoria[categoria] || titulosPorCategoria.bache;
    return randomItem(titulos);
}

// ==============================================
// GENERAR USUARIOS ADMINISTRATIVOS
// ==============================================
function generarUsuariosAdministrativos(clientes) {
    const usuarios = [];

    // Superadmin (1 solo)
    usuarios.push({
        clerkUserId: 'demo_superadmin_urbanflow',
        email: 'superadmin@urbanflow.demo',
        nombre: 'Super',
        apellido: 'Administrador',
        rol: 'superadmin',
        ciudad: 'Villa María',
        localidad: 'Villa María',
        provincia: 'Córdoba',
        pais: 'Argentina',
        esDemo: true
    });

    const cliente = clientes[0];

    // Administradores (3)
    for (let i = 1; i <= CONFIG.TOTAL_ADMINISTRADORES; i++) {
        usuarios.push({
            clerkUserId: `demo_admin_${i}`,
            email: `admin${i}@urbanflow.demo`,
            nombre: `Admin${i}`,
            apellido: 'VillaMaría',
            rol: 'admin',
            clienteId: cliente._id,
            clienteNombre: cliente.nombre,
            ciudad: cliente.localidad,
            localidad: cliente.localidad,
            provincia: cliente.provincia,
            pais: cliente.pais,
            esDemo: true
        });
    }

    // Operadores (10)
    for (let i = 1; i <= CONFIG.TOTAL_OPERADORES; i++) {
        usuarios.push({
            clerkUserId: `demo_operador_${i}`,
            email: `operador${i}@urbanflow.demo`,
            nombre: `Operador${i}`,
            apellido: 'VillaMaría',
            rol: 'operador',
            clienteId: cliente._id,
            clienteNombre: cliente.nombre,
            ciudad: cliente.localidad,
            localidad: cliente.localidad,
            provincia: cliente.provincia,
            pais: cliente.pais,
            esDemo: true
        });
    }

    return usuarios;
}

// ==============================================
// GENERAR CIUDADANOS
// ==============================================
function generarCiudadanos(cantidad, clientes) {
    const usuarios = [];
    const cliente = clientes[0];

    for (let i = 0; i < cantidad; i++) {
        const nombre = nombres[i % nombres.length];
        const apellido = randomItem(apellidos);

        usuarios.push({
            clerkUserId: `demo_ciudadano_${i + 1}`,
            email: `ciudadano${i + 1}@urbanflow.demo`,
            nombre,
            apellido,
            direccion: `Calle ${i + 1}, Villa María`,
            ciudad: cliente.localidad,
            localidad: cliente.localidad,
            provincia: cliente.provincia,
            pais: cliente.pais,
            rol: 'ciudadano',
            clienteId: cliente._id,
            clienteNombre: cliente.nombre,
            esDemo: true
        });
    }

    return usuarios;
}

// ==============================================
// GENERAR REPORTES CON OPERADORES ASIGNADOS
// ==============================================
function generarReportes(cantidad, clientes, ciudadanos, operadores) {
    const reportes = [];
    const cliente = clientes[0];
    const ahora = new Date();
    const hace6Meses = new Date(ahora);
    hace6Meses.setMonth(hace6Meses.getMonth() - 6);

    // Contador round-robin POR ESTADO
    const contadorRoundRobin = {
        en_proceso: 0,
        resuelto: 0,
        rechazado: 0
    };

    function asignarOperador(estado) {
        if (!ESTADOS_CON_OPERADOR.includes(estado)) {
            return null; // pendiente: sin operador
        }
        const idx = contadorRoundRobin[estado] % operadores.length;
        contadorRoundRobin[estado] += 1;
        return operadores[idx];
    }

    for (let i = 0; i < cantidad; i++) {
        const ciudadano = ciudadanos[i % ciudadanos.length];
        const categoriaObj = randomWeighted(categoriasPonderadas);
        const categoria = categoriaObj.categoria;
        const estadoObj = randomWeighted(estadosDistribucion);
        const estado = estadoObj.estado;
        const prioridad = randomItem(prioridades);
        const titulo = buildTitulo(categoria);
        const fechaCreacion = randomDate(hace6Meses, ahora);

        const operador = asignarOperador(estado);

        let fechaResolucion = null;
        if (estado === 'resuelto') {
            const dias = 1 + Math.floor(Math.random() * 15);
            fechaResolucion = new Date(fechaCreacion.getTime() + dias * 24 * 60 * 60 * 1000);
        }

        let fechaAsignacion = null;
        if (operador) {
            const dias = Math.floor(Math.random() * 4);
            fechaAsignacion = new Date(fechaCreacion.getTime() + dias * 24 * 60 * 60 * 1000);
        }

        let fechaEnProceso = null;
        let fechaPendiente = null;
        let fechaRechazado = null;

        if (estado === 'en_proceso') fechaEnProceso = fechaCreacion;
        if (estado === 'pendiente') fechaPendiente = fechaCreacion;
        if (estado === 'rechazado') fechaRechazado = fechaCreacion;
        if (estado === 'resuelto') {
            fechaEnProceso = new Date(fechaCreacion.getTime() + 1 * 24 * 60 * 60 * 1000);
            fechaPendiente = new Date(fechaCreacion.getTime() + 2 * 24 * 60 * 60 * 1000);
        }

        const lat = randomCoordinate(-32.4075, 0.03);
        const lng = randomCoordinate(-63.2402, 0.03);

        reportes.push({
            titulo: titulo,
            columna_unica: `${titulo} - Villa María`,
            observaciones: `Reportado por ${ciudadano.nombre} ${ciudadano.apellido}. Prioridad: ${prioridad}.`,
            categoria_asignada_por_ia: categoria,
            categoria_manual: null,
            estado: estado,
            prioridad: prioridad,
            prioridad_score: prioridad === 'critica' ? 4 : prioridad === 'alta' ? 3 : prioridad === 'media' ? 2 : 1,
            fecha_hora: fechaCreacion,
            fecha_resolucion: fechaResolucion,
            fecha_asignacion_operador: fechaAsignacion,
            fecha_en_proceso: fechaEnProceso,
            fecha_pendiente: fechaPendiente,
            fecha_rechazado: fechaRechazado,
            usuarioId: ciudadano.clerkUserId,
            usuarioEmail: ciudadano.email,
            usuarioNombre: `${ciudadano.nombre} ${ciudadano.apellido}`,
            operadorAsignadoId: operador ? operador.clerkUserId : null,
            operadorNombre: operador ? `${operador.nombre} ${operador.apellido}` : null,
            clienteId: cliente._id,
            clienteNombre: cliente.nombre,
            direccion: `Ubicación ${i + 1}, Villa María`,
            localidad: cliente.localidad,
            provincia: cliente.provincia,
            pais: cliente.pais,
            latitud: lat,
            longitud: lng,
            ia_procesado: true,
            ai_summary: `${titulo} en Villa María. Prioridad: ${prioridad}. Estado: ${estado}.`,
            ai_priority_score: prioridad === 'critica' ? 90 + Math.random() * 10 :
                               prioridad === 'alta' ? 70 + Math.random() * 20 :
                               prioridad === 'media' ? 40 + Math.random() * 30 :
                               10 + Math.random() * 30,
            etiquetas: [categoria, 'villa_maria', prioridad, estado],
            esDemo: true,
            createdAt: fechaCreacion,
            updatedAt: fechaCreacion
        });
    }

    return reportes;
}

// ==============================================
// FUNCIÓN PRINCIPAL
// ==============================================
async function seedDemo() {
    try {
        console.log('🚀 Conectando a MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        console.log('🗑️  Limpiando datos demo anteriores...');
        await Reporte.deleteMany({ esDemo: true });
        await User.deleteMany({ esDemo: true });
        await Cliente.deleteMany({ esDemo: true });
        console.log('✅ Datos limpios\n');

        // 1. CLIENTE
        console.log('📋 Creando cliente...');
        const clientes = await Cliente.insertMany(
            clientesBase.map(c => ({ ...c, esDemo: true }))
        );
        console.log(`✅ Cliente creado: ${clientes[0].nombre}\n`);

        // 2. USUARIOS ADMINISTRATIVOS
        console.log('👤 Creando usuarios administrativos...');
        const adminsData = generarUsuariosAdministrativos(clientes);
        let adminCount = 0;
        for (const admin of adminsData) {
            await User.findOneAndUpdate(
                { clerkUserId: admin.clerkUserId },
                { $set: admin },
                { upsert: true }
            );
            adminCount++;
        }
        console.log(`✅ ${adminCount} usuarios administrativos creados\n`);

        // 3. CIUDADANOS
        console.log(`👤 Creando ${CONFIG.TOTAL_CIUDADANOS} ciudadanos...`);
        const ciudadanosData = generarCiudadanos(CONFIG.TOTAL_CIUDADANOS, clientes);
        let ciudadanoCount = 0;
        for (const ciudadano of ciudadanosData) {
            await User.findOneAndUpdate(
                { clerkUserId: ciudadano.clerkUserId },
                { $set: ciudadano },
                { upsert: true }
            );
            ciudadanoCount++;
            if (ciudadanoCount % 100 === 0) {
                console.log(`   Progreso: ${ciudadanoCount}/${CONFIG.TOTAL_CIUDADANOS} ciudadanos`);
            }
        }
        console.log(`✅ ${ciudadanoCount} ciudadanos creados\n`);

        // 4. OBTENER OPERADORES
        const operadores = await User.find({ rol: 'operador', esDemo: true });
        const ciudadanos = await User.find({ rol: 'ciudadano', esDemo: true });

        console.log(`🔍 Operadores encontrados: ${operadores.length} (esperado: ${CONFIG.TOTAL_OPERADORES})`);
        if (operadores.length === 0) {
            throw new Error('❌ No se encontraron operadores. Revisá el campo "rol" en el modelo User.');
        }

        // 5. REPORTES
        console.log(`📝 Creando ${CONFIG.TOTAL_REPORTES} reportes...`);
        const reportesData = generarReportes(CONFIG.TOTAL_REPORTES, clientes, ciudadanos, operadores);

        const BATCH_SIZE = 100;
        let insertados = 0;
        for (let i = 0; i < reportesData.length; i += BATCH_SIZE) {
            const batch = reportesData.slice(i, i + BATCH_SIZE);
            await Reporte.insertMany(batch);
            insertados += batch.length;
            console.log(`   Progreso: ${insertados}/${CONFIG.TOTAL_REPORTES} reportes`);
        }
        console.log(`✅ ${reportesData.length} reportes creados\n`);

        // 6. ESTADÍSTICAS
        const totalUsers = await User.countDocuments({ esDemo: true });
        const totalReportes = await Reporte.countDocuments({ esDemo: true });

        console.log('📊 ESTADÍSTICAS FINALES:');
        console.log('─────────────────────────────────────────');
        console.log(`🏢 Cliente: ${clientes[0].nombre}`);
        console.log(`👤 Usuarios totales: ${totalUsers}`);
        console.log(`   ├─ Superadmin: 1`);
        console.log(`   ├─ Administradores: ${CONFIG.TOTAL_ADMINISTRADORES}`);
        console.log(`   ├─ Operadores: ${CONFIG.TOTAL_OPERADORES}`);
        console.log(`   └─ Ciudadanos: ${ciudadanoCount}`);
        console.log(`📋 Reportes: ${totalReportes}`);

        // Estadísticas por operador y estado
        const statsAsignacion = await Reporte.aggregate([
            { $match: { esDemo: true, operadorAsignadoId: { $ne: null } } },
            { $group: { _id: { operador: '$operadorAsignadoId', estado: '$estado' }, count: { $sum: 1 } } },
            { $sort: { '_id.operador': 1, '_id.estado': 1 } }
        ]);

        console.log('\n🔧 Incidentes asignados por operador y estado:');
        const porOperador = {};
        statsAsignacion.forEach(s => {
            const op = s._id.operador;
            if (!porOperador[op]) porOperador[op] = {};
            porOperador[op][s._id.estado] = s.count;
        });
        Object.entries(porOperador).forEach(([op, estados]) => {
            const detalle = Object.entries(estados).map(([e, c]) => `${e}: ${c}`).join(', ');
            console.log(`   ${op} -> ${detalle}`);
        });

        const totalSinAsignar = await Reporte.countDocuments({ esDemo: true, operadorAsignadoId: null });
        console.log(`\n📥 Reportes sin operador asignado (pendientes): ${totalSinAsignar}`);

        console.log('\n✅ SEED DEMO FINALIZADO CORRECTAMENTE');
        console.log('📌 DATOS OPTIMIZADOS PARA POWER BI');
        console.log('─────────────────────────────────────────\n');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error ejecutando seed demo:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

seedDemo();