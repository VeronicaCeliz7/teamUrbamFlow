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
    },
    {
        nombre: 'Municipalidad de San Francisco',
        tipo: 'municipio',
        localidad: 'San Francisco',
        provincia: 'Córdoba',
        pais: 'Argentina',
        direccion: 'Centro, San Francisco, Córdoba',
        latitud: -31.4276,
        longitud: -62.0820
    },
    {
        nombre: 'Municipalidad de Bell Ville',
        tipo: 'municipio',
        localidad: 'Bell Ville',
        provincia: 'Córdoba',
        pais: 'Argentina',
        direccion: 'Centro, Bell Ville, Córdoba',
        latitud: -32.6259,
        longitud: -62.6887
    },
    {
        nombre: 'Campus UNVM',
        tipo: 'universidad',
        localidad: 'Villa María',
        provincia: 'Córdoba',
        pais: 'Argentina',
        direccion: 'Campus Universidad Nacional de Villa María',
        latitud: -32.4324,
        longitud: -63.2476
    },
    {
        nombre: 'Barrio Privado La Negrita',
        tipo: 'barrio_privado',
        localidad: 'Villa María',
        provincia: 'Córdoba',
        pais: 'Argentina',
        direccion: 'La Negrita, Villa María, Córdoba',
        latitud: -32.3905,
        longitud: -63.2758
    }
];

const categorias = [
    'bache',
    'alumbrado',
    'basura',
    'agua',
    'semaforo',
    'inseguridad',
    'vereda',
    'ruido',
    'animal_suelto',
    'microbasural'
];

const estados = ['pendiente', 'en_proceso', 'resuelto', 'rechazado'];
const prioridades = ['baja', 'media', 'alta', 'critica'];

const nombres = [
    'Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Federico', 'Gabriela', 'Hugo', 'Isabel', 'Joaquín',
    'Laura', 'Martín', 'Natalia', 'Oscar', 'Paula', 'Ricardo', 'Sofía', 'Tomás', 'Valentina', 'Walter',
    'Camila', 'Lucas', 'Micaela', 'Nicolás', 'Rocío', 'Agustín', 'Florencia', 'Marcos', 'Julieta', 'Sebastián',
    'Lucía', 'Mateo', 'Pilar', 'Ramiro', 'Victoria', 'Emilia', 'Franco', 'Josefina', 'Lautaro', 'Malena',
    'Renata', 'Santiago', 'Delfina', 'Benjamín', 'Martina', 'Thiago', 'Catalina', 'Juan', 'Emma', 'Pedro'
];

const apellidos = [
    'Gómez', 'Pérez', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Romero', 'Díaz', 'Torres'
];

const titulosPorCategoria = {
    bache: [
        'Bache profundo en calle principal',
        'Pozo peligroso cerca de la esquina',
        'Calle deteriorada por lluvia'
    ],
    alumbrado: [
        'Luminaria fuera de servicio',
        'Zona sin iluminación nocturna',
        'Poste de luz intermitente'
    ],
    basura: [
        'Basura acumulada en la vereda',
        'Contenedores desbordados',
        'Residuos sin retirar'
    ],
    agua: [
        'Pérdida de agua en la calle',
        'Fuga constante cerca del cordón',
        'Agua acumulada en la calzada'
    ],
    semaforo: [
        'Semáforo sin funcionar',
        'Semáforo intermitente',
        'Cruce peligroso por falla semafórica'
    ],
    inseguridad: [
        'Zona insegura por falta de luz',
        'Movimiento sospechoso recurrente',
        'Sector con baja visibilidad'
    ],
    vereda: [
        'Vereda rota con riesgo de caída',
        'Baldosas levantadas',
        'Obstrucción peatonal'
    ],
    ruido: [
        'Ruidos molestos durante la noche',
        'Música alta recurrente',
        'Molestias sonoras en zona residencial'
    ],
    animal_suelto: [
        'Animal suelto en la vía pública',
        'Perro suelto cerca de escuela',
        'Caballo suelto en avenida'
    ],
    microbasural: [
        'Microbasural en terreno baldío',
        'Acumulación de residuos clandestinos',
        'Basural informal en crecimiento'
    ]
};

function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function randomCoordinate(base, delta = 0.015) {
    return Number((base + (Math.random() - 0.5) * delta).toFixed(6));
}

function buildReporteTexto(categoria, cliente) {
    const titulo = randomItem(titulosPorCategoria[categoria]);

    return {
        titulo,
        columna_unica: `${titulo}. Reporte generado en ${cliente.localidad}. Se solicita revisión del área correspondiente.`,
        observaciones: `Incidente demo asociado a ${cliente.nombre}. Priorizar según impacto, ubicación y recurrencia.`
    };
}

async function seedDemo() {
    try {
        console.log('Conectando a MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Conectado a MongoDB');

        console.log('Limpiando datos demo anteriores...');
        await Reporte.deleteMany({ esDemo: true });
        await User.deleteMany({ esDemo: true });
        await Cliente.deleteMany({ esDemo: true });

        console.log('Creando clientes demo...');
        const clientes = await Cliente.insertMany(
            clientesBase.map((cliente) => ({
                ...cliente,
                esDemo: true
            }))
        );

        console.log('Creando usuarios demo...');

        const usuarios = [];

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

        clientes.forEach((cliente, index) => {
            usuarios.push({
                clerkUserId: `demo_admin_cliente_${index + 1}`,
                email: `admin${index + 1}@urbanflow.demo`,
                nombre: 'Admin',
                apellido: cliente.localidad.replace(/\s/g, ''),
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
                clerkUserId: `demo_operador_cliente_${index + 1}`,
                email: `operador${index + 1}@urbanflow.demo`,
                nombre: 'Operador',
                apellido: cliente.localidad.replace(/\s/g, ''),
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
                clerkUserId: `demo_moderador_cliente_${index + 1}`,
                email: `moderador${index + 1}@urbanflow.demo`,
                nombre: 'Moderador',
                apellido: cliente.localidad.replace(/\s/g, ''),
                rol: 'moderador',
                clienteId: cliente._id,
                clienteNombre: cliente.nombre,
                ciudad: cliente.localidad,
                localidad: cliente.localidad,
                provincia: cliente.provincia,
                pais: cliente.pais,
                esDemo: true
            });
        });

        for (let i = 0; i < 50; i++) {
            const cliente = clientes[i % clientes.length];
            const nombre = nombres[i];
            const apellido = randomItem(apellidos);

            usuarios.push({
                clerkUserId: `demo_ciudadano_${i + 1}`,
                email: `ciudadano${i + 1}@urbanflow.demo`,
                nombre,
                apellido,
                edad: 18 + Math.floor(Math.random() * 55),
                telefono: `+5493534${String(100000 + i).padStart(6, '0')}`,
                direccion: `Domicilio demo ${i + 1}, ${cliente.localidad}`,
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

        const usuariosCreados = await User.insertMany(usuarios);
        const ciudadanos = usuariosCreados.filter((u) => u.rol === 'ciudadano');

        console.log('Creando 100 incidentes demo...');

        const reportes = [];

        for (let i = 0; i < 100; i++) {
            const cliente = clientes[i % clientes.length];
            const ciudadano = ciudadanos[i % ciudadanos.length];
            const categoria = randomItem(categorias);
            const prioridad = randomItem(prioridades);
            const estado = randomItem(estados);
            const texto = buildReporteTexto(categoria, cliente);

            reportes.push({
                usuarioId: ciudadano.clerkUserId,
                usuarioEmail: ciudadano.email,
                clienteId: cliente._id,
                clienteNombre: cliente.nombre,

                titulo: texto.titulo,
                columna_unica: texto.columna_unica,

                direccion: `Ubicación demo ${i + 1}, ${cliente.localidad}, ${cliente.provincia}`,
                latitud: randomCoordinate(cliente.latitud),
                longitud: randomCoordinate(cliente.longitud),
                localidad: cliente.localidad,
                provincia: cliente.provincia,
                pais: cliente.pais,

                observaciones: texto.observaciones,

                categoria_asignada_por_ia: categoria,
                ia_procesado: true,
                prioridad,
                etiquetas: [categoria, cliente.localidad.toLowerCase().replace(/\s/g, '-'), prioridad],

                ai_summary: `${texto.titulo} en ${cliente.localidad}. Prioridad sugerida: ${prioridad}.`,
                ai_priority_score: prioridad === 'critica' ? 95 : prioridad === 'alta' ? 78 : prioridad === 'media' ? 55 : 30,

                estado,
                fecha_hora: new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30)),
                esDemo: true
            });
        }

        await Reporte.insertMany(reportes);

        console.log('');
        console.log('Seed demo finalizado correctamente');
        console.log('Clientes creados:', clientes.length);
        console.log('Usuarios creados:', usuariosCreados.length);
        console.log('Ciudadanos creados:', ciudadanos.length);
        console.log('Incidentes creados:', reportes.length);
        console.log('');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error ejecutando seed demo:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

seedDemo();