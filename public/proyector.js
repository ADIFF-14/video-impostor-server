const socket = io();
socket.emit('unirse', { nombre: 'proyector' });
let listaHermanos = [];

socket.on('listaInicialProyeccion', (jugadores) => {
    listaHermanos = jugadores;
});

socket.on('pantallaEstado', (estado) => {
    if (estado === 'JUEGO_INICIADO') {
        document.getElementById('overlay').style.display = 'none';
        document.getElementById('header').innerText = "ATENCIÓN";
        document.getElementById('main-val').innerText = "LEAN SU FRASE";
        document.getElementById('vote-grid').innerHTML = "";
    }
    if (estado === 'VOTACION_ABIERTA') {
        document.getElementById('header').innerText = "VOTACIÓN";
        document.getElementById('main-val').innerText = "VOTEN EN SU MÓVIL";
        renderGrid({});
    }
});

socket.on('turnoEnPantalla', (nombre) => {
    document.getElementById('overlay').style.display = 'none'; // Limpia el mensaje de "Inocente"
    document.getElementById('header').innerText = "TURNO DE:";
    document.getElementById('main-val').innerText = nombre;
    document.getElementById('vote-grid').innerHTML = ""; 
});

socket.on('actualizarVotosProyeccion', (votos) => renderGrid(votos));

socket.on('resultadoFinalProyeccion', (data) => {
    const o = document.getElementById('overlay');
    o.style.display = 'flex';
    document.getElementById('o-t').innerText = data.titulo;
    document.getElementById('o-t').style.color = data.color;
    document.getElementById('o-s').innerText = data.sub;
    document.getElementById('o-p').innerText = data.palabra ? "LA FRASE ERA: " + data.palabra : "";
    if (data.temporal) setTimeout(() => { o.style.display = 'none'; }, 8000);
});

function renderGrid(votos) {
    const grid = document.getElementById('vote-grid');
    grid.innerHTML = "";
    listaHermanos.forEach(j => {
        if (!j.eliminado) {
            const div = document.createElement('div');
            div.className = 'v-card';
            div.innerHTML = `<div style="font-size:2rem">${j.nombre}</div><div class="v-count">${votos[j.id] || 0}</div>`;
            grid.appendChild(div);
        }
    });
}



