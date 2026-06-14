const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const Reporte = require('../models/Reporte');

function construirTextoEmbedding(reporte) {
  return [
    `Título: ${reporte.titulo || ''}`,
    `Descripción: ${reporte.columna_unica || ''}`,
    `Categoría: ${reporte.categoria_asignada_por_ia || 'sin_categoria'}`,
    `Municipio: ${reporte.municipio || ''}`,
    `Dirección: ${reporte.direccion || ''}`
  ].join('\n');
}

async function generarEmbeddingGemini(texto) {
  const apiKey = process.env.GEMINI_API_KEY;

  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        content: {
          parts: [
            {
              text: texto
            }
          ]
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();

  return data.embedding.values;
}

function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
  if (
    lat1 === undefined ||
    lon1 === undefined ||
    lat2 === undefined ||
    lon2 === undefined
  ) {
    return null;
  }

  const R = 6371000;
  const toRad = (value) => (Number(value) * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

async function evaluarAgrupacionIA(reporte) {
  const UMBRAL_AUTOMATICO = 0.95;
  const UMBRAL_AUTOMATICO_CERCANO = 0.85;
  const DISTANCIA_MAXIMA_AGRUPACION = 80;
  const UMBRAL_SUGERIDO = 0.80;

  if (!reporte.embedding?.length) {
    return {
      decision: 'sin_embedding',
      mensaje: 'El reporte no tiene embedding para comparar.'
    };
  }

  const candidatos = await Reporte.find({
    _id: { $ne: reporte._id },
    vectorizado: true,
    embedding: { $exists: true, $ne: [] },
    municipio: reporte.municipio,
    estado: { $nin: ['resuelto', 'cerrado', 'rechazado'] }
  }).limit(500);

  let mejor = null;

  for (const candidato of candidatos) {
    const mismaCategoria =
      candidato.categoria_asignada_por_ia === reporte.categoria_asignada_por_ia ||
      candidato.prioridad === reporte.prioridad;

    if (!mismaCategoria) continue;

    const similitud = cosineSimilarity(reporte.embedding, candidato.embedding);

    const distanciaMetros = calcularDistanciaMetros(
      reporte.latitud,
      reporte.longitud,
      candidato.latitud,
      candidato.longitud
    );

    if (!mejor || similitud > mejor.similitud) {
      mejor = {
        reporte: candidato,
        similitud,
        distanciaMetros
      };
    }
  }

  if (!mejor || mejor.similitud < UMBRAL_SUGERIDO) {
    reporte.esIncidentePrincipal = true;
    reporte.incidenteGrupoId = null;
    reporte.posible_duplicado = false;
    reporte.reporte_duplicado_id = null;
    reporte.duplicado_sugerido_id = null;
    reporte.duplicado_score = mejor
      ? Number(mejor.similitud.toFixed(4))
      : null;
    reporte.duplicado_estado = 'ninguno';

    return {
      decision: 'ninguno',
      similitud: mejor
        ? Number(mejor.similitud.toFixed(4))
        : null,
      porcentaje: mejor
        ? Math.round(mejor.similitud * 100)
        : null
    };
  }

  const principal = mejor.reporte.esIncidentePrincipal
    ? mejor.reporte
    : await Reporte.findById(
        mejor.reporte.incidenteGrupoId ||
        mejor.reporte.reporte_duplicado_id
      );

  if (!principal) {
    return {
      decision: 'sin_principal',
      mensaje: 'Se encontró similar, pero no se pudo resolver incidente principal.'
    };
  }

  const score = Number(mejor.similitud.toFixed(4));
  const porcentaje = Math.round(mejor.similitud * 100);

  const agrupacionCercana =
    mejor.similitud >= UMBRAL_AUTOMATICO_CERCANO &&
    mejor.distanciaMetros !== null &&
    mejor.distanciaMetros <= DISTANCIA_MAXIMA_AGRUPACION;

  reporte.duplicado_score = score;
  reporte.duplicado_sugerido_id = principal._id;

  if (mejor.similitud >= UMBRAL_AUTOMATICO || agrupacionCercana) {
    reporte.incidenteGrupoId = principal._id;
    reporte.esIncidentePrincipal = false;
    reporte.posible_duplicado = true;
    reporte.reporte_duplicado_id = principal._id;
    reporte.duplicado_estado = 'automatico';

    if (!principal.reportesRelacionados) {
      principal.reportesRelacionados = [];
    }

    const yaRelacionado = principal.reportesRelacionados.some(
      (item) => item.toString() === reporte._id.toString()
    );

    if (!yaRelacionado) {
      principal.reportesRelacionados.push(reporte._id);
    }

    principal.esIncidentePrincipal = true;
    principal.updatedAt = new Date();

    await principal.save();

    return {
      decision: 'automatico',
      criterio: agrupacionCercana
        ? 'cercania_semantica'
        : 'alta_similitud',
      principalId: principal._id,
      principalTitulo: principal.titulo,
      similitud: score,
      porcentaje,
      distanciaMetros: mejor.distanciaMetros
    };
  }

  reporte.posible_duplicado = true;
  reporte.duplicado_estado = 'sugerido';
  reporte.incidenteGrupoId = null;
  reporte.esIncidentePrincipal = true;
  reporte.reporte_duplicado_id = null;

  return {
    decision: 'sugerido',
    principalSugeridoId: principal._id,
    principalTitulo: principal.titulo,
    similitud: score,
    porcentaje,
    distanciaMetros: mejor.distanciaMetros
  };
}


const vectorizarReporte = async (req, res) => {
  try {
    const { reporteId } = req.body;

    const reporte = await Reporte.findById(reporteId);

    if (!reporte) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Reporte no encontrado'
      });
    }

    const texto = construirTextoEmbedding(reporte);

    const embedding = await generarEmbeddingGemini(texto);

    reporte.embedding = embedding;
    reporte.vectorizado = true;
    reporte.vector_modelo = 'gemini-embedding-001';
    reporte.embedding_dimensiones = embedding.length;
    reporte.embedding_actualizado_en = new Date();

const agrupacionIA = await evaluarAgrupacionIA(reporte);

await reporte.save();

return res.json({
  ok: true,
  reporteId: reporte._id,
  vectorizado: true,
  embedding_dimensiones: embedding.length,
  agrupacionIA
});
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
};

const vectorizarPendientes = async (req, res) => {
  try {
    const limite = Number(req.body?.limite || 5);

   const pendientes = await Reporte.find({
  $or: [
    { vectorizado: false },
    { vectorizado: { $exists: false } },
    { embedding: { $exists: false } },
    { embedding: { $size: 0 } }
  ]
})
  .sort({ createdAt: -1 })
  .limit(limite);

    const resultados = [];

    for (const reporte of pendientes) {
      try {
        const texto = construirTextoEmbedding(reporte);

        const embedding = await generarEmbeddingGemini(texto);

        reporte.embedding = embedding;
        reporte.vectorizado = true;
        reporte.vector_modelo = 'gemini-embedding-001';
        reporte.embedding_dimensiones = embedding.length;
        reporte.embedding_actualizado_en = new Date();

const agrupacionIA = await evaluarAgrupacionIA(reporte);

await reporte.save();

resultados.push({
  id: reporte._id,
  titulo: reporte.titulo,
  dimensiones: embedding.length,
  agrupacionIA
});
      } catch (e) {
        console.error(e);
      }
    }

    return res.json({
      ok: true,
      procesados: resultados.length,
      resultados
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
};

const buscarSimilares = async (req, res) => {
  try {
    const { texto, limite = 5, umbral = 0.65 } = req.body;

    if (!texto || texto.trim().length < 3) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Debe enviar un texto de búsqueda semántica'
      });
    }

    const embeddingConsulta = await generarEmbeddingGemini(texto);

    const reportes = await Reporte.find({
      vectorizado: true,
      embedding: { $exists: true, $ne: [] }
    }).limit(500);

    const resultados = reportes
      .map((reporte) => {
        const similitud = cosineSimilarity(embeddingConsulta, reporte.embedding);

        return {
          id: reporte._id,
          titulo: reporte.titulo,
          categoria: reporte.categoria_asignada_por_ia,
          prioridad: reporte.prioridad,
          direccion: reporte.direccion,
          latitud: reporte.latitud,
          longitud: reporte.longitud,
          similitud: Number(similitud.toFixed(4)),
          porcentaje: Math.round(similitud * 100)
        };
      })
      .filter((r) => r.similitud >= Number(umbral))
      .sort((a, b) => b.similitud - a.similitud)
      .slice(0, Number(limite));

    return res.json({
      ok: true,
      consulta: texto,
      umbral: Number(umbral),
      total: resultados.length,
      resultados
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
};

const heatmapData = async (req, res) => {
  try {
    const { categoria, municipio, soloVectorizados } = req.query;

    const filtro = {
      latitud: { $exists: true, $ne: null },
      longitud: { $exists: true, $ne: null }
    };

    if (categoria) {
      filtro.categoria_asignada_por_ia = categoria;
    }

    if (municipio) {
      filtro.municipio = municipio;
    }

    if (soloVectorizados === 'true') {
      filtro.vectorizado = true;
    }

    const reportes = await Reporte.find(filtro)
      .select(
  'titulo columna_unica categoria_asignada_por_ia prioridad estado municipio direccion latitud longitud ai_priority_score posible_duplicado vectorizado embedding_dimensiones fecha_hora createdAt incidenteGrupoId esIncidentePrincipal reportesRelacionados duplicado_sugerido_id duplicado_score duplicado_estado reporte_duplicado_id'
)
      .sort({ createdAt: -1 })
      .limit(2000);

    const puntos = reportes.map((r) => {
      const score = Number(r.ai_priority_score || 25);

      return {
  id: r._id,
  titulo: r.titulo,
  descripcion: r.columna_unica,
  categoria: r.categoria_asignada_por_ia || 'sin_categoria',
  prioridad: r.prioridad || 'media',
  estado: r.estado,
  municipio: r.municipio || 'sin_municipio',
  direccion: r.direccion,
  latitud: r.latitud,
  longitud: r.longitud,
  intensidad: Math.max(1, Math.min(100, score)),
  posible_duplicado: Boolean(r.posible_duplicado),
  vectorizado: Boolean(r.vectorizado),
  embedding_dimensiones: r.embedding_dimensiones || 0,
  fecha_hora: r.fecha_hora,
  createdAt: r.createdAt,

  duplicado_estado: r.duplicado_estado || 'ninguno',
  duplicado_score: r.duplicado_score || null,
  duplicado_sugerido_id: r.duplicado_sugerido_id || null,
  incidenteGrupoId: r.incidenteGrupoId || null,
  esIncidentePrincipal: r.esIncidentePrincipal,
  reportesRelacionadosCount: Array.isArray(r.reportesRelacionados)
    ? r.reportesRelacionados.length
    : 0,
  reporte_duplicado_id: r.reporte_duplicado_id || null
};
    });

    const resumenPorCategoria = puntos.reduce((acc, p) => {
      acc[p.categoria] = (acc[p.categoria] || 0) + 1;
      return acc;
    }, {});

    const resumenPorPrioridad = puntos.reduce((acc, p) => {
      acc[p.prioridad] = (acc[p.prioridad] || 0) + 1;
      return acc;
    }, {});

    const vectorizados = puntos.filter((p) => p.vectorizado).length;

    return res.json({
      ok: true,
      total: puntos.length,
      vectorizados,
      filtros: {
        categoria: categoria || null,
        municipio: municipio || null,
        soloVectorizados: soloVectorizados === 'true'
      },
      resumen: {
        categorias: resumenPorCategoria,
        prioridades: resumenPorPrioridad
      },
      puntos
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
};

module.exports = {
  vectorizarReporte,
  vectorizarPendientes,
  buscarSimilares,
  heatmapData,
  cosineSimilarity,
  generarEmbeddingGemini,
  evaluarAgrupacionIA
};