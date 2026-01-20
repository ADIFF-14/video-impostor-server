const socket = io();
const peer = new Peer();
let miStream, miNombre, esAdmin = false;

navigator.mediaDevices.getUserMedia({ audio: true }).then(s => { miStream = s; });

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

// RECIBIR ROL AL INICIO DE PARTIDA
socket.on('recibirRol', (data) => {
    const title = document.getElementById("roleTitle");
    const text = document.getElementById("roleText");
    
    showScreen("role"); // Cambiamos a la pantalla de la frase

    if (data.rol === "IMPOSTOR") {
        title.innerText = "🕵️ TU ROL:";
        text.innerText = "IMPOSTOR";
        text.style.color = "#ff5252";
    } else {
        title.innerText = "📄 TU FRASE ES:";
        text.innerText = data.palabra; // AQUÍ sale la palabra (Pizza, etc)
        text.style.color = "#00e676";
    }
});

function irALosTurnos() {
    socket.emit('listoParaHablar');
    showScreen("turnScreen");
}

socket.on('cambioDeTurno', (data) => {
    showScreen("turnScreen");
    const grid = document.getElementById("grid-jugadores");
    grid.innerHTML = "";
    
    data.listaActualizada.forEach(j => {
        const div = document.createElement("div");
        div.className = `cuadrito ${j.id === data.idSocket ? 'activo' : ''} ${j.eliminado ? 'muerto' : ''}`;
        div.innerText = j.nombre;
        grid.appendChild(div);
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
            b.onclick = () => { socket.emit('votarJugador', j.id); lista.innerHTML = "Esperando votos..."; };
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

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

function newRound() { socket.emit('iniciarRonda'); }
function finalizarMiTurno() { socket.emit('finalizarMiTurno'); }
socket.on('actualizarLista', (n) => { if(document.getElementById("count")) document.getElementById("count").innerText = n; });

