const socket = io();
const peer = new Peer();
let miStream, miNombre, esAdmin = false;
let micActivo = true;

navigator.mediaDevices.getUserMedia({ audio: true }).then(s => { 
    miStream = s; 
    actualizarIconoMic();
});

function entrarJuego() {
    const input = document.getElementById("userName");
    miNombre = (input ? input.value : "") || "Jugador_" + Math.floor(Math.random()*100);
    if (miNombre.toLowerCase() === "anderson") esAdmin = true;
    if (peer.id) { enviarUnion(); } else { peer.on('open', () => enviarUnion()); }
}

function enviarUnion() {
    socket.emit('unirse', { nombre: miNombre, peerId: peer.id });
    showScreen("waiting");
    if (esAdmin) document.getElementById("adminBtn").style.display = "block";
}

function toggleMic() {
    micActivo = !micActivo;
    if (miStream) {
        miStream.getAudioTracks()[0].enabled = micActivo;
        actualizarIconoMic();
    }
}

function actualizarIconoMic() {
    const btn = document.getElementById("micBtn");
    if(btn) {
        btn.innerHTML = micActivo ? "🎤" : "🔇";
        btn.className = micActivo ? "btn-mute" : "btn-mute muted";
    }
}

socket.on('notificarRonda', (num) => {
    document.querySelectorAll(".ronda-num").forEach(el => el.innerText = num);
});

socket.on('recibirRol', (data) => {
    document.getElementById("roleTitle").innerText = (data.rol === "IMPOSTOR") ? "🔴 ERES EL IMPOSTOR" : "🟢 TU FRASE:";
    document.getElementById("roleText").innerText = (data.rol === "IMPOSTOR") ? "¡MIENTE PARA SOBREVIVIR!" : (data.palabra || data.word);
    showScreen("role");
});

socket.on('cambioDeTurno', (data) => {
    showScreen("turnScreen");
    const grid = document.getElementById("grid-jugadores");
    grid.innerHTML = "";
    data.lista.forEach(j => {
        const div = document.createElement("div");
        div.className = `cuadrito ${j.id === data.idSocket ? 'activo' : ''} ${j.eliminado ? 'eliminado' : ''}`;
        div.innerText = j.nombre;
        grid.appendChild(div);
    });
    document.getElementById("currentSpeakerName").innerText = data.nombre;
    document.getElementById("btnFinalizarTurno").style.display = (socket.id === data.idSocket) ? "block" : "none";
});

socket.on('faseVotacion', (vivos) => {
    showScreen("end");
    document.getElementById("resultado-final").style.display = "none";
    const lista = document.getElementById("lista-votacion");
    lista.innerHTML = "";
    vivos.forEach(j => {
        if(j.id !== socket.id) {
            const b = document.createElement("button");
            b.className = "btn-voto";
            b.innerText = `Votar a ${j.nombre}`;
            b.onclick = () => { socket.emit('votarJugador', j.id); lista.innerHTML = "Esperando votos..."; };
            lista.appendChild(b);
        }
    });
});

socket.on('resultadoVotacion', (res) => {
    showScreen("end");
    document.getElementById("resultado-final").style.display = "block";
    document.getElementById("texto-expulsado").innerText = res.mensaje;
    if (res.terminar) {
        document.getElementById("texto-revelacion").innerText = "La frase era: " + res.palabraReal;
        if(esAdmin) document.getElementById("adminNextBtn").style.display = "block";
    }
});

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

function irALosTurnos() { socket.emit('listoParaHablar'); showScreen("turnScreen"); }
function newRound() { socket.emit('iniciarRonda'); }
function finalizarMiTurno() { socket.emit('finalizarMiTurno'); }
socket.on('actualizarLista', (n) => { if(document.getElementById("count")) document.getElementById("count").innerText = n; });


