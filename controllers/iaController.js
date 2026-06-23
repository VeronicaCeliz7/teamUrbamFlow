const Reporte = require('../models/Reporte');

const categoriasPermitidas = [
  'bache',
  'alumbrado',
  'basura',
  'agua',
  'semaforo',
  'inseguridad',
  'vereda',
  'ruido',
  'animal_suelto',
  'microbasural',
  'otro'
];

const prioridadesPermitidas = ['baja', 'media', 'alta', 'critica'];

function normalizarTexto(texto = '') {
  return texto
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const rad = Math.PI / 180;

  const dLat = (Number(lat2) - Number(lat1)) * rad;
  const dLon = (Number(lon2) - Number(lon1)) * rad;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(Number(lat1) * rad) *
      Math.cos(Number(lat2) * rad) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function similitudTexto(a = '', b = '') {
  const palabrasA = new Set(normalizarTexto(a).split(' ').filter(Boolean));
  const palabrasB = new Set(normalizarTexto(b).split(' ').filter(Boolean));

  if (palabrasA.size === 0 || palabrasB.size === 0) return 0;

  const interseccion = [...palabrasA].filter((p) => palabrasB.has(p)).length;
  const union = new Set([...palabrasA, ...palabrasB]).size;

  return interseccion / union;
}

function clasificacionFallback(texto, motivo = 'fallback-local') {
  const t = normalizarTexto(texto);

  let categoria = 'otro';
  let prioridad = 'baja';
  let riesgo = 'requiere revisión operativa';
  let accion_sugerida = 'Revisar el incidente y derivarlo al área correspondiente.';
  let ai_priority_score = 25;
  const etiquetas = [];

  if (t.includes('agua') || t.includes('perdida') || t.includes('fuga') || t.includes('cano') || t.includes('caño')) {
    categoria = 'agua';
    prioridad = 'alta';
    riesgo = 'posible afectación del servicio o deterioro de calzada';
    accion_sugerida = 'Derivar al área de agua y saneamiento para inspección.';
    ai_priority_score = 75;
    etiquetas.push('agua', 'fuga', 'servicio-publico');
  }

  if (t.includes('bache') || t.includes('pozo') || t.includes('calle rota') || t.includes('calzada')) {
    categoria = 'bache';
    prioridad = 'alta';
    riesgo = 'riesgo vial';
    accion_sugerida = 'Priorizar reparación vial y señalización preventiva.';
    ai_priority_score = 80;
    etiquetas.push('bache', 'seguridad-vial', 'calzada');
  }

  if (t.includes('basura') || t.includes('residuos') || t.includes('olor') || t.includes('microbasural')) {
    categoria = t.includes('microbasural') ? 'microbasural' : 'basura';
    prioridad = 'media';
    riesgo = 'riesgo sanitario';
    accion_sugerida = 'Derivar a higiene urbana para retiro y control.';
    ai_priority_score = 55;
    etiquetas.push('basura', 'higiene-urbana', 'riesgo-sanitario');
  }

  if (t.includes('luz') || t.includes('alumbrado') || t.includes('lampara') || t.includes('luminaria')) {
    categoria = 'alumbrado';
    prioridad = 'media';
    riesgo = 'baja visibilidad y percepción de inseguridad';
    accion_sugerida = 'Derivar al área de alumbrado público.';
    ai_priority_score = 50;
    etiquetas.push('alumbrado', 'luminaria', 'seguridad');
  }

  if (t.includes('semaforo') || t.includes('semáforo')) {
    categoria = 'semaforo';
    prioridad = 'critica';
    riesgo = 'riesgo vial alto';
    accion_sugerida = 'Intervenir de forma urgente.';
    ai_priority_score = 95;
    etiquetas.push('semaforo', 'transito', 'urgente');
  }

  if (t.includes('escuela') || t.includes('hospital') || t.includes('avenida') || t.includes('ruta')) {
    if (prioridad === 'baja') prioridad = 'media';
    ai_priority_score = Math.max(ai_priority_score, 65);
    etiquetas.push('zona-sensible');
  }

  return {
    proveedor: motivo,
    modelo: 'fallback-local-urbanflow',
    categoria,
    prioridad,
    resumen: `Incidente clasificado como ${categoria} con prioridad ${prioridad}.`,
    etiquetas: [...new Set(etiquetas.length ? etiquetas : ['revision-manual'])],
    riesgo,
    accion_sugerida,
    ai_priority_score
  };
}

function normalizarRespuestaIA(ia, textoOriginal) {
  const categoria = categoriasPermitidas.includes(ia?.categoria) ? ia.categoria : 'otro';
  const prioridad = prioridadesPermitidas.includes(ia?.prioridad) ? ia.prioridad : 'baja';

  let score = Number(ia?.ai_priority_score);
  if (Number.isNaN(score)) score = prioridad === 'critica' ? 95 : prioridad === 'alta' ? 75 : prioridad === 'media' ? 50 : 25;
  score = Math.max(0, Math.min(100, score));

  return {
    proveedor: 'Gemini',
    modelo: process.env.GEMINI_MODEL || 'gemini-flash-latest',
    categoria,
    prioridad,
    resumen: ia?.resumen || `Incidente urbano: ${textoOriginal.slice(0, 120)}`,
    etiquetas: Array.isArray(ia?.etiquetas) ? ia.etiquetas.slice(0, 8) : [],
    riesgo: ia?.riesgo || 'No determinado',
    accion_sugerida: ia?.accion_sugerida || 'Revisión manual del incidente.',
    ai_priority_score: score
  };
}

async function llamarGemini(texto) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';

  if (!apiKey) {
    return clasificacionFallback(texto, 'fallback-sin-gemini-api-key');
  }

  const prompt = `
Sos el motor de inteligencia urbana de UrbanFlow.

Clasificá el siguiente incidente urbano reportado por un ciudadano.

Categorías permitidas:
${categoriasPermitidas.join(', ')}

Prioridades permitidas:
${prioridadesPermitidas.join(', ')}

Reglas:
- Todos los incidentes ingresan inicialmente como baja prioridad, pero podés elevarlos si hay riesgo real.
- Priorizá seguridad vial, escuelas, hospitales, semáforos, agua, riesgo sanitario e inseguridad.
- Respondé SOLO JSON válido. Sin markdown. Sin explicación externa.

Incidente:
"${texto}"

Formato obligatorio:
{
  "categoria": "una_categoria_permitida",
  "prioridad": "baja|media|alta|critica",
  "resumen": "resumen claro de máximo 160 caracteres",
  "etiquetas": ["etiqueta1", "etiqueta2", "etiqueta3"],
  "riesgo": "riesgo operativo principal",
  "accion_sugerida": "acción recomendada para el municipio",
  "ai_priority_score": 0
}
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 700
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', errorText);
    return clasificacionFallback(texto, 'fallback-error-gemini');
  }

  const data = await response.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!raw) {
    return clasificacionFallback(texto, 'fallback-respuesta-vacia-gemini');
  }

  try {
    const limpio = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const json = JSON.parse(limpio);
    return normalizarRespuestaIA(json, texto);
  } catch (error) {
    console.error('Gemini JSON inválido:', raw);
    return clasificacionFallback(texto, 'fallback-json-invalido-gemini');
  }
}

async function detectarDuplicadoReporte(reporte, iaResultado) {
  const radioMetros = Number(process.env.IA_DUPLICADO_RADIO_METROS || 20);

  if (!reporte?.latitud || !reporte?.longitud) {
    return {
      posible_duplicado: false,
      reporte_duplicado_id: null,
      duplicado_score: 0,
      duplicado_distancia_metros: null
    };
  }

  const margenLat = radioMetros / 111320;
  const margenLng = radioMetros / (111320 * Math.cos(Number(reporte.latitud) * Math.PI / 180));

  const candidatos = await Reporte.find({
    _id: { $ne: reporte._id },
    estado: {
      $in: [
        'reportado',
        'validacion_inicial',
        'aceptado',
        'asignado',
        'en_proceso',
        'pendiente'
      ]
    },
    latitud: {
      $gte: Number(reporte.latitud) - margenLat,
      $lte: Number(reporte.latitud) + margenLat
    },
    longitud: {
      $gte: Number(reporte.longitud) - margenLng,
      $lte: Number(reporte.longitud) + margenLng
    }
  })
    .sort({ createdAt: -1 })
    .limit(20);

  let mejor = null;

  for (const candidato of candidatos) {
    const distancia = calcularDistanciaMetros(
      reporte.latitud,
      reporte.longitud,
      candidato.latitud,
      candidato.longitud
    );

    if (distancia > radioMetros) continue;

    const textoNuevo = `${reporte.titulo} ${reporte.columna_unica}`;
    const textoCandidato = `${candidato.titulo} ${candidato.columna_unica}`;

    const scoreTexto = similitudTexto(textoNuevo, textoCandidato);
    const mismaCategoria =
      iaResultado?.categoria &&
      candidato.categoria_asignada_por_ia &&
      iaResultado.categoria === candidato.categoria_asignada_por_ia;

    const scoreFinal = Math.round(
      scoreTexto * 70 +
      (mismaCategoria ? 30 : 0)
    );

    if (!mejor || scoreFinal > mejor.duplicado_score) {
      mejor = {
        posible_duplicado: scoreFinal >= 35 || mismaCategoria,
        reporte_duplicado_id: candidato._id,
        duplicado_score: scoreFinal,
        duplicado_distancia_metros: Math.round(distancia)
      };
    }
  }

  if (!mejor || !mejor.posible_duplicado) {
    return {
      posible_duplicado: false,
      reporte_duplicado_id: null,
      duplicado_score: 0,
      duplicado_distancia_metros: null
    };
  }

  return mejor;
}

async function procesarIAReporte(reporte) {
  const texto = `${reporte.titulo}. ${reporte.columna_unica}. ${reporte.observaciones || ''}`;
  const ia = await llamarGemini(texto);
  const duplicado = await detectarDuplicadoReporte(reporte, ia);

  reporte.categoria_asignada_por_ia = ia.categoria;
    reporte.ia_procesado = true;

    reporte.proveedor_ia = ia.proveedor || 'desconocido';
    reporte.modelo_ia = ia.modelo || 'desconocido';

    reporte.prioridad = ia.prioridad;

    reporte.etiquetas = ia.etiquetas;

    reporte.ai_summary = ia.resumen;

    reporte.ai_priority_score = ia.ai_priority_score;

    reporte.posible_duplicado = duplicado.posible_duplicado;

    reporte.reporte_duplicado_id =
    duplicado.reporte_duplicado_id;

    reporte.duplicado_score =
    duplicado.duplicado_score || 0;

    reporte.duplicado_distancia_metros =
    duplicado.duplicado_distancia_metros || null;
  reporte.updatedAt = new Date();

  await reporte.save();

  return {
    ia,
    duplicado
  };
}

const clasificarIncidente = async (req, res) => {
  try {
    const { texto } = req.body;

    if (!texto || texto.trim().length < 5) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Debe enviar un texto válido para clasificar.'
      });
    }

    const ia = await llamarGemini(texto);

    return res.json({
      ok: true,
      proveedor: ia.proveedor,
      modelo: ia.modelo,
      input: { texto },
      ia
    });
  } catch (error) {
    console.error('Error en clasificarIncidente:', error);

    return res.status(200).json({
      ok: true,
      ...clasificacionFallback(req.body?.texto || '', 'fallback-error-controlado'),
      error_api: error.message
    });
  }
};

const detectarDuplicado = async (req, res) => {
  try {
    const { titulo, columna_unica, latitud, longitud, categoria } = req.body;

    const reporteTemporal = {
      _id: null,
      titulo: titulo || '',
      columna_unica: columna_unica || '',
      latitud,
      longitud
    };

    const resultado = await detectarDuplicadoReporte(reporteTemporal, {
      categoria: categoria || null
    });

    return res.json({
      ok: true,
      radio_metros: Number(process.env.IA_DUPLICADO_RADIO_METROS || 20),
      resultado
    });
  } catch (error) {
    console.error('Error en detectarDuplicado:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al detectar duplicados',
      error: error.message
    });
  }
};

module.exports = {
  clasificarIncidente,
  detectarDuplicado,
  procesarIAReporte
};