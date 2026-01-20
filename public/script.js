const socket = io();
const peer = new Peer();
let miStream, miNombre, esAdmin = false;

// Activar micro al inicio
navigator.mediaDevices.getUserMedia({ audio: true }).then(s => { miStream = s; });

function entrarJuego() {
    const input = document.getElementById("userName");
    miNombre = (input ? input.value : "") || "Jugador_" + Math.floor(Math.random()*100);
    if (miNombre.toLowerCase() === "anderson") esAdmin = true;

    if (peer.id) { enviarUnion(); } 
    else { peer.on('open', () => enviarUnion()); }
}

function enviarUnion() {
    socket.emit('unirse', { nombre: miNombre, peerId: peer.id });
    showScreen("waiting");
    if (esAdmin) document.getElementById("adminBtn").style.display = "block";
}

socket.on('listaParaAudio', (jugadores) => {
    jugadores.forEach(u => {
        if (u.peerId !== peer.id && miStream) {
            const call = peer.call(u.peerId, miStream);
            call.on('stream', rem => {
                const a = document.createElement('audio');
                a.srcObject = rem; a.play();
            });
        }
    });
});

peer.on('call', call => {
    call.answer(miStream);
    call.on('stream', rem => {
        const a = document.createElement('audio');
        a.srcObject = rem; a.play();
    });
});

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

socket.on('recibirRol', (data) => {
    document.getElementById("roleTitle").innerText = (data.rol === "IMPOSTOR") ? "🔴 ERES EL IMPOSTOR" : "🟢 Eres Ciudadano";
    document.getElementById("roleText").innerHTML = (data.rol === "IMPOSTOR") ? "¡Miente!" : `Palabra: <br><b>${data.palabra}</b>`;
    showScreen("role");
});

socket.on('cambioDeTurno', (data) => {
    showScreen("turnScreen");
    const grid = document.getElementById("grid-jugadores");
    grid.innerHTML = "";
    data.listaActualizada.forEach(j => {
        const d = document.createElement("div");
        d.className = `cuadrito-jugador ${j.id === data.idSocket ? 'activo' : ''} ${j.eliminado ? 'muerto' : ''}`;
        d.innerText = j.nombre;
        grid.appendChild(d);
    });
    document.getElementById("currentSpeakerName").innerText = data.nombre;
    document.getElementById("btnFinalizarTurno").style.display = (socket.id === data.idSocket) ? "block" : "none";
});

socket.on('faseVotacion', (vivos) => {
    showScreen("end");
    document.getElementById("voteStatus").style.display = "block";
    document.getElementById("resultado-final").style.display = "none";
    const lista = document.getElementById("lista-votacion");
    lista.innerHTML = "";
    vivos.forEach(j => {
        if(j.id !== socket.id) {
            const b = document.createElement("button");
            b.innerText = j.nombre; b.className = "btn-voto";
            b.onclick = () => { socket.emit('votarJugador', j.id); lista.innerHTML = "Esperando..."; };
            lista.appendChild(b);
        }
    });
});

socket.on('resultadoVotacion', (res) => {
    showScreen("end");
    document.getElementById("voteStatus").style.display = "none";
    document.getElementById("resultado-final").style.display = "block";
    document.getElementById("texto-expulsado").innerText = res.mensaje;
    if (res.terminar) {
        document.getElementById("texto-revelacion").innerText = "La frase era: " + res.palabraReal;
        if(esAdmin) document.getElementById("adminNextBtn").style.display = "block";
    }
});

function irALosTurnos() { showScreen("turnScreen"); }
function newRound() { socket.emit('iniciarRonda'); }
function finalizarMiTurno() { socket.emit('finalizarMiTurno'); }
socket.on('actualizarLista', (n) => { if(document.getElementById("count")) document.getElementById("count").innerText = n; });
