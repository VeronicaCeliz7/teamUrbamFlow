const mongoose = require('mongoose');

const ReporteSchema = new mongoose.Schema({
    // Relación con el usuario
    usuarioId: { type: String, required: true }, // clerkUserId
    usuarioEmail: { type: String, required: true },
    
    // Datos del reporte
    titulo: { type: String, required: true },
    columna_unica: { type: String, required: true }, // Esto es lo que usará la IA para categorizar
    
    // Ubicación
    direccion: { type: String, required: true },
    latitud: { type: Number, required: true },
    longitud: { type: Number, required: true },
    
    // Detalles adicionales
    observaciones: { type: String },
    
    // Archivo multimedia (URL de Cloudinary)
    archivo_url: { type: String },
    archivo_public_id: { type: String }, // Para eliminar/actualizar después
    archivo_tipo: { type: String, enum: ['image', 'video', null] }, // image/video
    
    // Categorización por IA (inicialmente null, luego se asigna)
    categoria_asignada_por_ia: { type: String, default: null },
    ia_procesado: { type: Boolean, default: false },
    
    // Estado del reporte
    estado: { type: String, enum: ['pendiente', 'en_proceso', 'resuelto', 'rechazado'], default: 'pendiente' },
    
    // Metadatos
    fecha_hora: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Índice para búsquedas por ubicación
ReporteSchema.index({ latitud: 1, longitud: 1 });
// Índice para búsquedas por usuario
ReporteSchema.index({ usuarioId: 1 });
// Índice para búsquedas por estado
ReporteSchema.index({ estado: 1 });

module.exports = mongoose.model('Reporte', ReporteSchema);