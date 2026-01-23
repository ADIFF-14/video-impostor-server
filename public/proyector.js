const socket = io();
socket.emit('unirse', { nombre: 'proyector' });

const container = document.body;

socket.on('pantallaEstado', (estado) => {
    if (estado === 'JUEGO_INICIADO') {
        renderProyector("ATENCIÓN", "LEAN SU FRASE", "#00e676");
    }
    if (estado === 'VOTACION_ABIERTA') {
        renderProyector("MOMENTO DE", "VOTAR", "#ff9800");
    }
});

socket.on('turnoEnPantalla', (nombre) => {
    renderProyector("TIENE LA PALABRA:", nombre, "#00e676");
});

socket.on('resultadoFinalProyeccion', (data) => {
    let html = `<h1 style="font-size:5rem; color:${data.temporal ? '#ff4444' : '#00e676'}">${data.titulo}</h1>`;
    html += `<h2 style="font-size:3rem; opacity:0.8">${data.sub}</h2>`;
    if(data.palabra) html += `<h1 style="font-size:4rem; margin-top:40px">FRASE: ${data.palabra}</h1>`;
    
    document.body.innerHTML = `<div style="text-align:center; width:100%">${html}</div>`;
});

function renderProyector(sub, main, color) {
    document.body.innerHTML = `
        <div style="text-align:center; width:100%">
            <p style="font-size:3rem; text-transform:uppercase; margin:0">${sub}</p>
            <h1 style="font-size:8rem; color:${color}; background:#111; padding:40px; border-radius:40px; border:10px solid ${color}; margin:20px">${main}</h1>
        </div>
    `;
}
