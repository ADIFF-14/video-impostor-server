 // 1. Variables Globales
const socket = io();
const peer = new Peer(); 
let miStream;
let miNombre = "";
let esAdmin = false;
let miRolActual = "";
let listaJugadoresGlobal = [];

// 2. Intentar activar micrófono desde el inicio
async function activarMicrofono() {
    try {
        miStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("Micrófono listo");
    } catch (err) {
        console.error("Error al acceder al micrófono:", err);
        alert("Para jugar necesitas permitir el uso del micrófono.");
    }
}
activarMicrofono();

// 3. Función Principal del Botón
async function entrarJuego() {
    const inputNombre = document.getElementById("userName");
    miNombre = (inputNombre ? inputNombre.value : "") || "Jugador_" + Math.floor(Math.random()*100);

    if (miNombre.toLowerCase() === "anderson") esAdmin = true;

    // Si el micro no se activó antes, lo intentamos otra vez
    if (!miStream) {
        await activarMicrofono();
    }

    // Unirse al servidor solo si PeerJS ya nos dio un ID
    if (peer.id) {
        enviarAlServidor();
    } else {
        console.log("Esperando ID de PeerJS...");
        peer.on('open', (id) => {
            enviarAlServidor();
        });
    }
}

function enviarAlServidor() {
    socket.emit('unirse', { nombre: miNombre, peerId: peer.id });
    showScreen("waiting");
    if (esAdmin) document.getElementById("adminBtn").style.display = "block";
}

// 4. Lógica de Audio (PeerJS)
peer.on('call', call => {
    call.answer(miStream);
    call.on('stream', remoteStream => {
        const audio = document.createElement('audio');
        audio.srcObject = remoteStream;
        audio.play();
    });
});

socket.on('listaParaAudio', (jugadores) => {
    listaJugadoresGlobal = jugadores;
    jugadores.forEach(user => {
        if (user.peerId !== peer.id && miStream) {
            const call = peer.call(user.peerId, miStream);
            call.on('stream', remoteStream => {
                const audio = document.createElement('audio');
                audio.srcObject = remoteStream;
                audio.play();
            });
        }
    });
});

// 5. Gestión de Pantallas y Turnos
function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    const target = document.getElementById(id);
    if (target) target.classList.add("active");
}

socket.on('recibirRol', (data) => {
    miRolActual = data.rol;
    document.getElementById("roleTitle").innerText = (data.rol === "IMPOSTOR") ? "🔴 ERES EL IMPOSTOR" : "🟢 Eres Ciudadano";
    document.getElementById("roleText").innerHTML = (data.rol === "IMPOSTOR") ? "¡Miente para ganar!" : `Palabra: <br><b>${data.palabra}</b>`;
    showScreen("role");
});

function irALosTurnos() { showScreen("turnScreen"); }

socket.on('cambioDeTurno', (data) => {
    showScreen("turnScreen");
    const grid = document.getElementById("grid-jugadores");
    const nameDisplay = document.getElementById("currentSpeakerName");
    const finishBtn = document.getElementById("btnFinalizarTurno");

    grid.innerHTML = "";
    data.listaActualizada.forEach(j => {
        const div = document.createElement("div");
        div.className = `cuadrito-jugador ${j.id === data.idSocket ? 'activo' : ''} ${j.eliminado ? 'muerto' : ''}`;
        div.innerText = j.nombre;
        grid.appendChild(div);
    });

    nameDisplay.innerText = data.nombre;
    nameDisplay.style.color = (socket.id === data.idSocket) ? "#00e676" : "#ffeb3b";
    finishBtn.style.display = (socket.id === data.idSocket) ? "block" : "none";
});

// 6. Votaciones y Resultados
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
    const resDiv = document.getElementById("resultado-final");
    resDiv.style.display = "block";
    document.getElementById("texto-expulsado").innerText = res.mensaje;
    
    if (res.terminar) {
        document.getElementById("texto-revelacion").innerText = "La frase era: " + res.palabraReal;
        if (esAdmin) document.getElementById("adminNextBtn").style.display = "block";
    } else {
        document.getElementById("texto-revelacion").innerText = "Siguiente ronda en 4 segundos...";
    }
});

// 7. Controles Admin
function newRound() { socket.emit('iniciarRonda'); }
function finalizarMiTurno() { socket.emit('finalizarMiTurno'); }
socket.on('actualizarLista', (num) => { if(document.getElementById("count")) document.getElementById("count").innerText = num; });
