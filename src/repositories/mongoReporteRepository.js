// src/repositories/mongoReporteRepository.js
const Reporte = require('../../models/Reporte');

const normalizarTexto = (valor = '') =>
  String(valor)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_\s]+/g, '-');

const construirFiltroReportes = (query = {}) => {
  const {
    estado,
    categoria,
    prioridad,
    lat,
    lng,
    radio,
    municipio,
    localidad,
    operadorId,
    sinAsignar
  } = query;

  const filtro = {};

  if (estado) filtro.estado = estado;
  if (prioridad) filtro.prioridad = prioridad;

  if (categoria) {
    const categoriaRegex = new RegExp(
      categoria.toString().trim().replace(/[-_\s]+/g, '[-_\\s]*'),
      'i'
    );

    filtro.$or = [
      { categoria: categoriaRegex },
      { categoria_detalle: categoriaRegex },
      { categoria_asignada_por_ia: categoriaRegex },
      { etiquetas: categoriaRegex }
    ];
  }

  if (operadorId) filtro.operadorAsignadoId = operadorId;

  if (sinAsignar === 'true') {
    filtro.operadorAsignadoId = null;
  }

  const territorio = municipio || localidad;

  if (territorio) {
    const territorioNormalizado = normalizarTexto(territorio);
    const territorioRegex = new RegExp(
      territorioNormalizado.replace(/-/g, '[-_\\s]*'),
      'i'
    );

    const condicionesTerritorio = [
      { municipio: territorioRegex },
      { localidad: territorioRegex },
      { direccion: territorioRegex }
    ];

    if (territorioNormalizado === 'villa-maria') {
      condicionesTerritorio.push({
        latitud: { $gte: -32.45, $lte: -32.35 },
        longitud: { $gte: -63.32, $lte: -63.18 }
      });
    }

    if (filtro.$or) {
      filtro.$and = [
        { $or: filtro.$or },
        { $or: condicionesTerritorio }
      ];
      delete filtro.$or;
    } else {
      filtro.$or = condicionesTerritorio;
    }
  }

  if (lat && lng && radio) {
    filtro.latitud = { $exists: true, $ne: 0 };
    filtro.longitud = { $exists: true, $ne: 0 };
  }

  return filtro;
};

const crear = async (datos) => {
  const reporte = new Reporte(datos);
  return reporte.save();
};

const buscarPorId = async (id) => {
  return Reporte.findById(id);
};

const listar = async (query = {}) => {
  const filtro = construirFiltroReportes(query);
  return Reporte.find(filtro).sort({ createdAt: -1 });
};

const listarPorUsuario = async (usuarioId) => {
  return Reporte.find({ usuarioId }).sort({ createdAt: -1 });
};

const guardar = async (reporte) => {
  return reporte.save();
};

const actualizarCategoriaIA = async (id, payload) => {
  return Reporte.findByIdAndUpdate(id, payload, { new: true });
};

const eliminarPorId = async (id) => {
  return Reporte.findByIdAndDelete(id);
};

module.exports = {
  crear,
  buscarPorId,
  listar,
  listarPorUsuario,
  guardar,
  actualizarCategoriaIA,
  eliminarPorId
};