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
// CONFIGURACIÓN - SOLO VILLA MARÍA
// ==============================================
const CONFIG = {
    TOTAL_REPORTES: 1000,        // 1000 reportes para Villa María
    TOTAL_CIUDADANOS: 700,       // 700 ciudadanos de Villa María
};

// ==============================================
// SOLO EL CLIENTE DE VILLA MARÍA
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
// CATEGORÍAS PONDERADAS
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

// ==============================================
// ESTADOS PONDERADOS
// ==============================================
const estadosDistribucion = [
    { estado: 'pendiente', peso: 30 },
    { estado: 'en_proceso', peso: 25 },
    { estado: 'resuelto', peso: 35 },
    { estado: 'rechazado', peso: 10 }
];

const prioridades = ['baja', 'media', 'alta', 'critica'];

// ==============================================
// NOMBRES Y APELLIDOS
// ==============================================
const nombres = [
    'Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Federico', 'Gabriela', 'Hugo', 'Isabel', 'Joaquín',
    'Laura', 'Martín', 'Natalia', 'Oscar', 'Paula', 'Ricardo', 'Sofía', 'Tomás', 'Valentina', 'Walter',
    'Camila', 'Lucas', 'Micaela', 'Nicolás', 'Rocío', 'Agustín', 'Florencia', 'Marcos', 'Julieta', 'Sebastián',
    'Lucía', 'Mateo', 'Pilar', 'Ramiro', 'Victoria', 'Emilia', 'Franco', 'Josefina', 'Lautaro', 'Malena',
    'Renata', 'Santiago', 'Delfina', 'Benjamín', 'Martina', 'Thiago', 'Catalina', 'Juan', 'Emma', 'Pedro',
    'Abril', 'Santino', 'Valeria', 'Felipe', 'Mora', 'Ignacio', 'Ambar', 'Tobías', 'Dolores', 'Simón',
    'Alma', 'Lorenzo', 'Oliva', 'Maximiliano', 'Aitana', 'Julián', 'Inés', 'Damián', 'Clara', 'Esteban',
    'Lara', 'Cristian', 'Noelia', 'Gonzalo', 'Malvina', 'Alejandro', 'Sol', 'Marcelo', 'Ruth', 'Andrés',
    'Aylin', 'Gael', 'Cecilia', 'Brandon', 'Dana', 'Mathías', 'Silvina', 'Brian', 'Aisha', 'Leonel',
    'Nayla', 'Román', 'Mía', 'Emanuel', 'Violeta', 'Hans', 'Alicia', 'Klaus', 'Mirta', 'Luis',
    'Brenda', 'César', 'Daniela', 'Enrique', 'Fátima', 'Guillermo', 'Hilda', 'Iván', 'Jacqueline', 'Kevin'
];

const apellidos = [
    'Gómez', 'Pérez', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Romero', 'Díaz', 'Torres',
    'Morales', 'Ortiz', 'Cruz', 'Reyes', 'Gutiérrez', 'Mendoza', 'Herrera', 'Vargas', 'Medina', 'Flores',
    'Rivera', 'Rojas', 'Muñoz', 'Álvarez', 'Castillo', 'Silva', 'García', 'Martínez', 'Núñez', 'Acosta',
    'Paredes', 'Duarte', 'Ramos', 'Valdez', 'Luna', 'Ponce', 'Quiroga', 'Molina', 'Barrios', 'Salazar',
    'Guerrero', 'Arias', 'Peralta', 'Giménez', 'Salas', 'Córdoba', 'Maldonado', 'Bustos', 'Domínguez', 'Correa',
    'Navarro', 'Delgado', 'Márquez', 'Zúñiga', 'Ortega', 'Soto', 'Espinoza', 'Castro', 'Pacheco', 'Figueroa'
];

// ==============================================
// TÍTULOS POR CATEGORÍA
// ==============================================
const titulosPorCategoria = {
    bache: [
        'Bache profundo en Av. Libertador',
        'Pozo peligroso en calle 5 de Mayo',
        'Calle deteriorada en barrio Los Olivos',
        'Bache en Av. Principal afecta tránsito',
        'Hundimiento en calle San Martín',
        'Bache sin señalización en zona escolar',
        'Calle con múltiples baches en barrio Centro',
        'Pozo en calle Rivadavia'
    ],
    alumbrado: [
        'Luminaria fuera de servicio en calle 9 de Julio',
        'Zona oscura en barrio La Floresta',
        'Poste de luz intermitente en Av. Sabattini',
        'Cuadrante completo sin luz en barrio San Juan',
        'Farola averiada en esquina peligrosa',
        'Alumbrado público deficiente en ruta 2',
        'Luz de calle no funciona en barrio Jardín',
        'Falta de luminarias en calle Sarmiento'
    ],
    basura: [
        'Basura acumulada en calle Córdoba',
        'Contenedores desbordados en barrio Belgrano',
        'Residuos sin retirar en la cuadra de Av. Perón',
        'Punto de arrojo ilegal en calle 25 de Mayo',
        'Acumulación de bolsas en la vía pública',
        'Contenedor rebalsado en barrio Centro',
        'Basural en calle San Luis',
        'Recolección de basura irregular en zona norte'
    ],
    agua: [
        'Pérdida de agua en calle Independencia',
        'Fuga constante en cañería de calle Buenos Aires',
        'Agua acumulada en calzada de Av. España',
        'Rotura de caño en calle Chile',
        'Filtración en la vía pública de barrio Eva Perón',
        'Acumulación de agua estancada en calle Moreno',
        'Brotación de agua desde el pavimento en calle Urquiza',
        'Pérdida de agua potable en barrio San Martín'
    ],
    semaforo: [
        'Semáforo sin funcionar en Av. Libertador y San Martín',
        'Semáforo intermitente en calle 9 de Julio',
        'Cruce peligroso en Av. Sabattini y Rivadavia',
        'Semáforo dañado en Av. Perón',
        'Luz roja intermitente en calle Córdoba',
        'Semáforo en modo amarillo todo el día en Av. España',
        'Cruce con visibilidad reducida en calle San Juan',
        'Semáforo peatonal no funciona en barrio Centro'
    ],
    inseguridad: [
        'Zona insegura en barrio La Floresta',
        'Actividad sospechosa en calle 5 de Mayo',
        'Sector con alta incidencia delictiva en barrio San Juan',
        'Calle poco transitada insegura en zona sur',
        'Robos constantes en Av. Libertador',
        'Necesidad de más patrullaje en barrio Los Olivos',
        'Vivienda abandonada en calle Moreno',
        'Venta de drogas en la esquina de Av. Sabattini'
    ],
    vereda: [
        'Vereda rota en calle San Martín',
        'Baldosas levantadas en Av. Principal',
        'Obstrucción peatonal en calle Córdoba',
        'Vereda con desniveles en barrio Centro',
        'Piso irregular en calle 25 de Mayo',
        'Baldosas sueltas en zona comercial',
        'Vereda hundida en calle Chile',
        'Mala condición de vereda en barrio Jardín'
    ],
    ruido: [
        'Ruidos molestos en barrio Centro',
        'Música alta en calle Rivadavia',
        'Molestias sonoras en zona residencial',
        'Fiesta constante en barrio Los Olivos',
        'Ruido de obra en calle Urquiza',
        'Alarma de vehículo en Av. Perón',
        'Calle con contaminación sonora en zona norte',
        'Eventos sin permiso en barrio San Juan'
    ],
    animal_suelto: [
        'Perro suelto en Av. Libertador',
        'Caballo suelto en ruta 2',
        'Animales abandonados en barrio La Floresta',
        'Potro suelto en calle 9 de Julio',
        'Jauría de perros en barrio Belgrano',
        'Animal doméstico sin dueño en calle San Martín',
        'Vaca suelta en zona periurbana'
    ],
    microbasural: [
        'Microbasural en terreno baldío de calle Moreno',
        'Acumulación de residuos en barrio San Juan',
        'Basural informal en Av. Sabattini',
        'Punto de arrojo ilegal en calle Córdoba',
        'Escombros en la vía pública de barrio Eva Perón',
        'Foco de basura en calle Chile',
        'Tiradero a cielo abierto en zona sur',
        'Acopio de materiales en calle Urquiza'
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
// GENERAR USUARIOS ADMINISTRATIVOS (solo Villa María)
// ==============================================
function generarUsuariosAdministrativos(clientes) {
    const usuarios = [];
    
    // Superadmin
    usuarios.push({
        clerkUserId: 'demo_superadmin_urbanflow',
        email: 'superadmin@urbanflow.demo',
        nombre: 'Super',
        apellido: 'Usuario',
        rol: 'superadmin',
        ciudad: 'Villa María',
        localidad: 'Villa María',
        provincia: 'Córdoba',
        pais: 'Argentina',
        esDemo: true
    });

    // Solo para Villa María
    const cliente = clientes[0];
    usuarios.push({
        clerkUserId: 'demo_admin_villamaria',
        email: 'admin.villamaria@urbanflow.demo',
        nombre: 'Admin',
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

    usuarios.push({
        clerkUserId: 'demo_operador_villamaria',
        email: 'operador.villamaria@urbanflow.demo',
        nombre: 'Operador',
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

    usuarios.push({
        clerkUserId: 'demo_moderador_villamaria',
        email: 'moderador.villamaria@urbanflow.demo',
        nombre: 'Moderador',
        apellido: 'VillaMaría',
        rol: 'moderador',
        clienteId: cliente._id,
        clienteNombre: cliente.nombre,
        ciudad: cliente.localidad,
        localidad: cliente.localidad,
        provincia: cliente.provincia,
        pais: cliente.pais,
        esDemo: true
    });

    return usuarios;
}

// ==============================================
// GENERAR CIUDADANOS (solo Villa María)
// ==============================================
function generarCiudadanos(cantidad, clientes) {
    const usuarios = [];
    const cliente = clientes[0];

    for (let i = 0; i < cantidad; i++) {
        const nombre = nombres[i % nombres.length];
        const apellido = randomItem(apellidos);
        const edad = 18 + Math.floor(Math.random() * 60);

        usuarios.push({
            clerkUserId: `demo_ciudadano_${i + 1}`,
            email: `ciudadano${i + 1}@urbanflow.demo`,
            nombre,
            apellido,
            edad,
            telefono: `+5493534${String(100000 + i).padStart(6, '0')}`,
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
// GENERAR REPORTES (solo Villa María)
// ==============================================
function generarReportes(cantidad, clientes, ciudadanos) {
    const reportes = [];
    const cliente = clientes[0];
    
    for (let i = 0; i < cantidad; i++) {
        const ciudadano = ciudadanos[i % ciudadanos.length];
        const categoriaObj = randomWeighted(categoriasPonderadas);
        const categoria = categoriaObj.categoria;
        const estadoObj = randomWeighted(estadosDistribucion);
        const estado = estadoObj.estado;
        const prioridad = randomItem(prioridades);
        const titulo = buildTitulo(categoria);
        
        const ahora = new Date();
        const hace6Meses = new Date(ahora);
        hace6Meses.setMonth(hace6Meses.getMonth() - 6);
        const fechaCreacion = randomDate(hace6Meses, ahora);

        // Ubicaciones aleatorias alrededor de Villa María
        const lat = randomCoordinate(-32.4075, 0.03);
        const lng = randomCoordinate(-63.2402, 0.03);

        reportes.push({
            usuarioId: ciudadano.clerkUserId,
            usuarioEmail: ciudadano.email,
            clienteId: cliente._id,
            clienteNombre: cliente.nombre,
            titulo: titulo,
            columna_unica: `${titulo} - Villa María`,
            direccion: `Ubicación ${i + 1}, Villa María`,
            latitud: lat,
            longitud: lng,
            localidad: cliente.localidad,
            provincia: cliente.provincia,
            pais: cliente.pais,
            observaciones: `Reportado por ${ciudadano.nombre} ${ciudadano.apellido}. Prioridad: ${prioridad}.`,
            categoria_asignada_por_ia: categoria,
            ia_procesado: true,
            prioridad: prioridad,
            etiquetas: [categoria, 'villa_maria', prioridad, estado],
            ai_summary: `${titulo} en Villa María. Prioridad: ${prioridad}. Estado: ${estado}.`,
            ai_priority_score: prioridad === 'critica' ? 90 + Math.random() * 10 : 
                               prioridad === 'alta' ? 70 + Math.random() * 20 : 
                               prioridad === 'media' ? 40 + Math.random() * 30 : 
                               10 + Math.random() * 30,
            estado: estado,
            fecha_hora: fechaCreacion,
            esDemo: true
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

        // 1. CLIENTE (solo Villa María)
        console.log('📋 Creando cliente: Municipalidad de Villa María...');
        const clientes = await Cliente.insertMany(
            clientesBase.map(c => ({ ...c, esDemo: true }))
        );
        console.log(`✅ Cliente creado: ${clientes[0].nombre}\n`);

        // 2. USUARIOS ADMINISTRATIVOS
        console.log('👤 Creando usuarios administrativos...');
        const admins = generarUsuariosAdministrativos(clientes);
        let adminCount = 0;
        for (const admin of admins) {
            await User.findOneAndUpdate(
                { clerkUserId: admin.clerkUserId },
                { $set: admin },
                { upsert: true }
            );
            adminCount++;
        }
        console.log(`✅ ${adminCount} usuarios administrativos creados\n`);

        // 3. CIUDADANOS
        console.log(`👤 Creando ${CONFIG.TOTAL_CIUDADANOS} ciudadanos de Villa María...`);
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

        // Obtener ciudadanos para reportes
        const ciudadanos = await User.find({ rol: 'ciudadano', esDemo: true });

        // 4. REPORTES
        console.log(`📝 Creando ${CONFIG.TOTAL_REPORTES} reportes para Villa María...`);
        const reportesData = generarReportes(CONFIG.TOTAL_REPORTES, clientes, ciudadanos);
        
        const BATCH_SIZE = 100;
        let insertados = 0;
        for (let i = 0; i < reportesData.length; i += BATCH_SIZE) {
            const batch = reportesData.slice(i, i + BATCH_SIZE);
            await Reporte.insertMany(batch);
            insertados += batch.length;
            console.log(`   Progreso: ${insertados}/${CONFIG.TOTAL_REPORTES} reportes`);
        }
        console.log(`✅ ${reportesData.length} reportes creados\n`);

        // 5. ESTADÍSTICAS
        const totalUsers = await User.countDocuments({ esDemo: true });
        const totalReportes = await Reporte.countDocuments({ esDemo: true });
        
        console.log('📊 ESTADÍSTICAS FINALES - VILLA MARÍA:');
        console.log('─────────────────────────────────────────');
        console.log(`🏢 Cliente: ${clientes[0].nombre}`);
        console.log(`👤 Usuarios totales: ${totalUsers}`);
        console.log(`   ├─ Administrativos: ${adminCount}`);
        console.log(`   └─ Ciudadanos: ${ciudadanoCount}`);
        console.log(`📋 Reportes: ${totalReportes}`);
        
        const statsCategoria = await Reporte.aggregate([
            { $match: { esDemo: true } },
            { $group: { _id: '$categoria_asignada_por_ia', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        console.log('\n📂 Distribución por categoría:');
        statsCategoria.forEach(s => {
            console.log(`   ${s._id}: ${s.count} (${(s.count/totalReportes*100).toFixed(1)}%)`);
        });

        const statsEstado = await Reporte.aggregate([
            { $match: { esDemo: true } },
            { $group: { _id: '$estado', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        console.log('\n📊 Distribución por estado:');
        statsEstado.forEach(s => {
            console.log(`   ${s._id}: ${s.count} (${(s.count/totalReportes*100).toFixed(1)}%)`);
        });

        console.log('\n✅ SEED DEMO FINALIZADO CORRECTAMENTE');
        console.log('📌 TODOS LOS DATOS SON PARA VILLA MARÍA');
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