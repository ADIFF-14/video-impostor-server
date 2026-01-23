const socket = io();
let miId = "";

socket.on('vistas', (tipo) => {
    if (tipo === 'PROYECTOR') window.location.href = "proyector.html";
    if (tipo === 'JUGADOR') showScreen("waiting");
});

socket.on('faseVotacion', (vivos) => {
    showScreen("end");
    const lista = document.getElementById("lista-votacion");
    lista.innerHTML = "";
    
    // El jugador solo ve una lista de botones para votar
    vivos.forEach(j => {
        if (j.id !== socket.id) {
            const btn = document.createElement("button");
            btn.className = "btn-voto-mobile"; // Estilo diferente al proyector
            btn.innerText = `VOTAR POR ${j.nombre}`;
            btn.onclick = () => {
                socket.emit('votarJugador', j.id);
                lista.innerHTML = "<h3>Voto registrado. Mira el proyector.</h3>";
            };
            lista.appendChild(btn);
        }
    });
});

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}







