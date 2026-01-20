// 1. Conexión con Google Meet (Mantenemos tu lógica)
async function initMeet() {
    try {
        const session = await window.meet.addon.createAddonSession();
        console.log("Sesión de Google Meet iniciada");
    } catch (e) {
        console.log("Fuera de Meet");
    }
}
initMeet();

// 2. Variables de Estado
const socket = io(); 
const peer = new Peer(); // Para el audio
let miStream;
let palabraActual = "";
let esAdmin = false;
let miNombre = "";

// 3. Audio con PeerJS
// Pedimos micrófono al cargar la página
navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    miStream = stream;
    // Escuchar cuando otros nos llaman para darnos su audio
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
    const nombreInput = document.getElementById("userName") ? document.getElementById("userName").value : "";
    miNombre = nombreInput || prompt("Tu nombre:") || "Jugador";
    
    if(miNombre.toLowerCase() === "anderson") {
        esAdmin = true;
    }
    
    // Esperamos a que PeerJS nos dé un ID de audio antes de unirnos al socket
    if (peer.id) {
        enviarUnion();
    } else {
        peer.on('open', () => enviarUnion());
    }
}

function enviarUnion() {
    socket.emit('unirse', { nombre: miNombre, peerId: peer.id });
    showScreen("waiting");
    
    if(esAdmin) {
        const btn1 = document.getElementById("adminBtn");
        const btn2 = document.getElementById("adminNextBtn");
        if(btn1) btn1.style.display = "block";
        if(btn2) btn2.style.display = "block";
    }
}

// 5. Lógica de Audio: Conectar con los demás
socket.on('listaParaAudio', (jugadores) => {
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
    document.getElementById("revealText").innerText = "";

    if (data.rol === "IMPOSTOR") {
        title.innerText = "🔴 ERES EL IMPOSTOR";
        text.innerHTML = "¡Miente! No conoces la palabra.<br>Escucha a los demás para adivinarla.";
        palabraActual = "ERAS EL IMPOSTOR";
    } else {
        palabraActual = data.palabra;
        title.innerText = "🟢 Eres Ciudadano";
        text.innerHTML = `La palabra secreta es:<br><b style="font-size:30px; color:#00e676;">${data.palabra}</b>`;
    }
    showScreen("role");
});

// 7. GESTIÓN DE TURNOS (Lo nuevo)
function irALosTurnos() {
    // Esta función se llama desde el botón "Listo, ya lo vi"
    showScreen("turnScreen");
}

socket.on('cambioDeTurno', (data) => {
    showScreen("turnScreen");
    const nameDisplay = document.getElementById("currentSpeakerName");
    const finishBtn = document.getElementById("btnFinalizarTurno");

    if(nameDisplay) nameDisplay.innerText = data.nombre;

    // Solo al que le toca le sale el botón de finalizar
    if (socket.id === data.idSocket) {
        if(nameDisplay) nameDisplay.style.color = "#00e676";
        if(finishBtn) finishBtn.style.display = "block";
    } else {
        if(nameDisplay) nameDisplay.style.color = "#ffeb3b";
        if(finishBtn) finishBtn.style.display = "none";
    }
});

function finalizarMiTurno() {
    socket.emit('finalizarMiTurno');
}

socket.on('faseVotacion', () => {
    showScreen("end");
});

// 8. Controles de Partida
function reveal() {
    document.getElementById("revealText").innerText = "La palabra era: " + palabraActual;
}

function newRound() {
    socket.emit('iniciarRonda');
}

socket.on('actualizarLista', (num) => {
    const countEl = document.getElementById("count");
    if(countEl) countEl.innerText = num;
});
