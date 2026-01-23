const socket = io();

// Indicar al servidor que somos el proyector
socket.emit('registrarTipo', 'PROYECTOR');

socket.on('listaInicialProyeccion', (jugadores) => {
    actualizarInterfazVotos(jugadores);
});

socket.on('pantallaEstado', (estado) => {
    if (estado === 'JUEGO_INICIADO') {
        document.getElementById('esperando').style.display = 'none';
        document.getElementById('juego-activo').style.display = 'block';
    }
});

socket.on('turnoEnPantalla', (nombre) => {
    document.getElementById('nombre-turno').innerText = nombre;
    document.getElementById('mensaje-central').style.display = 'none';
});

socket.on('pantallaEstado', (estado) => {
    if (estado === 'VOTACION_ABIERTA') {
        document.getElementById('nombre-turno').innerText = "¡A VOTAR EN SUS MÓVILES!";
        document.getElementById('turno-gigante').style.backgroundColor = "#e67e22";
    }
});

// ACTUALIZACIÓN DE VOTOS EN TIEMPO REAL
socket.on('actualizarVotosProyeccion', (conteo) => {
    for (let id in conteo) {
        const divVoto = document.getElementById(`votos-${id}`);
        const tarjeta = document.getElementById(`tarjeta-${id}`);
        if (divVoto) {
            divVoto.innerText = conteo[id];
            // Animación rápida al recibir voto
            tarjeta.classList.add('voto-recibido');
            setTimeout(() => tarjeta.classList.remove('voto-recibido'), 300);
        }
    }
});

socket.on('resultadoFinalProyeccion', (data) => {
    const msg = document.getElementById('mensaje-central');
    msg.style.display = 'block';
    msg.innerHTML = data.esImpostor ? 
        `¡ATRAPADO!<br><span style="color:white; font-size:3rem;">${data.expulsado} era el impostor</span>` : 
        `¡ERROR!<br><span style="color:white; font-size:3rem;">${data.expulsado} era inocente</span>`;
    
    if (data.palabraReal) {
        msg.innerHTML += `<br><span style="font-size:2rem; color:#f1c40f;">La palabra era: ${data.palabraReal}</span>`;
    }
});

function actualizarInterfazVotos(jugadores) {
    const contenedor = document.getElementById('marcador-votos');
    contenedor.innerHTML = "";
    jugadores.forEach(j => {
        if (!j.eliminado) {
            const div = document.createElement('div');
            div.className = 'tarjeta-jugador';
            div.id = `tarjeta-${j.id}`;
            div.innerHTML = `
                <div class="nombre-p">${j.nombre}</div>
                <div class="votos-p" id="votos-${j.id}">0</div>
            `;
            contenedor.appendChild(div);
        }
    });
}
