// src/repositories/reporteRepositoryContract.js

const METODOS_REQUERIDOS = [
  'crear',
  'buscarPorId',
  'listar',
  'listarPorUsuario',
  'guardar',
  'actualizarCategoriaIA',
  'eliminarPorId'
];

const validarContratoReporteRepository = (repository) => {
  if (!repository || typeof repository !== 'object') {
    throw new Error('El repositorio de reportes debe ser un objeto');
  }

  for (const metodo of METODOS_REQUERIDOS) {
    if (typeof repository[metodo] !== 'function') {
      throw new Error(
        `El repositorio de reportes no cumple el contrato: falta "${metodo}"`
      );
    }
  }

  return repository;
};

module.exports = {
  METODOS_REQUERIDOS,
  validarContratoReporteRepository
};