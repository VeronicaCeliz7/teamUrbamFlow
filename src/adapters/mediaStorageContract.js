// src/adapters/mediaStorageContract.js

const METODOS_REQUERIDOS = ['obtenerUrlArchivo', 'eliminarArchivo'];

const validarContratoMediaStorage = (adapter) => {
  if (!adapter || typeof adapter !== 'object') {
    throw new Error('El adapter de almacenamiento multimedia debe ser un objeto');
  }

  for (const metodo of METODOS_REQUERIDOS) {
    if (typeof adapter[metodo] !== 'function') {
      throw new Error(
        `El adapter de almacenamiento multimedia no cumple el contrato: falta "${metodo}"`
      );
    }
  }

  return adapter;
};

module.exports = {
  METODOS_REQUERIDOS,
  validarContratoMediaStorage,
};