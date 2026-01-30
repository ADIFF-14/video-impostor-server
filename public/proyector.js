const socket = io();
socket.emit('unirse', { nombre: 'proyector' });
let listaHermanos = [];

socket.on('listaInicialProyeccion', (jugadores) => { listaHermanos = jugadores; render(jugadores, {}); });

socket.on('pantallaEstado', (estado) => {
    if (estado === 'JUEGO_INICIADO') {
        document.getElementById('overlay').style.display = 'none';
        document.getElementById('header').innerText = "ATENCIÓN";
        document.getElementById('main-info').innerText = "LEAN SU FRASE";
    }
    if (estado === 'VOTACION_ABIERTA') {
        document.getElementById('header').innerText = "SISTEMA DE VOTACIÓN";
        document.querySelectorAll('.v-count').forEach(e => e.style.display = 'block');
    }
});

socket.on('turnoEnPantalla', (nombre) => {
    // ESTO QUITA EL MENSAJE DE "INOCENTE" AUTOMÁTICAMENTE
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('header').innerText = "HABLANDO:";
    document.getElementById('main-info').innerText = nombre;
});

socket.on('actualizarVotosProyeccion', (votos) => {
    for(let id in votos) {
        const el = document.getElementById('v-'+id);
        if(el) el.innerText = votos[id];
    }
});

socket.on('resultadoFinalProyeccion', (data) => {
    const o = document.getElementById('overlay');
    o.style.display = 'flex';
    document.getElementById('o-t').innerText = data.titulo;
    document.getElementById('o-t').style.color = data.color;
    document.getElementById('o-s').innerText = data.sub;
    document.getElementById('o-p').innerText = data.palabra ? "FRRASE: " + data.palabra : "";
    // Si es temporal (Inocente ronda 1), se quita solo en 8s por si acaso, 
    // aunque 'turnoEnPantalla' también lo quita.
    if(data.temporal) setTimeout(()=> { o.style.display='none'; }, 8000);
});

function render(jugadores, votos) {
    const g = document.getElementById('grid');
    g.innerHTML = "";
    jugadores.forEach(j => {
        const d = document.createElement('div');
        d.className = 'card' + (j.eliminado ? ' eliminated' : '');
        d.innerHTML = `<div style="font-size:2rem">${j.nombre}</div><div class="v-count" id="v-${j.id}">${votos[j.id]||0}</div>`;
        g.appendChild(d);
    });
}



