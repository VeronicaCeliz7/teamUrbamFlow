const Reporte = require('../models/Reporte');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const { createClerkClient } = require('@clerk/clerk-sdk-node');

// Función auxiliar para asegurar que el usuario existe en MongoDB
const ensureUserExists = async (clerkUserId) => {
    let user = await User.findOne({ clerkUserId });
    
    if (!user) {
        console.log(`👤 Usuario no encontrado en MongoDB, sincronizando desde Clerk: ${clerkUserId}`);
        
        const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
        const clerkUser = await clerk.users.getUser(clerkUserId);
        
        user = new User({
            clerkUserId: clerkUserId,
            email: clerkUser.emailAddresses[0]?.emailAddress,
            nombre: clerkUser.firstName || '',
            apellido: clerkUser.lastName || '',
            ultimoAcceso: new Date()
        });
        await user.save();
        console.log(`✅ Usuario sincronizado: ${user.email}`);
    }
    
    return user;
};
const detectarMunicipioPorCoordenadas = (lat, lng) => {
    const latNum = Number(lat);
    const lngNum = Number(lng);

    const villaMaria = {
        minLat: -32.45,
        maxLat: -32.35,
        minLng: -63.32,
        maxLng: -63.18
    };

    if (
        latNum >= villaMaria.minLat &&
        latNum <= villaMaria.maxLat &&
        lngNum >= villaMaria.minLng &&
        lngNum <= villaMaria.maxLng
    ) {
        return 'villa-maria';
    }

    return 'sin-municipio';
};

// Registra cada cambio de estado y calcula duración del estado anterior
const registrarCambioEstado = (
    reporte,
    nuevoEstado,
    usuarioId,
    usuarioNombre,
    observacion = ''
) => {
    const ahora = new Date();

    if (!reporte.historialEstados) {
        reporte.historialEstados = [];
    }

    const ultimoEstado = reporte.historialEstados[reporte.historialEstados.length - 1];

    if (ultimoEstado && !ultimoEstado.hasta) {
        const fechaInicio = ultimoEstado.desde || ultimoEstado.fecha || reporte.createdAt || reporte.fecha_hora;

        ultimoEstado.hasta = ahora;
        ultimoEstado.duracionMinutos = Math.max(
            0,
            Math.round((ahora - new Date(fechaInicio)) / 60000)
        );
    }

    reporte.historialEstados.push({
        estado: nuevoEstado,
        fecha: ahora,
        desde: ahora,
        hasta: null,
        duracionMinutos: null,
        usuarioId,
        usuarioNombre,
        observacion
    });

    reporte.estado = nuevoEstado;
};

// Crear nuevo reporte
const createReporte = async (req, res) => {
    try {
        console.log('\n🚨 ========== INICIO CREATE REPORTE ==========');
        console.log('📥 Body recibido:', JSON.stringify(req.body, null, 2));
        console.log('👤 Usuario autenticado:', req.auth?.userId);
        
        // Verificar campos requeridos (fecha_hora ya NO es obligatorio)
        const campos = ['titulo', 'columna_unica', 'direccion'];
        for (const campo of campos) {
            if (!req.body[campo]) {
                console.log(`❌ Campo faltante: ${campo}`);
                return res.status(400).json({ 
                    error: `Campo requerido faltante: ${campo}` 
                });
            }
            console.log(`✅ Campo ${campo}: ${req.body[campo]}`);
        }
        
        // Asegurar que el usuario existe en MongoDB
        console.log('🔍 Buscando/creando usuario...');
        const user = await ensureUserExists(req.auth.userId);
        console.log(`✅ Usuario encontrado/sincronizado: ${user.email}`);
        
        const { 
            titulo, 
            columna_unica, 
            direccion, 
            latitud, 
            longitud, 
            observaciones, 
            archivo_url,
            archivo_public_id,
            archivo_tipo,
            municipio
            } = req.body;
        // fecha_hora NO se desestructura, se usa directamente de req.body o se genera
        const fecha_hora = req.body.fecha_hora; // puede ser undefined

        console.log('📝 Creando objeto Reporte...');
        const reporteData = {
            usuarioId: req.auth.userId,
            usuarioEmail: user.email,
            titulo: titulo.trim(),
            columna_unica: columna_unica.trim(),
            direccion: direccion.trim(),
            latitud: latitud !== undefined && latitud !== null ? Number(latitud) : 0,
            longitud: longitud !== undefined && longitud !== null ? Number(longitud) : 0,
            municipio: municipio || detectarMunicipioPorCoordenadas(latitud, longitud),
            operadorAsignadoId: null,
            operadorAsignadoNombre: null,
            estado: 'pendiente',
            
          historialEstados: [
    {
        estado: 'pendiente',
        fecha: fecha_hora ? new Date(fecha_hora) : new Date(),
        desde: fecha_hora ? new Date(fecha_hora) : new Date(),
        hasta: null,
        duracionMinutos: null,
        usuarioId: req.auth.userId,
        usuarioNombre: user.email,
        observacion: 'Incidente reportado por ciudadano'
    }
],

            observaciones: observaciones ? observaciones.trim() : '',
            fecha_hora: fecha_hora ? new Date(fecha_hora) : new Date(),
            archivo_url: archivo_url || undefined,
            archivo_public_id: archivo_public_id || undefined,
            archivo_tipo: archivo_tipo || undefined
        };
        
        console.log('📊 Datos del reporte:', JSON.stringify(reporteData, null, 2));
        
        const reporte = new Reporte(reporteData);

        console.log('💾 Guardando en MongoDB...');
        await reporte.save();
        
        console.log(`✅ Reporte creado ID: ${reporte._id} por usuario: ${user.email}`);
        console.log('🚨 ========== FIN CREATE REPORTE ==========\n');

        res.status(201).json({ 
            success: true, 
            message: 'Reporte creado exitosamente',
            data: reporte 
        });
    } catch (error) {
        console.error('\n🔴 ========== ERROR EN CREATE REPORTE ==========');
        console.error('🔴 Error name:', error.name);
        console.error('🔴 Error message:', error.message);
        
        if (error.name === 'ValidationError') {
            console.error('🔴 Errores de validación:');
            for (const field in error.errors) {
                console.error(`   - ${field}: ${error.errors[field].message}`);
            }
            const camposFaltantes = Object.keys(error.errors).join(', ');
            return res.status(400).json({ 
                error: `Error de validación: ${camposFaltantes}`,
                detalles: error.errors
            });
        }
        
        if (error.code === 11000) {
            console.error('🔴 Error de duplicado:', error.keyPattern);
            return res.status(400).json({ 
                error: 'Ya existe un registro con esos datos' 
            });
        }
        
        console.error('🔴 Error completo:', error);
        console.error('🔴 ========== FIN ERROR ==========\n');
        
        res.status(500).json({ 
            error: 'Error al crear reporte', 
            mensaje: error.message 
        });
    }
};

// Obtener todos los reportes (con filtros opcionales)
const getReportes = async (req, res) => {
    try {
        const {
            estado,
            categoria,
            prioridad,
            lat,
            lng,
            radio,
            municipio,
            localidad,
            operadorId,
            sinAsignar
        } = req.query;

        let filtro = {};

        if (estado) {
            filtro.estado = estado;
        }

        if (prioridad) {
            filtro.prioridad = prioridad;
        }

        if (categoria) {
            const categoriaRegex = new RegExp(
                categoria.toString().trim().replace(/[-_\s]+/g, '[-_\\s]*'),
                'i'
            );

            filtro.$or = [
                { categoria_asignada_por_ia: categoriaRegex },
                { categoria: categoriaRegex },
                { etiquetas: categoriaRegex }
            ];
        }

        if (operadorId) {
            filtro.operadorAsignadoId = operadorId;
        }

        if (sinAsignar === 'true') {
            filtro.operadorAsignadoId = null;
        }

        const territorio = municipio || localidad;

        if (territorio) {
            const territorioNormalizado = territorio
                .toString()
                .trim()
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[-_\s]+/g, '-');

            const territorioRegex = new RegExp(
                territorioNormalizado.replace(/-/g, '[-_\\s]*'),
                'i'
            );

            const condicionesTerritorio = [
                { municipio: territorioRegex },
                { localidad: territorioRegex },
                { direccion: territorioRegex }
            ];

            if (territorioNormalizado === 'villa-maria') {
                condicionesTerritorio.push({
                    latitud: { $gte: -32.45, $lte: -32.35 },
                    longitud: { $gte: -63.32, $lte: -63.18 }
                });
            }

            if (filtro.$or) {
                filtro.$and = [
                    { $or: filtro.$or },
                    { $or: condicionesTerritorio }
                ];
                delete filtro.$or;
            } else {
                filtro.$or = condicionesTerritorio;
            }
        }

        if (lat && lng && radio) {
            filtro.latitud = { $exists: true, $ne: 0 };
            filtro.longitud = { $exists: true, $ne: 0 };
        }

        console.log('🔎 FILTRO REPORTES:', JSON.stringify(filtro, null, 2));

        const reportes = await Reporte.find(filtro).sort({ createdAt: -1 });

        console.log(`✅ Reportes encontrados: ${reportes.length}`);


        res.json({
            success: true,
            count: reportes.length,
            data: reportes
        });

    } catch (error) {
        console.error('Error al obtener reportes:', error);

        res.status(500).json({
            error: 'Error al obtener reportes',
            mensaje: error.message
        });
    }
    };
// Obtener un reporte por ID
const getReporteById = async (req, res) => {
    try {
        const reporte = await Reporte.findById(req.params.id);
        if (!reporte) {
            return res.status(404).json({ error: 'Reporte no encontrado' });
        }
        res.json({ success: true, data: reporte });
    } catch (error) {
        console.error('Error al obtener reporte:', error);
        res.status(500).json({ error: 'Error al obtener reporte' });
    }
};

// Obtener reportes del usuario autenticado
const getMisReportes = async (req, res) => {
    try {
        await ensureUserExists(req.auth.userId);
        const reportes = await Reporte.find({ usuarioId: req.auth.userId }).sort({ createdAt: -1 });
        res.json({ 
            success: true, 
            count: reportes.length,
            data: reportes 
        });
    } catch (error) {
        console.error('Error al obtener mis reportes:', error);
        res.status(500).json({ error: 'Error al obtener reportes' });
    }
};

// Actualizar reporte
const updateReporte = async (req, res) => {
    console.log('🚀 ENTRE A UPDATE REPORTE')
    console.log('ID:', req.params.id)
    console.log('BODY:', req.body)

    try {
        const { id } = req.params;
        const {
          estado,
         observaciones,
         operadorAsignadoId,
         operadorAsignadoNombre
        } = req.body;

        const reporte = await Reporte.findById(id);
        console.log('📄 REPORTE ENCONTRADO:')
        console.log(reporte)

        if (!reporte) {
            return res.status(404).json({ error: 'Reporte no encontrado' });
        }

        const user = await User.findOne({ clerkUserId: req.auth.userId });
        if (reporte.usuarioId !== req.auth.userId && user?.rol !== 'admin') {
            return res.status(403).json({ error: 'No autorizado para modificar este reporte' });
        }

        if (estado && estado !== reporte.estado) {

            reporte.historialEstados.push({
               estado,
               fecha: new Date(),
               usuarioId: req.auth.userId,
               usuarioNombre:
                 `${user?.nombre || ''} ${user?.apellido || ''}`.trim(),
               observacion:
                  observaciones || `Cambio de estado a ${estado}`
        });

        reporte.estado = estado;
} 

         console.log('📝 NUEVO ESTADO:', reporte.estado)
        

        if (observaciones) reporte.observaciones = observaciones;
        reporte.updatedAt = Date.now();

        if (operadorAsignadoId !== undefined) {
        reporte.operadorAsignadoId = operadorAsignadoId;
        }

        if (operadorAsignadoNombre !== undefined) {
     reporte.operadorAsignadoNombre = operadorAsignadoNombre;
    }
        if (!reporte.historialEstados) {
            reporte.historialEstados = [];
        }

        await reporte.save();
        console.log('✅ REPORTE GUARDADO:')
        console.log(reporte)


        res.json({ success: true, message: 'Reporte actualizado', data: reporte });
    } catch (error) {
        console.error('🔴 ERROR UPDATE REPORTE')
        console.error(error)
        res.status(500).json({ error: 'Error al actualizar reporte' });
    }
};

// Eliminar reporte
const deleteReporte = async (req, res) => {
    try {
        const { id } = req.params;
        
        const reporte = await Reporte.findById(id);
        if (!reporte) {
            return res.status(404).json({ error: 'Reporte no encontrado' });
        }

        const user = await User.findOne({ clerkUserId: req.auth.userId });
        if (reporte.usuarioId !== req.auth.userId && user?.rol !== 'admin') {
            return res.status(403).json({ error: 'No autorizado para eliminar este reporte' });
        }

        if (reporte.archivo_public_id) {
            try {
                await cloudinary.uploader.destroy(reporte.archivo_public_id);
                console.log(`🗑️ Archivo eliminado de Cloudinary: ${reporte.archivo_public_id}`);
            } catch (cloudinaryError) {
                console.error('Error al eliminar de Cloudinary:', cloudinaryError);
            }
        }

        await Reporte.findByIdAndDelete(id);
        
        res.json({ success: true, message: 'Reporte eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar reporte:', error);
        res.status(500).json({ error: 'Error al eliminar reporte' });
    }
};
const tomarReporte = async (req, res) => {
    try {
        const { id } = req.params;

        const operador = await ensureUserExists(req.auth.userId);

        const reporte = await Reporte.findById(id);

        if (!reporte) {
            return res.status(404).json({ error: 'Reporte no encontrado' });
        }

        if (reporte.operadorAsignadoId) {
            return res.status(400).json({
                error: 'Este incidente ya fue tomado por otro operador'
            });
        }

        if (reporte.municipio !== operador.municipio) {
            return res.status(403).json({
                error: 'No podés tomar incidentes de otro municipio'
            });
        }

        reporte.operadorAsignadoId = operador.clerkUserId;
        reporte.operadorAsignadoNombre = `${operador.nombre || ''} ${operador.apellido || ''}`.trim();
        
        registrarCambioEstado(
    reporte,
    'en_proceso',
    operador.clerkUserId,
    reporte.operadorAsignadoNombre,
    'Incidente tomado por operador'
);
        reporte.updatedAt = Date.now();

        await reporte.save();

        res.json({
            success: true,
            message: 'Incidente tomado correctamente',
            data: reporte
        });
    } catch (error) {
        console.error('Error tomando reporte:', error);
        res.status(500).json({ error: 'Error al tomar incidente' });
    }
};

// Endpoint para que la IA actualice categorías (admin/ia)
const updateCategoriaIA = async (req, res) => {
    try {
        const { id } = req.params;
        const { categoria_asignada_por_ia } = req.body;

        const reporte = await Reporte.findByIdAndUpdate(
            id,
            { 
                categoria_asignada_por_ia,
                ia_procesado: true,
                updatedAt: Date.now()
            },
            { new: true }
        );

        if (!reporte) {
            return res.status(404).json({ error: 'Reporte no encontrado' });
        }

console.log('\n========== REPORTE COMPLETO ==========');
console.log(JSON.stringify(reporte, null, 2));
console.log('======================================\n');

        res.json({ success: true, data: reporte });
    } catch (error) {
        console.error('Error al actualizar categoría IA:', error);
        res.status(500).json({ error: 'Error al actualizar categoría' });
    }
};

module.exports = {
    createReporte,
    getReportes,
    getReporteById,
    getMisReportes,
    updateReporte,
    deleteReporte,
    tomarReporte,
    updateCategoriaIA
};