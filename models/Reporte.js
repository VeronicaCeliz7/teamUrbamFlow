const mongoose = require('mongoose');

const HistorialEstadoSchema = new mongoose.Schema(
  {
    estado: {
      type: String,
      enum: ['pendiente', 'en_proceso', 'resuelto', 'rechazado'],
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
  localidad: { type: String },
  provincia: { type: String },
  pais: { type: String, default: 'Argentina' },

  // Detalles adicionales
  observaciones: { type: String },

  // Archivo multimedia original del ciudadano
  archivo_url: { type: String },
  archivo_public_id: { type: String },
  archivo_tipo: {
    type: String,
    enum: ['image', 'video', null],
    default: null
  },

  // Categorización por IA
  categoria_asignada_por_ia: { type: String, default: null },
  ia_procesado: { type: Boolean, default: false },

  prioridad: {
    type: String,
    enum: ['baja', 'media', 'alta', 'critica'],
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

vectorizado: {
  type: Boolean,
  default: false
},

vector_modelo: {
  type: String,
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
    enum: ['pendiente', 'en_proceso', 'resuelto', 'rechazado'],
    default: 'pendiente'
  },

  // Historial de estados para trazabilidad
  historialEstados: {
    type: [HistorialEstadoSchema],
    default: []
  },

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
ReporteSchema.index({ categoria_asignada_por_ia: 1 });
ReporteSchema.index({ esDemo: 1 });
ReporteSchema.index({ municipio: 1 });
ReporteSchema.index({ operadorAsignadoId: 1 });
ReporteSchema.index({ createdAt: -1 });
ReporteSchema.index({ vectorizado: 1 });
ReporteSchema.index({ embedding_dimensiones: 1 });

module.exports = mongoose.model('Reporte', ReporteSchema);