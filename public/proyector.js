const socket = io();
socket.emit('unirse', { nombre: 'proyector' });
let listaHermanos = [];

socket.on('listaInicialProyeccion', (jugadores) => {
    listaHermanos = jugadores;
    renderGrid({});
});

socket.on('pantallaEstado', (estado) => {
    if (estado === 'JUEGO_INICIADO') {
        document.getElementById('overlay').style.display = 'none';
        document.getElementById('turno-header').innerText = "ATENCION";
        document.getElementById('main-val').innerText = "LEAN SU FRASE";
        document.getElementById('vote-grid').innerHTML = "";
    }
    if (estado === 'VOTACION_ABIERTA') {
        document.getElementById('turno-header').innerText = "SISTEMA DE";
        document.getElementById('main-val').innerText = "VOTACIÓN";
        renderGrid({});
    }
});

socket.on('turnoEnPantalla', (nombre) => {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('turno-header').innerText = "HABLANDO:";
    document.getElementById('main-val').innerText = nombre;
});

socket.on('actualizarVotosProyeccion', (votos) => renderGrid(votos));

socket.on('resultadoFinalProyeccion', (data) => {
    const o = document.getElementById('overlay');
    o.style.display = 'flex';
    document.getElementById('o-titulo').innerText = data.titulo;
    document.getElementById('o-titulo').style.color = data.color;
    document.getElementById('o-sub').innerText = data.sub;
    document.getElementById('o-palabra').innerText = data.palabra ? "LA FRASE ERA: " + data.palabra : "";
    if (data.temporal) setTimeout(() => { o.style.display = 'none'; }, 8000);
});

function renderGrid(votos) {
    const grid = document.getElementById('vote-grid');
    grid.innerHTML = "";
    listaHermanos.forEach(j => {
        if (!j.eliminado) {
            const div = document.createElement('div');
            div.className = 'v-card';
            div.innerHTML = `<div class="v-name">${j.nombre}</div><div class="v-count">${votos[j.id] || 0}</div>`;
            grid.appendChild(div);
        }
    });
}
