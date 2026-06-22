const Reporte = require('../models/Reporte');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const { createClerkClient } = require('@clerk/clerk-sdk-node');
//const { procesarIAReporte } = require('./iaController');

const ESTADOS_VALIDOS = [
  'reportado',
  'validacion_inicial',
  'aceptado',
  'asignado',
  'en_proceso',
  'resuelto',
  'verificado',
  'cerrado',
  'rechazado',
  'duplicado',
  'informacion_insuficiente',
  'fuera_de_jurisdiccion',
  'pendiente'
];

const normalizarTexto = (valor = '') =>
  String(valor)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_\s]+/g, '-');

const obtenerNombreUsuario = (user) => {
  const nombre = `${user?.nombre || ''} ${user?.apellido || ''}`.trim();
  return nombre || user?.email || 'Usuario del sistema';
};

const ensureUserExists = async (clerkUserId) => {
  let user = await User.findOne({ clerkUserId });

  if (!user) {
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const clerkUser = await clerk.users.getUser(clerkUserId);

    user = new User({
      clerkUserId,
      email: clerkUser.emailAddresses[0]?.emailAddress,
      nombre: clerkUser.firstName || '',
      apellido: clerkUser.lastName || '',
      ultimoAcceso: new Date()
    });

    await user.save();
  }

  return user;
};

const detectarMunicipioPorCoordenadas = (lat, lng) => {
  const latNum = Number(lat);
  const lngNum = Number(lng);

  if (
    latNum >= -32.45 &&
    latNum <= -32.35 &&
    lngNum >= -63.32 &&
    lngNum <= -63.18
  ) {
    return 'villa-maria';
  }

  return 'sin-municipio';
};

const mapearCategoria = (valor = '') => {
  const v = normalizarTexto(valor);

  if (v.includes('bache')) return 'bache';
  if (v.includes('basura') || v.includes('residuo')) return 'basura';
  if (v.includes('luminaria') || v.includes('luz') || v.includes('alumbrado')) return 'luminaria';
  if (v.includes('semaforo')) return 'semaforo';
  if (v.includes('seguridad')) return 'seguridad';
  if (v.includes('animal') || v.includes('perro')) return 'animal_suelto';
  if (v.includes('arbol')) return 'arbolado';
  if (v.includes('agua') || v.includes('cloaca')) return 'agua_cloaca';
  if (v.includes('transito')) return 'transito';

  return 'otros';
};

const createReporte = async (req, res) => {
  try {
    const campos = ['titulo', 'columna_unica', 'direccion'];

    for (const campo of campos) {
      if (!req.body[campo]) {
        return res.status(400).json({
          error: `Campo requerido faltante: ${campo}`
        });
      }
    }

    const user = await ensureUserExists(req.auth.userId);

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
      municipio,
      localidad,
      provincia,
      categoria,
      categoria_asignada_por_ia,
      prioridad
    } = req.body;

    const municipioDetectado =
      municipio ||
      localidad ||
      detectarMunicipioPorCoordenadas(latitud, longitud);

    const categoriaFinal = mapearCategoria(
      categoria || categoria_asignada_por_ia || titulo || columna_unica
    );

    const estadoInicial = 'reportado';

    const reporte = new Reporte({
      usuarioId: req.auth.userId,
      usuarioEmail: user.email,

      clienteId: req.body.clienteId || null,
      clienteNombre: req.body.clienteNombre || null,

      titulo: titulo.trim(),
      columna_unica: columna_unica.trim(),
      direccion: direccion.trim(),

      latitud: latitud !== undefined && latitud !== null ? Number(latitud) : 0,
      longitud: longitud !== undefined && longitud !== null ? Number(longitud) : 0,

      municipio: normalizarTexto(municipioDetectado),
      localidad: localidad ? normalizarTexto(localidad) : normalizarTexto(municipioDetectado),
      provincia: provincia || 'Córdoba',
      pais: 'Argentina',

      operadorAsignadoId: null,
      operadorAsignadoNombre: null,

      estado: estadoInicial,
      categoria: categoriaFinal,
      categoria_asignada_por_ia: categoria_asignada_por_ia || null,
      prioridad: prioridad || 'media',

      historialEstados: [
        {
          estado: estadoInicial,
          fecha: new Date(),
          usuarioId: req.auth.userId,
          usuarioNombre: obtenerNombreUsuario(user),
          observacion: 'Incidente reportado por ciudadano'
        }
      ],

      observaciones: observaciones ? observaciones.trim() : '',
      fecha_hora: req.body.fecha_hora ? new Date(req.body.fecha_hora) : new Date(),

      archivo_url: archivo_url || undefined,
      archivo_public_id: archivo_public_id || undefined,
      archivo_tipo: archivo_tipo || undefined,

      esDemo: req.body.esDemo || false
    });

       console.log('🧪 ESTADO QUE SE VA A GUARDAR:', reporte.estado);
       console.log('🧪 HISTORIAL QUE SE VA A GUARDAR:', reporte.historialEstados);

    await reporte.save();

    res.status(201).json({
      success: true,
      message: 'Reporte creado exitosamente',
      data: reporte
    });
  } catch (error) {
    console.error('Error en createReporte:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Error de validación',
        detalles: error.errors
      });
    }

    res.status(500).json({
      error: 'Error al crear reporte',
      mensaje: error.message
    });
  }
};

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

    if (estado) filtro.estado = estado;
    if (prioridad) filtro.prioridad = prioridad;

    if (categoria) {
      const categoriaRegex = new RegExp(
        categoria.toString().trim().replace(/[-_\s]+/g, '[-_\\s]*'),
        'i'
      );

      filtro.$or = [
        { categoria: categoriaRegex },
        { categoria_asignada_por_ia: categoriaRegex },
        { etiquetas: categoriaRegex }
      ];
    }

    if (operadorId) filtro.operadorAsignadoId = operadorId;

    if (sinAsignar === 'true') {
      filtro.operadorAsignadoId = null;
    }

    const territorio = municipio || localidad;

    if (territorio) {
      const territorioNormalizado = normalizarTexto(territorio);

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

    const reportes = await Reporte.find(filtro).sort({ createdAt: -1 });

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

const getMisReportes = async (req, res) => {
  try {
    await ensureUserExists(req.auth.userId);

    const reportes = await Reporte.find({
      usuarioId: req.auth.userId
    }).sort({ createdAt: -1 });

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

const updateReporte = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      estado,
      observaciones,
      operadorAsignadoId,
      operadorAsignadoNombre,
      prioridad,
      categoria,
      motivoRechazo,
      motivoCierre
    } = req.body;

    const reporte = await Reporte.findById(id);

    if (!reporte) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    const user = await ensureUserExists(req.auth.userId);

    const esPropietario = reporte.usuarioId === req.auth.userId;
    const esAdmin = user?.rol === 'admin' || user?.role === 'admin';
    const esOperador = user?.rol === 'operador' || user?.role === 'operador';

    if (!esPropietario && !esAdmin && !esOperador) {
      return res.status(403).json({ error: 'No autorizado para modificar este reporte' });
    }

    if (!reporte.historialEstados) {
      reporte.historialEstados = [];
    }

    if (estado && estado !== reporte.estado) {
      if (!ESTADOS_VALIDOS.includes(estado)) {
        return res.status(400).json({ error: `Estado no válido: ${estado}` });
      }

      reporte.historialEstados.push({
        estado,
        fecha: new Date(),
        usuarioId: req.auth.userId,
        usuarioNombre: obtenerNombreUsuario(user),
        observacion: observaciones || `Cambio de estado a ${estado}`
      });

      reporte.estado = estado;

      if (estado === 'asignado') reporte.fechaAsignacion = new Date();
      if (estado === 'resuelto') reporte.fechaResolucion = new Date();
      if (estado === 'verificado') {
        reporte.fechaVerificacion = new Date();
        reporte.verificadoPorId = req.auth.userId;
        reporte.verificadoPorNombre = obtenerNombreUsuario(user);
      }
      if (estado === 'cerrado') reporte.fechaCierre = new Date();
    }

    if (observaciones) reporte.observaciones = observaciones;
    if (prioridad) reporte.prioridad = prioridad;
    if (categoria) reporte.categoria = mapearCategoria(categoria);
    if (motivoRechazo) reporte.motivoRechazo = motivoRechazo;
    if (motivoCierre) reporte.motivoCierre = motivoCierre;

    if (operadorAsignadoId !== undefined) {
      reporte.operadorAsignadoId = operadorAsignadoId;
    }

    if (operadorAsignadoNombre !== undefined) {
      reporte.operadorAsignadoNombre = operadorAsignadoNombre;
    }

    reporte.updatedAt = Date.now();

    await reporte.save();

    res.json({
      success: true,
      message: 'Reporte actualizado',
      data: reporte
    });
  } catch (error) {
    console.error('Error updateReporte:', error);
    res.status(500).json({ error: 'Error al actualizar reporte' });
  }
};

const deleteReporte = async (req, res) => {
  try {
    const { id } = req.params;

    const reporte = await Reporte.findById(id);

    if (!reporte) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    const user = await ensureUserExists(req.auth.userId);

    const esPropietario = reporte.usuarioId === req.auth.userId;
    const esAdmin = user?.rol === 'admin' || user?.role === 'admin';

    if (!esPropietario && !esAdmin) {
      return res.status(403).json({ error: 'No autorizado para eliminar este reporte' });
    }

    if (reporte.archivo_public_id) {
      try {
        await cloudinary.uploader.destroy(reporte.archivo_public_id);
      } catch (cloudinaryError) {
        console.error('Error al eliminar de Cloudinary:', cloudinaryError);
      }
    }

    await Reporte.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Reporte eliminado exitosamente'
    });
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

    const municipioReporte = normalizarTexto(reporte.municipio || reporte.localidad || '');
    const municipioOperador = normalizarTexto(operador.municipio || operador.localidad || '');

    if (municipioReporte && municipioOperador && municipioReporte !== municipioOperador) {
      return res.status(403).json({
        error: 'No podés tomar incidentes de otro municipio'
      });
    }

    if (!reporte.historialEstados) {
      reporte.historialEstados = [];
    }

    const nombreOperador = obtenerNombreUsuario(operador);

    reporte.operadorAsignadoId = operador.clerkUserId;
    reporte.operadorAsignadoNombre = nombreOperador;
    reporte.estado = 'asignado';
    reporte.fechaAsignacion = new Date();

    reporte.historialEstados.push({
      estado: 'asignado',
      fecha: new Date(),
      usuarioId: operador.clerkUserId,
      usuarioNombre: nombreOperador,
      observacion: 'Incidente tomado por operador'
    });

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

const updateCategoriaIA = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoria_asignada_por_ia } = req.body;

    const reporte = await Reporte.findByIdAndUpdate(
      id,
      {
        categoria_asignada_por_ia,
        categoria: mapearCategoria(categoria_asignada_por_ia),
        ia_procesado: true,
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!reporte) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    res.json({ success: true, data: reporte });
  } catch (error) {
    console.error('Error al actualizar categoría IA:', error);
    res.status(500).json({ error: 'Error al actualizar categoría' });
  }
};

const asignarOperador = async (req, res) => {
  try {
    const { id } = req.params;
    const { operadorId, operadorNombre } = req.body;

    if (!operadorId) {
      return res.status(400).json({ error: 'operadorId es obligatorio' });
    }

    const reporte = await Reporte.findById(id);

    if (!reporte) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    reporte.operadorAsignadoId = operadorId;
    reporte.operadorAsignadoNombre = operadorNombre || 'Operador asignado';
    reporte.estado = 'asignado';
    reporte.fechaAsignacion = new Date();

    if (!reporte.historialEstados) {
      reporte.historialEstados = [];
    }

    reporte.historialEstados.push({
      estado: 'asignado',
      fecha: new Date(),
      usuarioId: req.auth?.userId || null,
      usuarioNombre: operadorNombre || 'Administrador municipal',
      observacion: `Asignado manualmente a ${operadorNombre || operadorId}`
    });

    reporte.updatedAt = Date.now();

    await reporte.save();

    res.json({
      success: true,
      message: 'Operador asignado correctamente',
      data: reporte
    });
  } catch (error) {
    console.error('Error asignarOperador:', error);
    res.status(500).json({ error: 'Error al asignar operador' });
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
  updateCategoriaIA,
  asignarOperador
};