const clientesBase = [
    {
        nombre: 'Municipalidad de Villa María',
        tipo: 'municipio',
        localidad: 'Villa María',
        provincia: 'Córdoba',
        pais: 'Argentina',
        direccion: 'Centro, Villa María, Córdoba',
        latitud: -32.4075,
        longitud: -63.2402
    },
    {
        nombre: 'Municipalidad de San Francisco',
        tipo: 'municipio',
        localidad: 'San Francisco',
        provincia: 'Córdoba',
        pais: 'Argentina',
        direccion: 'Centro, San Francisco, Córdoba',
        latitud: -31.4276,
        longitud: -62.0820
    },
    {
        nombre: 'Municipalidad de Bell Ville',
        tipo: 'municipio',
        localidad: 'Bell Ville',
        provincia: 'Córdoba',
        pais: 'Argentina',
        direccion: 'Centro, Bell Ville, Córdoba',
        latitud: -32.6259,
        longitud: -62.6887
    },
    {
        nombre: 'Campus UNVM',
        tipo: 'universidad',
        localidad: 'Villa María',
        provincia: 'Córdoba',
        pais: 'Argentina',
        direccion: 'Campus Universidad Nacional de Villa María',
        latitud: -32.4324,
        longitud: -63.2476
    },
    {
        nombre: 'Barrio Privado La Negrita',
        tipo: 'barrio_privado',
        localidad: 'Villa María',
        provincia: 'Córdoba',
        pais: 'Argentina',
        direccion: 'La Negrita, Villa María, Córdoba',
        latitud: -32.3905,
        longitud: -63.2758
    }
];

const categorias = [
    'bache',
    'alumbrado',
    'basura',
    'agua',
    'semaforo',
    'inseguridad',
    'vereda',
    'ruido',
    'animal_suelto',
    'microbasural'
];

const estados = [
    'pendiente',
    'en_proceso',
    'resuelto',
    'rechazado'
];

const prioridades = [
    'baja',
    'media',
    'alta',
    'critica'
];

module.exports = {
    clientesBase,
    categorias,
    estados,
    prioridades
};