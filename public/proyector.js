const socket = io();
socket.emit('unirse', { nombre: 'proyector' });

socket.on('listaInicialProyeccion', (jugadores) => {
    updateGrid(jugadores);
});

socket.on('pantallaEstado', (estado) => {
    const status = document.getElementById('status-top');
    const main = document.getElementById('main-name');
    const over = document.getElementById('overlay-result');

    if (estado === 'JUEGO_INICIADO') {
        over.style.display = 'none';
        status.innerText = "ATENCIÓN";
        main.innerText = "LEAN SU FRASE";
        main.style.color = "#00e676";
    }
    if (estado === 'VOTACION_ABIERTA') {
        status.innerText = "MOMENTO DE";
        main.innerText = "VOTAR";
        main.style.color = "#ff9800";
    }
});

socket.on('cambioDeTurno', (data) => {
    document.getElementById('overlay-result').style.display = 'none';
    document.getElementById('status-top').innerText = "HABLANDO:";
    document.getElementById('main-name').innerText = data.nombre;
    document.getElementById('main-name').style.color = "#00e676";
    updateGrid(data.lista, data.idSocket);
});

socket.on('resultadoFinalProyeccion', (data) => {
    const over = document.getElementById('overlay-result');
    over.style.display = 'flex';
    document.getElementById('over-titulo').innerText = data.titulo;
    document.getElementById('over-titulo').style.color = data.temporal ? "#ff4444" : "#00e676";
    document.getElementById('over-sub').innerText = data.sub;
    document.getElementById('over-palabra').innerText = data.palabra ? "FRASE: " + data.palabra : "";

    if (data.temporal) {
        setTimeout(() => { over.style.display = 'none'; }, 8000);
    }
});

function updateGrid(jugadores, activeId = null) {
    const grid = document.getElementById('player-grid');
    grid.innerHTML = "";
    jugadores.forEach(j => {
        const div = document.createElement('div');
        div.className = `p-card ${j.id === activeId ? 'p-active' : ''} ${j.eliminated ? 'p-eliminated' : ''}`;
        div.innerText = j.nombre;
        grid.appendChild(div);
    });
}
