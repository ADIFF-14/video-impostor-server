const socket = io();
let esAdmin = false;

socket.on('vistas', (tipo) => {
    if (tipo === 'ADMIN') {
        esAdmin = true;
        document.getElementById("admin-panel").style.display = "block";
        document.getElementById("adminBtn").style.display = "block";
    }
    showScreen("waiting");
});

function entrarJuego() {
    const n = document.getElementById("userName").value.trim();
    if (n) socket.emit('unirse', { nombre: n });
}

socket.on('infoSecretaAdmin', (data) => {
    if (esAdmin) {
        const imp = data.jugadores.find(j => j.rol === "IMPOSTOR");
        document.getElementById("admin-info").innerText = `IMP: ${imp.nombre} | PALABRA: ${data.palabra}`;
        document.getElementById("btn-debate-fijo").style.display = "block";
        document.getElementById("btn-forzar").style.display = "none";
    }
});

socket.on('cambioDeTurno', (data) => {
    if (esAdmin) {
        document.getElementById("btn-debate-fijo").style.display = "none";
        document.getElementById("btn-forzar").style.display = "block";
    }
    showScreen("turnScreen");
    document.getElementById("currentSpeakerName").innerText = data.nombre;
    document.getElementById("btnFinalizarTurno").style.display = (socket.id === data.idSocket) ? "block" : "none";
});

socket.on('faseVotacion', (vivos) => {
    if (esAdmin) document.getElementById("btn-forzar").style.display = "none";
    showScreen("end");
    const lista = document.getElementById("lista-votacion");
    lista.innerHTML = esAdmin ? "<p style='color:white'>Votación en el proyector...</p>" : "";
    if (!esAdmin) {
        vivos.forEach(j => {
            if (j.id !== socket.id) {
                const b = document.createElement("button");
                b.className = "btn-big"; b.style.background = "#fff"; b.style.color = "#000"; b.style.marginBottom = "10px";
                b.innerText = j.nombre;
                b.onclick = () => { socket.emit('votarJugador', j.id); lista.innerHTML = "Voto enviado"; };
                lista.appendChild(b);
            }
        });
    }
});

socket.on('resultadoVotacion', (res) => {
    showScreen("result");
    document.getElementById("texto-res").innerText = res.mensaje;
    if (res.terminar) {
        document.getElementById("texto-palabra").innerText = "FRASE: " + res.palabraReal;
        if (esAdmin) document.getElementById("btn-reiniciar").style.display = "block";
    }
});

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    const target = document.getElementById(id);
    if(target) target.classList.add("active");
}

socket.on('actualizarLista', (n) => { if(document.getElementById("count")) document.getElementById("count").innerText = n; });










