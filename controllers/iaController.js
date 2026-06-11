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

const prioridadesPermitidas = [
    'baja',
    'media',
    'alta',
    'critica'
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

    if (
        textoNormalizado.includes('bache') ||
        textoNormalizado.includes('pozo') ||
        textoNormalizado.includes('calle rota') ||
        textoNormalizado.includes('calzada')
    ) {
        categoria = 'bache';
        prioridad = prioridad === 'alta' ? 'critica' : 'alta';
        riesgo = 'riesgo vial';
        accion_sugerida = 'Priorizar reparación vial y señalizar preventivamente la zona.';
        etiquetas.push('bache', 'seguridad-vial', 'calzada');
    }

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

    if (
        textoNormalizado.includes('semaforo') ||
        textoNormalizado.includes('semáforo')
    ) {
        categoria = 'semaforo';
        prioridad = 'critica';
        riesgo = 'riesgo vial alto';
        accion_sugerida = 'Intervenir de forma urgente por riesgo de siniestros viales.';
        etiquetas.push('semaforo', 'transito', 'urgente');
    }

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

    const etiquetasUnicas = [...new Set(etiquetas)];

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

    try {
        const prompt = `
Sos el motor de inteligencia urbana de UrbanFlow.

Tu tarea es clasificar incidentes urbanos reportados por ciudadanos.

Categorías permitidas:
${categoriasPermitidas.join(', ')}

Prioridades permitidas:
${prioridadesPermitidas.join(', ')}

Analizá el siguiente incidente:
"${texto}"

Respondé SOLO en JSON válido, sin markdown, sin explicación adicional.

Formato obligatorio:
{
  "categoria": "una_categoria_permitida",
  "prioridad": "una_prioridad_permitida",
  "resumen": "resumen claro y breve del incidente",
  "etiquetas": ["etiqueta1", "etiqueta2", "etiqueta3"],
  "riesgo": "riesgo operativo principal",
  "accion_sugerida": "acción recomendada para el gestor"
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

        let ia;

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
};

module.exports = {
    clasificarIncidente,
    reclasificarIncidentes,
    clasificarTextoUrbanFlow
};