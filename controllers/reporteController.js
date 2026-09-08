const Reporte = require('../models/Reporte');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const { createClerkClient } = require('@clerk/clerk-sdk-node');
//const { procesarIAReporte } = require('./iaController');

///agregado conectar la maquina con reporteController.js
const {
  ESTADOS_FINALES,
  estadosPermitidos,
  validarTransicionEstado,
  validarTransicionPorRol,
  registrarCambioEstado
} = require('../services/reporteWorkflow');

/// se elimino estados validos para que la verdad provenga de services/reporteWorkflow.js

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
      observaciones,
      prioridad,
      categoria,
      motivoRechazo,
      motivoCierre
    } = req.body;


    const reporte =
      await Reporte.findById(id);


    if (!reporte) {

      return res.status(404).json({
        error: 'Reporte no encontrado'
      });

    }


    const user =
      req.user ||
      await ensureUserExists(req.auth.userId);


    const esPropietario =
      reporte.usuarioId === req.auth.userId;

    const esAdmin =
      user?.rol === 'admin';

    const esOperador =
      user?.rol === 'operador' ||
      user?.rol === 'operator';


    if (
      !esPropietario &&
      !esAdmin &&
      !esOperador
    ) {

      return res.status(403).json({
        error:
          'No autorizado para modificar este reporte'
      });

    }


    if (observaciones !== undefined) {
      reporte.observaciones = observaciones;
    }

    if (prioridad) {
      reporte.prioridad = prioridad;
    }

    if (categoria) {
      reporte.categoria =
        mapearCategoria(categoria);
    }

    if (motivoRechazo !== undefined) {
      reporte.motivoRechazo = motivoRechazo;
    }

    if (motivoCierre !== undefined) {
      reporte.motivoCierre = motivoCierre;
    }


    reporte.updatedAt =
      new Date();


    await reporte.save();


    res.json({

      success: true,

      message:
        'Reporte actualizado',

      data: reporte

    });


  } catch (error) {

    console.error(
      'Error updateReporte:',
      error
    );


    res.status(500).json({

      error:
        'Error al actualizar reporte'

    });

  }

};
///controlador exclusivo de la maquina de estados, para que no se pueda modificar el estado desde el updateReporte
const cambiarEstadoReporte = async (req, res) => {

  try {

    const { id } =
      req.params;


    const {
      estado,
      observacion,
      observaciones,
      motivoRechazo,
      motivoCierre
    } = req.body;


    if (!estado) {

      return res.status(400).json({
        error:
          'El nuevo estado es obligatorio'
      });

    }


    const reporte =
      await Reporte.findById(id);


    if (!reporte) {

      return res.status(404).json({
        error:
          'Reporte no encontrado'
      });

    }


    const user =
      req.user ||
      await ensureUserExists(
        req.auth.userId
      );


    const rol =
      user?.rol;


    const esAdmin =
      rol === 'admin';


    const esOperador =
      rol === 'operador' ||
      rol === 'operator';


    /*
     * Ciudadano y otros roles
     * no pueden manejar estados.
     */
    if (
      !esAdmin &&
      !esOperador
    ) {

      return res.status(403).json({

        error:
          'Tu rol no puede modificar el estado del incidente'

      });

    }


    /*
     * Un operador sólo modifica
     * incidentes asignados a él.
     */
    if (
      esOperador &&
      reporte.operadorAsignadoId !==
        req.auth.userId
    ) {

      return res.status(403).json({

        error:
          'Este incidente no está asignado al operador autenticado'

      });

    }


    if (
      estado === reporte.estado
    ) {

      return res.status(400).json({

        error:
          `El incidente ya se encuentra en estado ${estado}`

      });

    }


    /*
     * ASIGNADO tiene sus propias operaciones:
     *
     * /tomar
     * /asignar-operador
     */
    if (
      estado === 'asignado'
    ) {

      return res.status(400).json({

        error:
          'Para asignar un incidente utilice /tomar o /asignar-operador'

      });

    }


    /*
     * Un estado final no puede volver
     * a modificarse.
     */
    if (
      ESTADOS_FINALES.includes(
        reporte.estado
      )
    ) {

      return res.status(400).json({

        error:
          `El incidente se encuentra en un estado final: ${reporte.estado}`

      });

    }


    /*
     * Primera validación:
     * ¿la transición existe?
     */
    if (
      !validarTransicionEstado(
        reporte.estado,
        estado
      )
    ) {

      return res.status(400).json({

        error:
          'Transición de estado no permitida',

        estadoActual:
          reporte.estado,

        estadoSolicitado:
          estado,

        estadosPermitidos:
          estadosPermitidos(
            reporte.estado
          )

      });

    }


    /*
     * Segunda validación:
     * ¿el rol tiene autorización?
     */
    if (
      !validarTransicionPorRol(
        rol,
        reporte.estado,
        estado
      )
    ) {

      return res.status(403).json({

        error:
          'El rol no puede realizar esta transición',

        rol,

        estadoActual:
          reporte.estado,

        estadoSolicitado:
          estado

      });

    }


    const textoObservacion =
      observacion ||
      observaciones ||
      '';


    /*
     * Este método hace las dos cosas:
     *
     * 1. cambia reporte.estado
     * 2. agrega historialEstados[]
     */
    registrarCambioEstado({

      reporte,

      nuevoEstado:
        estado,

      usuarioId:
        req.auth.userId,

      usuarioNombre:
        obtenerNombreUsuario(user),

      observacion:
        textoObservacion

    });


    if (
      estado === 'verificado'
    ) {

      reporte.verificadoPorId =
        req.auth.userId;

      reporte.verificadoPorNombre =
        obtenerNombreUsuario(user);

    }


    if (
      estado === 'rechazado' &&
      motivoRechazo !== undefined
    ) {

      reporte.motivoRechazo =
        motivoRechazo;

    }


    if (
      estado === 'cerrado' &&
      motivoCierre !== undefined
    ) {

      reporte.motivoCierre =
        motivoCierre;

    }


    await reporte.save();


    return res.json({

      success: true,

      message:
        'Estado actualizado correctamente',

      data: reporte

    });


  } catch (error) {

    console.error(
      'Error cambiarEstadoReporte:',
      error
    );


    return res.status(500).json({

      error:
        'Error al cambiar estado del incidente'

    });

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
      return res.status(404).json({
        error: 'Reporte no encontrado'
      });
    }

    const esOperador =
      operador?.rol === 'operador' ||
      operador?.rol === 'operator';

    if (!esOperador) {
      return res.status(403).json({
        error: 'Sólo un operador puede tomar un incidente'
      });
    }

    if (reporte.operadorAsignadoId) {
      return res.status(400).json({
        error: 'Este incidente ya fue tomado por otro operador'
      });
    }

    /*
     * La máquina solamente permite:
     *
     * ACEPTADO -> ASIGNADO
     */
    if (
      !validarTransicionEstado(
        reporte.estado,
        'asignado'
      )
    ) {
      return res.status(400).json({
        error: 'El incidente no puede ser tomado en su estado actual',
        estadoActual: reporte.estado,
        estadosPermitidos: estadosPermitidos(reporte.estado)
      });
    }

    const municipioReporte =
      normalizarTexto(
        reporte.municipio ||
        reporte.localidad ||
        ''
      );

    const municipioOperador =
      normalizarTexto(
        operador.municipio ||
        operador.localidad ||
        ''
      );

    if (
      municipioReporte &&
      municipioOperador &&
      municipioReporte !== municipioOperador
    ) {
      return res.status(403).json({
        error: 'No podés tomar incidentes de otro municipio'
      });
    }

    const nombreOperador =
      obtenerNombreUsuario(operador);

    reporte.operadorAsignadoId =
      operador.clerkUserId;

    reporte.operadorAsignadoNombre =
      nombreOperador;

    /*
     * Ya NO hacemos:
     *
     * reporte.estado = 'asignado'
     *
     * El cambio pasa por la máquina.
     */
    registrarCambioEstado({
      reporte,
      nuevoEstado: 'asignado',
      usuarioId: operador.clerkUserId,
      usuarioNombre: nombreOperador,
      observacion: 'Incidente tomado por operador'
    });

    await reporte.save();

    return res.json({
      success: true,
      message: 'Incidente tomado correctamente',
      data: reporte
    });

  } catch (error) {

    console.error(
      'Error tomando reporte:',
      error
    );

    return res.status(500).json({
      error: 'Error al tomar incidente'
    });
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

    const {
      operadorId,
      operadorNombre
    } = req.body;

    if (!operadorId) {
      return res.status(400).json({
        error: 'operadorId es obligatorio'
      });
    }

    const admin =
      req.user ||
      await ensureUserExists(
        req.auth.userId
      );

    if (admin?.rol !== 'admin') {
      return res.status(403).json({
        error:
          'Sólo un administrador puede asignar operadores'
      });
    }

    const reporte =
      await Reporte.findById(id);

    if (!reporte) {
      return res.status(404).json({
        error: 'Reporte no encontrado'
      });
    }

    /*
     * No permitimos reasignar silenciosamente
     * un incidente ya asignado.
     */
    if (reporte.operadorAsignadoId) {
      return res.status(400).json({
        error:
          'El incidente ya tiene un operador asignado'
      });
    }

    /*
     * La máquina solamente permite:
     *
     * ACEPTADO -> ASIGNADO
     */
    if (
      !validarTransicionEstado(
        reporte.estado,
        'asignado'
      )
    ) {
      return res.status(400).json({
        error:
          'El incidente no puede ser asignado en su estado actual',

        estadoActual:
          reporte.estado,

        estadosPermitidos:
          estadosPermitidos(
            reporte.estado
          )
      });
    }

    /*
     * Verificamos que el operador
     * realmente exista.
     */
    const operador =
      await User.findOne({
        clerkUserId: operadorId
      });

    if (!operador) {
      return res.status(404).json({
        error:
          'El operador seleccionado no existe'
      });
    }

    const rolOperadorValido =
      operador.rol === 'operador' ||
      operador.rol === 'operator';

    if (!rolOperadorValido) {
      return res.status(400).json({
        error:
          'El usuario seleccionado no tiene rol de operador'
      });
    }

    const municipioReporte =
      normalizarTexto(
        reporte.municipio ||
        reporte.localidad ||
        ''
      );

    const municipioOperador =
      normalizarTexto(
        operador.municipio ||
        operador.localidad ||
        ''
      );

    if (
      municipioReporte &&
      municipioOperador &&
      municipioReporte !== municipioOperador
    ) {
      return res.status(400).json({
        error:
          'El operador pertenece a otro municipio'
      });
    }

    const nombreOperador =
      operadorNombre ||
      obtenerNombreUsuario(operador);

    reporte.operadorAsignadoId =
      operadorId;

    reporte.operadorAsignadoNombre =
      nombreOperador;

    /*
     * El estado y el historial
     * se modifican mediante la máquina.
     */
    registrarCambioEstado({
      reporte,
      nuevoEstado: 'asignado',
      usuarioId: req.auth.userId,
      usuarioNombre:
        obtenerNombreUsuario(admin),
      observacion:
        `Incidente asignado a ${nombreOperador}`
    });

    await reporte.save();

    return res.json({
      success: true,
      message:
        'Operador asignado correctamente',
      data: reporte
    });

  } catch (error) {

    console.error(
      'Error asignarOperador:',
      error
    );

    return res.status(500).json({
      error:
        'Error al asignar operador'
    });
  }
};



module.exports = {
  createReporte,
  getReportes,
  getReporteById,
  getMisReportes,
  updateReporte,
  cambiarEstadoReporte,
  deleteReporte,
  tomarReporte,
  updateCategoriaIA,
  asignarOperador
};