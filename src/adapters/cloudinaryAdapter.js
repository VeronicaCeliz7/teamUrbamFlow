// src/adapters/cloudinaryAdapter.js
const cloudinary = require('../../config/cloudinary');

const resolverResourceType = (tipo) => {
  return tipo === 'video' ? 'video' : 'image';
};

const obtenerUrlArchivo = (publicId, tipo = 'image', opciones = {}) => {
  if (!publicId || typeof publicId !== 'string') return null;

  return cloudinary.url(publicId.trim(), {
    resource_type: resolverResourceType(tipo),
    secure: true,
    ...opciones,
  });
};

const eliminarArchivo = async (publicId, tipo = 'image') => {
  if (!publicId || typeof publicId !== 'string') {
    return { eliminado: false, motivo: 'sin_public_id' };
  }

  const resourceType = resolverResourceType(tipo);

  try {
    const resultado = await cloudinary.uploader.destroy(publicId.trim(), {
      resource_type: resourceType,
    });

    return {
      eliminado: resultado?.result === 'ok' || resultado?.result === 'not found',
      resourceType,
      detalle: resultado,
    };
  } catch (error) {
    console.error(`Error al eliminar archivo (${resourceType}) en Cloudinary:`, error);
    return {
      eliminado: false,
      resourceType,
      error,
    };
  }
};

module.exports = {
  obtenerUrlArchivo,
  eliminarArchivo,
};