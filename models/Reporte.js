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
  'otros'
];

const PRIORIDADES_REPORTE = [
  'baja',
  'media',
  'alta',
  'critica'
];

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

  // Datos del reporte
  titulo: { type: String, required: true },
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

  // Categorización por IA / compatibilidad
  categoria_asignada_por_ia: { type: String, default: null },
  ia_procesado: { type: Boolean, default: false },

  prioridad: {
    type: String,
    enum: PRIORIDADES_REPORTE,
    default: 'media'
  },

  etiquetas: [{ type: String }],

  ai_summary: { type: String, default: null },
  ai_priority_score: { type: Number, default: null },

  posible_duplicado: { type: Boolean, default: false },
  reporte_duplicado_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reporte',
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

module.exports = mongoose.model('Reporte', ReporteSchema);