const socket = io();
const peer = new Peer();
let miStream, miNombre, esAdmin = false, micActivo = true;

navigator.mediaDevices.getUserMedia({ audio: true }).then(s => {
    miStream = s;
    actualizarIconoMic();
    peer.on('call', call => {
        call.answer(miStream);
        call.on('stream', rem => playStream(rem));
    });
});

function playStream(stream) {
    const a = document.createElement('audio');
    a.srcObject = stream; a.play();
}

socket.on('listaParaAudio', (jugadores) => {
    jugadores.forEach(u => {
        if (u.peerId !== peer.id && miStream) {
            const call = peer.call(u.peerId, miStream);
            call.on('stream', rem => playStream(rem));
        }
    });
});

function entrarJuego() {
    const input = document.getElementById("userName");
    miNombre = input.value || "Jugador_" + Math.floor(Math.random()*100);
    if (miNombre.toLowerCase() === "anderson") esAdmin = true;
    if (peer.id) enviarUnion(); else peer.on('open', enviarUnion);
}

function enviarUnion() {
    socket.emit('unirse', { nombre: miNombre, peerId: peer.id });
    showScreen("waiting");
    if (esAdmin) document.getElementById("adminBtn").style.display = "block";
}

function toggleMic() {
    micActivo = !micActivo;
    if (miStream) miStream.getAudioTracks()[0].enabled = micActivo;
    actualizarIconoMic();
}

function actualizarIconoMic() {
    const btn = document.getElementById("micBtn");
    btn.innerHTML = micActivo ? "🎤" : "🔇";
    btn.className = micActivo ? "btn-mute" : "btn-mute muted";
}

socket.on('recibirRol', (data) => {
    document.getElementById("roleTitle").innerText = (data.rol === "IMPOSTOR") ? "🔴 IMPOSTOR" : "🟢 CIUDADANO";
    document.getElementById("roleText").innerText = (data.rol === "IMPOSTOR") ? "Miente!" : data.palabra;
    showScreen("role");
});

function irALosTurnos() {
    if(esAdmin) socket.emit('listoParaHablar');
    showScreen("turnScreen");
}

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
    const lista = document.getElementById("lista-votacion");
    lista.innerHTML = "";
    vivos.forEach(j => {
        if(j.id !== socket.id) {
            const b = document.createElement("button");
            b.className = "btn-voto";
            b.innerText = `Votar a ${j.nombre}`;
            b.onclick = () => { socket.emit('votarJugador', j.id); lista.innerHTML = "Esperando..."; };
            lista.appendChild(b);
        }
    });
});

socket.on('resultadoVotacion', (res) => {
    showScreen("result");
    document.getElementById("texto-res").innerText = res.mensaje;
    if (res.terminar) {
        document.getElementById("texto-palabra").innerText = "La frase era: " + res.palabraReal;
        if (esAdmin) document.getElementById("btnNext").style.display = "block";
    } else {
        document.getElementById("texto-palabra").innerText = "Preparando siguiente ronda...";
        setTimeout(() => { if(esAdmin) socket.emit('listoParaHablar'); }, 4000);
    }
});

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

socket.on('actualizarLista', (n) => { document.getElementById("count").innerText = n; });

