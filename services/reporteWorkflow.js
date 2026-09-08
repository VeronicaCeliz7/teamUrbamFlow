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


const estadosPermitidos = (estadoActual) => {
  return TRANSICIONES_VALIDAS[estadoActual] || [];
};


const validarTransicionEstado = (
  estadoActual,
  nuevoEstado
) => {

  return estadosPermitidos(estadoActual)
    .includes(nuevoEstado);
};


const validarTransicionPorRol = (
  rol,
  estadoActual,
  nuevoEstado
) => {

  const reglasRol =
    TRANSICIONES_POR_ROL[rol] || {};

  return (
    reglasRol[estadoActual] || []
  ).includes(nuevoEstado);
};


const asegurarHistorialBase = (reporte) => {

  if (!reporte.historialEstados) {
    reporte.historialEstados = [];
  }


  /*
   * Esto contempla reportes antiguos.
   * No inventamos su historia anterior.
   *
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
  observacion = ''
}) => {

  asegurarHistorialBase(reporte);


  const estadoAnterior =
    reporte.estado;

  const ahora =
    new Date();


  reporte.historialEstados.push({

    estado: nuevoEstado,

    fecha: ahora,

    usuarioId,

    usuarioNombre,

    observacion:
      observacion ||
      `Cambio de estado: ${estadoAnterior} -> ${nuevoEstado}`
  });


  reporte.estado =
    nuevoEstado;

  reporte.updatedAt =
    ahora;


  if (nuevoEstado === 'asignado') {
    reporte.fechaAsignacion = ahora;
  }

  if (nuevoEstado === 'resuelto') {
    reporte.fechaResolucion = ahora;
  }

  if (nuevoEstado === 'verificado') {
    reporte.fechaVerificacion = ahora;
  }

  if (nuevoEstado === 'cerrado') {
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