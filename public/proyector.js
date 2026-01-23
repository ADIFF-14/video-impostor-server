const socket = io();

// Indicar al servidor que somos el proyector
socket.emit('unirse', { nombre: 'proyector' });

socket.on('listaInicialProyeccion', (jugadores) => {
    const contenedor = document.getElementById('marcador-votos');
    contenedor.innerHTML = "";
    jugadores.forEach(j => {
        if (!j.eliminado) {
            const div = document.createElement('div');
            div.className = 'tarjeta';
            div.id = `tarjeta-${j.id}`;
            div.innerHTML = `
                <div class="nombre">${j.nombre}</div>
                <div class="puntos" id="votos-${j.id}">0</div>
            `;
            contenedor.appendChild(div);
        }
    });
});

socket.on('pantallaEstado', (estado) => {
    if (estado === 'JUEGO_INICIADO') {
        document.getElementById('pantalla-espera').style.display = 'none';
        document.getElementById('juego-activo').style.display = 'block';
        document.getElementById('marcador-votos').style.display = 'none';
        document.getElementById('resultado-final').style.display = 'none';
    }
    if (estado === 'VOTACION_ABIERTA') {
        document.getElementById('status-msg').innerText = "¡VOTEN EN SUS CELULARES!";
        document.getElementById('speaker-gigante').style.display = 'none';
        document.getElementById('marcador-votos').style.display = 'flex';
    }
});

socket.on('turnoEnPantalla', (nombre) => {
    document.getElementById('status-msg').innerText = "En el turno de hablar:";
    document.getElementById('speaker-gigante').style.display = 'block';
    document.getElementById('speaker-gigante').innerText = nombre;
    document.getElementById('marcador-votos').style.display = 'none';
});

socket.on('actualizarVotosProyeccion', (conteo) => {
    for (let id in conteo) {
        const elVoto = document.getElementById(`votos-${id}`);
        const elTarjeta = document.getElementById(`tarjeta-${id}`);
        if (elVoto) {
            elVoto.innerText = conteo[id];
            // Animación cuando sube un voto
            elTarjeta.classList.add('voto-anim');
            setTimeout(() => elTarjeta.classList.remove('voto-anim'), 300);
        }
    }
});

socket.on('resultadoFinalProyeccion', (data) => {
    const panel = document.getElementById('resultado-final');
    const titulo = document.getElementById('res-titulo');
    const sub = document.getElementById('res-sub');

    panel.style.display = 'flex';
    
    if (data.esImpostor) {
        titulo.innerText = "¡ATRAPADO!";
        titulo.style.color = "#00e676";
        sub.innerText = `${data.expulsado} era el Impostor`;
    } else {
        titulo.innerText = "ERA INOCENTE";
        titulo.style.color = "#ff4444";
        sub.innerText = `${data.expulsado} no era el Impostor`;
    }
});
