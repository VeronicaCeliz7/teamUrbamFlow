const mongoose = require('mongoose');

const ClienteSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    tipo: {
        type: String,
        enum: ['municipio', 'universidad', 'barrio_privado', 'empresa', 'otro'],
        required: true
    },

    localidad: { type: String, required: true },
    provincia: { type: String, required: true },
    pais: { type: String, default: 'Argentina' },

    direccion: { type: String },
    latitud: { type: Number, required: true },
    longitud: { type: Number, required: true },

    activo: { type: Boolean, default: true },
    esDemo: { type: Boolean, default: false },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

ClienteSchema.index({ tipo: 1 });
ClienteSchema.index({ localidad: 1 });
ClienteSchema.index({ esDemo: 1 });
ClienteSchema.index({ latitud: 1, longitud: 1 });

module.exports = mongoose.model('Cliente', ClienteSchema);