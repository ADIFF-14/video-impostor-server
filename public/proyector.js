const socket = io();
socket.emit('unirse', { nombre: 'proyector' });

socket.on('listaInicialProyeccion', (jugadores) => {
    const contenedor = document.getElementById('marcador-votos');
    contenedor.innerHTML = "";
    jugadores.forEach(j => {
        const div = document.createElement('div');
        div.className = 'tarjeta-jugador';
        div.id = `tarjeta-${j.id}`;
        div.innerHTML = `<div class="nombre-p">${j.nombre}</div><div class="votos-p" id="votos-${j.id}">0</div>`;
        contenedor.appendChild(div);
    });
});

socket.on('pantallaEstado', (estado) => {
    if (estado === 'JUEGO_INICIADO') {
        document.getElementById('esperando').style.display = 'none';
        document.getElementById('juego-activo').style.display = 'block';
    }
    if (estado === 'VOTACION_ABIERTA') {
        document.getElementById('turno-gigante').innerText = "¡VOTEN AHORA!";
        document.getElementById('turno-gigante').style.background = "#e67e22";
    }
});

socket.on('turnoEnPantalla', (nombre) => {
    document.getElementById('nombre-turno').innerText = nombre;
    document.getElementById('turno-gigante').style.background = "#00e676";
});

socket.on('actualizarVotosProyeccion', (conteo) => {
    for (let id in conteo) {
        const el = document.getElementById(`votos-${id}`);
        if (el) {
            el.innerText = conteo[id];
            document.getElementById(`tarjeta-${id}`).classList.add('voto-recibido');
            setTimeout(() => document.getElementById(`tarjeta-${id}`).classList.remove('voto-recibido'), 300);
        }
    }
});

socket.on('resultadoFinalProyeccion', (data) => {
    const msg = document.getElementById('mensaje-central');
    msg.style.display = 'block';
    msg.innerHTML = `<h1>${data.esImpostor ? '¡ATRAPADO!' : '¡ERA INOCENTE!'}</h1><h2>${data.expulsado}</h2>`;
});
