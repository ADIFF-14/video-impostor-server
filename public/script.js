// 1. Conexión con Google Meet
async function initMeet() {
    try {
        await window.meet.addon.createAddonSession();
        console.log("Sesión de Meet lista");
    } catch (e) {
        console.log("Fuera de Meet");
    }
}
initMeet();

// 2. Variables de Estado
const socket = io(); 
const peer = new Peer(); 
let miStream;
let palabraActual = "";
let esAdmin = false;
let miNombre = "";
let miRolActual = "";
let listaJugadoresGlobal = [];

// 3. Audio con PeerJS
navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    miStream = stream;
    peer.on('call', call => {
        call.answer(miStream);
        call.on('stream', remoteStream => {
            const audio = document.createElement('audio');
            audio.srcObject = remoteStream;
            audio.play();
        });
    });
});

// 4. Funciones de Interfaz
function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    const target = document.getElementById(id);
    if(target) target.classList.add("active");
}

function entrarJuego() {
    const input = document.getElementById("userName");
    miNombre = (input ? input.value : "") || prompt("Tu nombre:") || "Jugador";
    
    if(miNombre.toLowerCase() === "anderson") esAdmin = true;
    
    if (peer.id) enviarUnion();
    else peer.on('open', () => enviarUnion());
}

function enviarUnion() {
    socket.emit('unirse', { nombre: miNombre, peerId: peer.id });
    showScreen("waiting");
    if(esAdmin) document.getElementById("adminBtn").style.display = "block";
}

// 5. Lógica de Audio y Lista
socket.on('listaParaAudio', (jugadores) => {
    listaJugadoresGlobal = jugadores; // Guardamos la lista actualizada
    jugadores.forEach(user => {
        if (user.peerId !== peer.id) {
            const call = peer.call(user.peerId, miStream);
            call.on('stream', remoteStream => {
                const audio = document.createElement('audio');
                audio.srcObject = remoteStream;
                audio.play();
            });
        }
    });
});

// 6. Recibir Roles
socket.on('recibirRol', (data) => {
    const title = document.getElementById("roleTitle");
    const text = document.getElementById("roleText");
    miRolActual = data.rol;

    if (data.rol === "IMPOSTOR") {
        title.innerText = "🔴 ERES EL IMPOSTOR";
        text.innerHTML = "¡Miente! No conoces la palabra.<br>Escucha pistas para adivinar.";
    } else {
        title.innerText = "🟢 Eres Ciudadano";
        text.innerHTML = `La palabra secreta es:<br><b style="font-size:35px; color:#00e676;">${data.palabra}</b>`;
        palabraActual = data.palabra;
    }
    showScreen("role");
});

function irALosTurnos() {
    showScreen("turnScreen");
}

// 7. GESTIÓN DE TURNOS Y ESCENARIO
socket.on('cambioDeTurno', (data) => {
    showScreen("turnScreen");
    const grid = document.getElementById("grid-jugadores");
    const nameDisplay = document.getElementById("currentSpeakerName");
    const finishBtn = document.getElementById("btnFinalizarTurno");

    // Dibujar cuadritos arriba
    grid.innerHTML = "";
    data.lista.forEach(j => {
        const div = document.createElement("div");
        div.className = `cuadrito-jugador ${j.id === data.idSocket ? 'activo' : ''} ${j.eliminado ? 'muerto' : ''}`;
        div.innerText = j.nombre;
        grid.appendChild(div);
    });

    nameDisplay.innerText = data.nombre;
    
    if (socket.id === data.idSocket) {
        nameDisplay.style.color = "#00e676";
        finishBtn.style.display = "block";
    } else {
        nameDisplay.style.color = "#ffeb3b";
        finishBtn.style.display = "none";
    }
});

function finalizarMiTurno() {
    socket.emit('finalizarMiTurno');
}

// 8. VOTACIÓN Y RESULTADOS
socket.on('faseVotacion', (vivos) => {
    showScreen("end");
    document.getElementById("voteStatus").style.display = "block";
    document.getElementById("resultado-final").style.display = "none";
    
    const listaVotacion = document.getElementById("lista-votacion");
    listaVotacion.innerHTML = "";

    vivos.forEach(j => {
        if(j.id !== socket.id) {
            const btn = document.createElement("button");
            btn.innerText = j.nombre;
            btn.className = "btn-voto";
            btn.onclick = () => {
                socket.emit('votarJugador', j.id);
                listaVotacion.innerHTML = "<h3>Voto enviado...</h3>";
            };
            listaVotacion.appendChild(btn);
        }
    });
});

socket.on('resultadoVotacion', (res) => {
    showScreen("end");
    document.getElementById("voteStatus").style.display = "none";
    document.getElementById("lista-votacion").innerHTML = "";
    
    const resDiv = document.getElementById("resultado-final");
    const txtExp = document.getElementById("texto-expulsado");
    const txtRev = document.getElementById("texto-revelacion");

    resDiv.style.display = "block";
    txtExp.innerText = res.mensaje;
    txtExp.style.color = res.terminar ? "#ff5252" : "#ffeb3b";

    if (res.terminar) {
        txtRev.innerText = "La frase era: " + res.palabra;
        if (esAdmin) document.getElementById("adminNextBtn").style.display = "block";
    } else {
        txtRev.innerText = "Nueva ronda en breve...";
        document.getElementById("adminNextBtn").style.display = "none";
    }
});

// 9. Controles de Partida
function reveal() {
    socket.emit('solicitarRevelar');
}

function newRound() {
    socket.emit('iniciarRonda');
}

socket.on('actualizarLista', (num) => {
    const countEl = document.getElementById("count");
    if(countEl) countEl.innerText = num;
});
