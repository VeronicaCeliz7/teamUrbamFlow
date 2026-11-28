const TRANSICIONES_VALIDAS = Object.freeze({
  reportado: ['validacion_inicial'],

  validacion_inicial: [
    'aceptado',
    'rechazado',
    'duplicado',
    'informacion_insuficiente',
    'fuera_de_jurisdiccion'
  ],

  informacion_insuficiente: [
    'validacion_inicial'
  ],

  aceptado: [
    'asignado'
  ],

  asignado: [
    'en_proceso'
  ],

  en_proceso: [
    'resuelto'
  ],

  resuelto: [
    'verificado',
    'en_proceso'
  ],

  verificado: [
    'cerrado'
  ],

  cerrado: [],
  rechazado: [],
  duplicado: [],
  fuera_de_jurisdiccion: [],

  // Compatibilidad solamente con datos históricos
  pendiente: [
    'validacion_inicial'
  ]
});

const TRANSICIONES_POR_ROL = Object.freeze({
  admin: {
    reportado: [
      'validacion_inicial'
    ],

    pendiente: [
      'validacion_inicial'
    ],

    validacion_inicial: [
      'aceptado',
      'rechazado',
      'duplicado',
      'informacion_insuficiente',
      'fuera_de_jurisdiccion'
    ],

    informacion_insuficiente: [
      'validacion_inicial'
    ],

    aceptado: [
      'asignado'
    ],

    resuelto: [
      'verificado',
      'en_proceso'
    ],

    verificado: [
      'cerrado'
    ]
  },

  operador: {
    asignado: [
      'en_proceso'
    ],

    en_proceso: [
      'resuelto'
    ]
  },

  // El modelo de User admite ambos nombres
  operator: {
    asignado: [
      'en_proceso'
    ],

    en_proceso: [
      'resuelto'
    ]
  }
});

const ESTADOS_FINALES = Object.freeze([
  'cerrado',
  'rechazado',
  'duplicado',
  'fuera_de_jurisdiccion'
]);

const normalizarClave = (valor) => {
  if (!valor || typeof valor !== 'string') return '';
  return valor.trim().toLowerCase();
};

const estadosPermitidos = (estadoActual) => {
  const clave = normalizarClave(estadoActual);
  return TRANSICIONES_VALIDAS[clave] || [];
};

const validarTransicionEstado = (
  estadoActual,
  nuevoEstado
) => {
  const actual = normalizarClave(estadoActual);
  const siguiente = normalizarClave(nuevoEstado);

  if (ESTADOS_FINALES.includes(actual)) {
    return false;
  }

  return estadosPermitidos(actual).includes(siguiente);
};

const validarTransicionPorRol = (
  rol,
  estadoActual,
  nuevoEstado
) => {
  const rolNormalizado = normalizarClave(rol);
  const actual = normalizarClave(estadoActual);
  const siguiente = normalizarClave(nuevoEstado);

  if (!validarTransicionEstado(actual, siguiente)) {
    return false;
  }

  const reglasRol = TRANSICIONES_POR_ROL[rolNormalizado] || {};
  return (reglasRol[actual] || []).includes(siguiente);
};

const asegurarHistorialBase = (reporte) => {
  if (!reporte.historialEstados) {
    reporte.historialEstados = [];
  }

  /*
   * Esto contempla reportes antiguos.
   * No inventamos su historia anterior.
   * Simplemente dejamos constancia del estado
   * que tenían cuando comenzó la trazabilidad.
   */
  if (
    reporte.historialEstados.length === 0 &&
    reporte.estado
  ) {
    reporte.historialEstados.push({
      estado: reporte.estado,
      fecha:
        reporte.createdAt ||
        reporte.fecha_hora ||
        new Date(),
      usuarioId: null,
      usuarioNombre: 'Sistema',
      observacion:
        'Estado existente al iniciar la trazabilidad'
    });
  }
};

const registrarCambioEstado = ({
  reporte,
  nuevoEstado,
  usuarioId,
  usuarioNombre,
  observacion = '',
  rol = null
}) => {
  const estadoAnterior = reporte.estado;
  const siguiente = normalizarClave(nuevoEstado);

  if (!validarTransicionEstado(estadoAnterior, siguiente)) {
    throw new Error(
      `Transición de estado no permitida: ${estadoAnterior} -> ${nuevoEstado}`
    );
  }

  if (rol && !validarTransicionPorRol(rol, estadoAnterior, siguiente)) {
    throw new Error(
      `El rol "${rol}" no puede realizar la transición: ${estadoAnterior} -> ${nuevoEstado}`
    );
  }

  asegurarHistorialBase(reporte);

  const ahora = new Date();

  reporte.historialEstados.push({
    estado: siguiente,
    fecha: ahora,
    usuarioId,
    usuarioNombre,
    observacion:
      observacion ||
      `Cambio de estado: ${estadoAnterior} -> ${siguiente}`
  });

  reporte.estado = siguiente;
  reporte.updatedAt = ahora;

  if (siguiente === 'asignado') {
    reporte.fechaAsignacion = ahora;
  }

  if (siguiente === 'resuelto') {
    reporte.fechaResolucion = ahora;
  }

  if (siguiente === 'verificado') {
    reporte.fechaVerificacion = ahora;
  }

  if (siguiente === 'cerrado') {
    reporte.fechaCierre = ahora;
  }
};

module.exports = {
  ESTADOS_FINALES,
  estadosPermitidos,
  validarTransicionEstado,
  validarTransicionPorRol,
  asegurarHistorialBase,
  registrarCambioEstado
};