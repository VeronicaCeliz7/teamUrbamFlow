const mongoose = require('mongoose');

const ESTADOS_REPORTE = [
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

  // Compatibilidad con datos viejos
  'pendiente'
];

const CATEGORIAS_REPORTE = [
  'bache',
  'basura',
  'luminaria',
  'semaforo',
  'seguridad',
  'animal_suelto',
  'arbolado',
  'agua_cloaca',
  'transito',
  'vereda',
  'otros'
];

const PRIORIDADES_REPORTE = [
  'baja',
  'media',
  'alta',
  'critica'
];

// Mapa Adapter para unificar sinónimos históricos o entradas sucias sin romper el enum
const ALIAS_CATEGORIAS = {
  alumbrado: 'luminaria',
  iluminacion: 'luminaria',
  luz: 'luminaria',
  microbasural: 'basura',
  residuos: 'basura',
  agua: 'agua_cloaca',
  cloaca: 'agua_cloaca',
  cloacas: 'agua_cloaca',
  inseguridad: 'seguridad',
  arbol: 'arbolado',
  veredas: 'vereda'
};

const ETIQUETAS_CATEGORIA = {
  bache: 'Bache',
  basura: 'Basura',
  luminaria: 'Luminaria',
  semaforo: 'Semáforo',
  seguridad: 'Seguridad',
  animal_suelto: 'Animal suelto',
  arbolado: 'Arbolado',
  agua_cloaca: 'Agua y cloaca',
  transito: 'Tránsito',
  vereda: 'Vereda',
  otros: 'Otros'
};

function normalizarCategoria(valorRaw) {
  if (!valorRaw || typeof valorRaw !== 'string') {
    return { categoria: 'otros', detalleExtra: '' };
  }

  const limpia = valorRaw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

  if (CATEGORIAS_REPORTE.includes(limpia)) {
    return { categoria: limpia, detalleExtra: '' };
  }

  if (ALIAS_CATEGORIAS[limpia]) {
    return { categoria: ALIAS_CATEGORIAS[limpia], detalleExtra: '' };
  }

  // Si viene texto libre no catalogado, va a 'otros' y preserva el texto original en detalleExtra
  return { categoria: 'otros', detalleExtra: valorRaw.trim() };
}

const HistorialEstadoSchema = new mongoose.Schema(
  {
    estado: {
      type: String,
      enum: ESTADOS_REPORTE,
      required: true
    },
    fecha: {
      type: Date,
      default: Date.now
    },
    usuarioId: {
      type: String,
      default: null
    },
    usuarioNombre: {
      type: String,
      default: ''
    },
    observacion: {
      type: String,
      default: ''
    }
  },
  { _id: false }
);

const EvidenciaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: null },
    tipo: {
      type: String,
      enum: ['image', 'video', 'documento'],
      default: 'image'
    },
    descripcion: { type: String, default: '' },
    subidoPorId: { type: String, default: null },
    subidoPorNombre: { type: String, default: '' },
    fecha: { type: Date, default: Date.now }
  },
  { _id: false }
);

const ReporteSchema = new mongoose.Schema({
  // Relación con el usuario ciudadano que reporta
  usuarioId: { type: String, required: true },
  usuarioEmail: { type: String, required: true },

  // Relación demo / cliente
  clienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    default: null
  },
  clienteNombre: { type: String, default: null },

  // Territorio / municipio responsable
  municipio: { type: String, default: '' },
  localidad: { type: String, default: '' },
  provincia: { type: String, default: 'Córdoba' },
  pais: { type: String, default: 'Argentina' },

  // Operador asignado
  operadorAsignadoId: { type: String, default: null },
  operadorAsignadoNombre: { type: String, default: null },

  // Datos del reporte (titulo opcional en entrada: se autogenera si viene vacío)
  titulo: { type: String, default: '' },
  columna_unica: { type: String, required: true },

  // Ubicación
  direccion: { type: String, required: true },
  latitud: { type: Number, required: true },
  longitud: { type: Number, required: true },

  // Detalles adicionales
  observaciones: { type: String, default: '' },

  // Archivo multimedia original del ciudadano
  archivo_url: { type: String },
  archivo_public_id: { type: String },
  archivo_tipo: {
    type: String,
    enum: ['image', 'video', null],
    default: null
  },

  // Categoría operativa normalizada
  categoria: {
    type: String,
    enum: CATEGORIAS_REPORTE,
    default: 'otros'
  },

  // Texto libre del ciudadano cuando elige "otros" (no ensucia la dimensión analítica)
  categoria_detalle: {
    type: String,
    default: '',
    trim: true,
    maxlength: 120
  },

  // Categorización por IA / compatibilidad
  categoria_asignada_por_ia: { type: String, default: null },
  ia_procesado: { type: Boolean, default: false },

  prioridad: {
    type: String,
    enum: PRIORIDADES_REPORTE,
    default: 'media'
  },

  etiquetas: [{ type: String }],

  ai_summary: {
    type: String,
    default: ''
  },

  proveedor_ia: {
    type: String,
    default: ''
  },

  modelo_ia: {
    type: String,
    default: ''
  },

  ai_priority_score: {
    type: Number,
    default: 0
  },

  posible_duplicado: {
    type: Boolean,
    default: false
  },

  reporte_duplicado_id: {
    type: String,
    default: null
  },

  duplicado_score: {
    type: Number,
    default: 0
  },

  duplicado_distancia_metros: {
    type: Number,
    default: null
  },

  // Motor vectorial / embeddings
  vectorizado: {
    type: Boolean,
    default: false
  },

  vector_modelo: {
    type: String,
    default: null
  },

  embedding: {
    type: [Number],
    default: []
  },

  embedding_dimensiones: {
    type: Number,
    default: 0
  },

  embedding_actualizado_en: {
    type: Date,
    default: null
  },

  // Estado actual del reporte
  estado: {
    type: String,
    enum: ESTADOS_REPORTE,
    default: 'reportado'
  },

  // Historial de estados para trazabilidad
  historialEstados: {
    type: [HistorialEstadoSchema],
    default: []
  },

  // Evidencias de gestión / resolución cargadas por operador
  evidenciasResolucion: {
    type: [EvidenciaSchema],
    default: []
  },

  // Datos de cierre / verificación
  fechaAsignacion: { type: Date, default: null },
  fechaResolucion: { type: Date, default: null },
  fechaVerificacion: { type: Date, default: null },
  fechaCierre: { type: Date, default: null },

  verificadoPorId: { type: String, default: null },
  verificadoPorNombre: { type: String, default: null },

  motivoRechazo: { type: String, default: '' },
  motivoCierre: { type: String, default: '' },

  // Demo
  esDemo: { type: Boolean, default: false },

  // Metadatos
  fecha_hora: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Hook de gobierno del dato antes de validar/guardar
ReporteSchema.pre('validate', function () {
  const { categoria, detalleExtra } = normalizarCategoria(this.categoria);
  this.categoria = categoria;

  if (!this.categoria_detalle && detalleExtra) {
    this.categoria_detalle = detalleExtra;
  }

  // Autogenerar título limpio si el ciudadano no ingresó uno
  if (!this.titulo || !this.titulo.trim()) {
    const etiquetaCat = ETIQUETAS_CATEGORIA[this.categoria] || 'Incidente';
    const sufijoDetalle =
      this.categoria === 'otros' && this.categoria_detalle
        ? `: ${this.categoria_detalle}`
        : '';
    const refDireccion = this.direccion ? ` — ${this.direccion.trim()}` : '';
    this.titulo = `${etiquetaCat}${sufijoDetalle}${refDireccion}`;
  } else {
    this.titulo = this.titulo.trim();
  }

  this.updatedAt = new Date();
});

// Índices
ReporteSchema.index({ latitud: 1, longitud: 1 });
ReporteSchema.index({ usuarioId: 1 });
ReporteSchema.index({ estado: 1 });
ReporteSchema.index({ clienteId: 1 });
ReporteSchema.index({ prioridad: 1 });
ReporteSchema.index({ categoria: 1 });
ReporteSchema.index({ categoria_asignada_por_ia: 1 });
ReporteSchema.index({ esDemo: 1 });
ReporteSchema.index({ municipio: 1 });
ReporteSchema.index({ localidad: 1 });
ReporteSchema.index({ operadorAsignadoId: 1 });
ReporteSchema.index({ createdAt: -1 });
ReporteSchema.index({ vectorizado: 1 });
ReporteSchema.index({ embedding_dimensiones: 1 });

const Reporte = mongoose.model('Reporte', ReporteSchema);

module.exports = Reporte;
module.exports.ESTADOS_REPORTE = ESTADOS_REPORTE;
module.exports.CATEGORIAS_REPORTE = CATEGORIAS_REPORTE;
module.exports.PRIORIDADES_REPORTE = PRIORIDADES_REPORTE;
module.exports.ETIQUETAS_CATEGORIA = ETIQUETAS_CATEGORIA;
module.exports.normalizarCategoria = normalizarCategoria;