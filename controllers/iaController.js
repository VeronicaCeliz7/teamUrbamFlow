const OpenAI = require('openai');
const Reporte = require('../models/Reporte');

const deepseek = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com'
});

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

function normalizarTexto(texto) {
    return String(texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function scorePrioridad(prioridad) {
    if (prioridad === 'critica') return 95;
    if (prioridad === 'alta') return 78;
    if (prioridad === 'media') return 55;
    if (prioridad === 'baja') return 30;
    return 25;
}

function clasificacionFallback(texto, motivo = 'fallback-demo') {
    const textoNormalizado = normalizarTexto(texto);

    let categoria = 'otro';
    let prioridad = 'media';
    let riesgo = 'operativo';
    let accion_sugerida = 'Revisar el incidente y derivarlo al área correspondiente.';
    const etiquetas = [];

    if (
        textoNormalizado.includes('agua') ||
        textoNormalizado.includes('perdida') ||
        textoNormalizado.includes('pérdida') ||
        textoNormalizado.includes('fuga') ||
        textoNormalizado.includes('caño') ||
        textoNormalizado.includes('cano')
    ) {
        categoria = 'agua';
        prioridad = 'alta';
        riesgo = 'deterioro de calzada o afectación del servicio';
        accion_sugerida = 'Derivar al área de agua y saneamiento para inspección urgente.';
        etiquetas.push('agua', 'fuga', 'servicio-publico');
    }

  const dLat = (Number(lat2) - Number(lat1)) * rad;
  const dLon = (Number(lon2) - Number(lon1)) * rad;

    if (
        textoNormalizado.includes('basura') ||
        textoNormalizado.includes('residuos') ||
        textoNormalizado.includes('olor') ||
        textoNormalizado.includes('basural') ||
        textoNormalizado.includes('microbasural') ||
        textoNormalizado.includes('contenedor')
    ) {
        categoria = textoNormalizado.includes('microbasural') || textoNormalizado.includes('basural')
            ? 'microbasural'
            : 'basura';
        prioridad = prioridad === 'critica' ? 'critica' : 'media';
        riesgo = 'riesgo sanitario';
        accion_sugerida = 'Derivar a higiene urbana para retiro y control del foco.';
        etiquetas.push('basura', 'higiene-urbana', 'riesgo-sanitario');
    }

    if (
        textoNormalizado.includes('luz') ||
        textoNormalizado.includes('alumbrado') ||
        textoNormalizado.includes('lampara') ||
        textoNormalizado.includes('lámpara') ||
        textoNormalizado.includes('luminaria') ||
        textoNormalizado.includes('farola')
    ) {
        categoria = 'alumbrado';
        prioridad = prioridad === 'critica' ? 'critica' : 'media';
        riesgo = 'baja visibilidad y percepción de inseguridad';
        accion_sugerida = 'Derivar al área de alumbrado público para revisión técnica.';
        etiquetas.push('alumbrado', 'luminaria', 'seguridad');
    }

function similitudTexto(a = '', b = '') {
  const palabrasA = new Set(normalizarTexto(a).split(' ').filter(Boolean));
  const palabrasB = new Set(normalizarTexto(b).split(' ').filter(Boolean));

    if (
        textoNormalizado.includes('perro') ||
        textoNormalizado.includes('animal') ||
        textoNormalizado.includes('caballo')
    ) {
        categoria = 'animal_suelto';
        prioridad = prioridad === 'media' ? 'alta' : prioridad;
        riesgo = 'riesgo para peatones, ciclistas y tránsito';
        accion_sugerida = 'Derivar a zoonosis o control animal.';
        etiquetas.push('animal-suelto', 'seguridad');
    }

    if (
        textoNormalizado.includes('ruido') ||
        textoNormalizado.includes('musica') ||
        textoNormalizado.includes('música') ||
        textoNormalizado.includes('sonora')
    ) {
        categoria = 'ruido';
        prioridad = 'media';
        riesgo = 'afectación de convivencia urbana';
        accion_sugerida = 'Derivar al área de inspección o convivencia ciudadana.';
        etiquetas.push('ruido', 'convivencia');
    }

    if (
        textoNormalizado.includes('vereda') ||
        textoNormalizado.includes('baldosa') ||
        textoNormalizado.includes('peatonal')
    ) {
        categoria = 'vereda';
        prioridad = prioridad === 'media' ? 'alta' : prioridad;
        riesgo = 'riesgo de caída peatonal';
        accion_sugerida = 'Derivar al área de obras públicas.';
        etiquetas.push('vereda', 'peatonal');
    }

    if (
        textoNormalizado.includes('inseguridad') ||
        textoNormalizado.includes('sospechoso') ||
        textoNormalizado.includes('visibilidad')
    ) {
        categoria = 'inseguridad';
        prioridad = prioridad === 'media' ? 'alta' : prioridad;
        riesgo = 'percepción de inseguridad o riesgo ciudadano';
        accion_sugerida = 'Derivar al área de seguridad ciudadana.';
        etiquetas.push('seguridad', 'prevencion');
    }

    if (
        textoNormalizado.includes('escuela') ||
        textoNormalizado.includes('hospital') ||
        textoNormalizado.includes('avenida') ||
        textoNormalizado.includes('ruta')
    ) {
        prioridad = prioridad === 'media' ? 'alta' : prioridad;
        etiquetas.push('zona-sensible');
    }

  const interseccion = [...palabrasA].filter((p) => palabrasB.has(p)).length;
  const union = new Set([...palabrasA, ...palabrasB]).size;

    return {
        ok: true,
        proveedor: motivo,
        modelo: 'fallback-local-urbanflow',
        input: { texto },
        ia: {
            categoria,
            prioridad,
            resumen: `Incidente clasificado como ${categoria} con prioridad ${prioridad}.`,
            etiquetas: etiquetasUnicas.length > 0 ? etiquetasUnicas : ['revision-manual'],
            riesgo,
            accion_sugerida,
            ai_priority_score: scorePrioridad(prioridad)
        }
    };
}

function normalizarRespuestaIA(ia) {
    const categoria = categoriasPermitidas.includes(ia.categoria)
        ? ia.categoria
        : 'otro';

    const prioridad = prioridadesPermitidas.includes(ia.prioridad)
        ? ia.prioridad
        : 'media';

    return {
        categoria,
        prioridad,
        resumen: ia.resumen || `Incidente clasificado como ${categoria}.`,
        etiquetas: Array.isArray(ia.etiquetas) ? ia.etiquetas : [],
        riesgo: ia.riesgo || 'No determinado',
        accion_sugerida: ia.accion_sugerida || 'Revisión manual del incidente.',
        ai_priority_score: scorePrioridad(prioridad)
    };
}

async function clasificarTextoUrbanFlow(texto) {
    if (!process.env.DEEPSEEK_API_KEY) {
        return clasificacionFallback(texto, 'fallback-demo-sin-api-key');
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

        const completion = await deepseek.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'system',
                    content: 'Respondés siempre JSON válido para sistemas backend. No uses markdown.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.2,
            max_tokens: 500
        });

        const rawContent = completion.choices?.[0]?.message?.content;

        if (!rawContent) {
            return clasificacionFallback(texto, 'fallback-demo-respuesta-vacia');
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

        try {
            ia = JSON.parse(rawContent);
        } catch {
            return clasificacionFallback(texto, 'fallback-demo-json-invalido');
        }

        return {
            ok: true,
            proveedor: 'DeepSeek',
            modelo: 'deepseek-chat',
            input: { texto },
            ia: normalizarRespuestaIA(ia)
        };
    } catch (error) {
        return {
            ...clasificacionFallback(texto, 'fallback-demo-error-api'),
            error_api: error.message
        };
    }
}

const clasificarIncidente = async (req, res) => {
    const { texto } = req.body;

    if (!texto || texto.trim().length < 5) {
        return res.status(400).json({
            ok: false,
            mensaje: 'Debe enviar un texto válido para clasificar.'
        });
    }

    const resultado = await clasificarTextoUrbanFlow(texto);
    return res.json(resultado);
};

const reclasificarIncidentes = async (req, res) => {
    try {
        const limite = Number(req.body?.limite || 100);

        const reportes = await Reporte.find({
            $or: [
                { categoria_asignada_por_ia: { $exists: false } },
                { categoria_asignada_por_ia: null },
                { categoria_asignada_por_ia: '' },
                { categoria_asignada_por_ia: 'sin_categoria' },
                { categoria_asignada_por_ia: 'Sin Categoría' }
            ]
        })
            .sort({ createdAt: -1 })
            .limit(limite);

        const resultados = [];
        const errores = [];

        for (const reporte of reportes) {
            try {
                const texto = [
                    `Título: ${reporte.titulo || ''}`,
                    `Descripción: ${reporte.columna_unica || ''}`,
                    `Dirección: ${reporte.direccion || ''}`,
                    `Municipio: ${reporte.municipio || ''}`
                ].join('\n');

                const resultadoIA = await clasificarTextoUrbanFlow(texto);
                const ia = resultadoIA.ia;

                reporte.categoria_asignada_por_ia = ia.categoria;
                reporte.prioridad = ia.prioridad;
                reporte.etiquetas = ia.etiquetas || [];
                reporte.ai_summary = ia.resumen;
                reporte.ai_priority_score = ia.ai_priority_score || scorePrioridad(ia.prioridad);
                reporte.ia_procesado = true;
                reporte.proveedor_ia = resultadoIA.proveedor || 'fallback-local';
                reporte.modelo_ia = resultadoIA.modelo || 'fallback-local-urbanflow';

                // Como cambia la clasificación, invalidamos embedding para regenerarlo actualizado
                reporte.vectorizado = false;
                reporte.vector_modelo = null;
                reporte.embedding = [];
                reporte.embedding_dimensiones = 0;
                reporte.embedding_actualizado_en = null;

                await reporte.save();

                resultados.push({
                    id: reporte._id,
                    titulo: reporte.titulo,
                    categoria: reporte.categoria_asignada_por_ia,
                    prioridad: reporte.prioridad,
                    score: reporte.ai_priority_score,
                    vectorizado: reporte.vectorizado
                });
            } catch (error) {
                errores.push({
                    id: reporte._id,
                    titulo: reporte.titulo,
                    error: error.message
                });
            }
        }

        return res.json({
            ok: true,
            encontrados: reportes.length,
            procesados: resultados.length,
            errores: errores.length,
            mensaje: 'Reclasificación finalizada. Ejecutar luego /api/ia/vectorizar-pendientes para regenerar embeddings actualizados.',
            resultados,
            errores_detalle: errores
        });
    } catch (error) {
        console.error('Error reclasificando incidentes:', error);

        return res.status(500).json({
            ok: false,
            mensaje: 'Error al reclasificar incidentes',
            error: error.message
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
    reclasificarIncidentes,
    clasificarTextoUrbanFlow
};