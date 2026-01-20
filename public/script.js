// 1. Configuración Inicial
const socket = io();
const peer = new Peer(); 
let miStream;
let miNombre = "";
let esAdmin = false;
let miRolActual = "";
let listaJugadoresGlobal = [];

// 2. Intentar capturar el micrófono desde que carga la página
navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
        miStream = stream;
        console.log("✅ Micrófono activado");
    })
    .catch(err => {
        console.error("❌ Error de micro:", err);
        alert("Por favor, permite el acceso al micrófono para poder jugar.");
    });

// 3. FUNCIÓN DEL BOTÓN (Aquí está el arreglo)
function entrarJuego() {
    console.log("Botón presionado...");
    
    // Obtenemos el nombre
    const inputNombre = document.getElementById("userName");
    miNombre = (inputNombre && inputNombre.value.trim() !== "") ? inputNombre.value : "Jugador_" + Math.floor(Math.random()*100);

    if (miNombre.toLowerCase() === "anderson") {
        esAdmin = true;
    }

    // Verificamos conexión de Audio (PeerJS)
    if (peer.id) {
        console.log("Peer listo, enviando unión...");
        enviarAlServidor();
    } else {
        console.log("Peer no estaba listo, esperando conexión...");
        // Si no está listo, forzamos la espera
        peer.on('open', (id) => {
            console.log("Peer abierto ahora con ID:", id);
            enviarAlServidor();
        });
        
        // Si tarda demasiado, avisamos
        setTimeout(() => {
            if (!peer.id) alert("El sistema de audio está tardando en conectar. Revisa tu internet.");
        }, 5000);
    }
}

function enviarAlServidor() {
    socket.emit('unirse', { nombre: miNombre, peerId: peer.id });
    showScreen("waiting");
    
    if (esAdmin) {
        const btnAdmin = document.getElementById("adminBtn");
        if (btnAdmin) btnAdmin.style.display = "block";
    }
}

// 4. Lógica de Audio (Recibir y llamar)
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
    const title = document.getElementById("roleTitle");
    const text = document.getElementById("roleText");
    
    if(title) title.innerText = (data.rol === "IMPOSTOR") ? "🔴 ERES EL IMPOSTOR" : "🟢 Eres Ciudadano";
    if(text) text.innerHTML = (data.rol === "IMPOSTOR") ? "¡Miente para ganar!" : `Palabra: <br><b style="font-size:35px;">${data.palabra}</b>`;
    
    showScreen("role");
});

function irALosTurnos() {
    showScreen("turnScreen");
}

socket.on('cambioDeTurno', (data) => {
    showScreen("turnScreen");
    const grid = document.getElementById("grid-jugadores");
    const nameDisplay = document.getElementById("currentSpeakerName");
    const finishBtn = document.getElementById("btnFinalizarTurno");

    if(grid) {
        grid.innerHTML = "";
        data.listaActualizada.forEach(j => {
            const div = document.createElement("div");
            div.className = `cuadrito-jugador ${j.id === data.idSocket ? 'activo' : ''} ${j.eliminado ? 'muerto' : ''}`;
            div.innerText = j.nombre;
            grid.appendChild(div);
        });
    }

    if(nameDisplay) nameDisplay.innerText = data.nombre;
    if(finishBtn) finishBtn.style.display = (socket.id === data.idSocket) ? "block" : "none";
});

// 6. Votaciones y Resultados
socket.on('faseVotacion', (vivos) => {
    showScreen("end");
    const status = document.getElementById("voteStatus");
    const resFinal = document.getElementById("resultado-final");
    const listaVot = document.getElementById("lista-votacion");

    if(status) status.style.display = "block";
    if(resFinal) resFinal.style.display = "none";
    if(listaVot) {
        listaVot.innerHTML = "";
        vivos.forEach(j => {
            if(j.id !== socket.id) {
                const btn = document.createElement("button");
                btn.innerText = j.nombre;
                btn.className = "btn-voto";
                btn.onclick = () => {
                    socket.emit('votarJugador', j.id);
                    listaVot.innerHTML = "<h3>Voto enviado...</h3>";
                };
                listaVot.appendChild(btn);
            }
        });
    }
});

socket.on('resultadoVotacion', (res) => {
    showScreen("end");
    const status = document.getElementById("voteStatus");
    const resFinal = document.getElementById("resultado-final");
    const txtExp = document.getElementById("texto-expulsado");
    const txtRev = document.getElementById("texto-revelacion");

    if(status) status.style.display = "none";
    if(resFinal) resFinal.style.display = "block";
    if(txtExp) txtExp.innerText = res.mensaje;
    
    if (res.terminar) {
        if(txtRev) txtRev.innerText = "La frase era: " + res.palabraReal;
        const nextBtn = document.getElementById("adminNextBtn");
        if(nextBtn && esAdmin) nextBtn.style.display = "block";
    } else {
        if(txtRev) txtRev.innerText = "Siguiente ronda en 4 segundos...";
    }
});

// 7. Funciones Globales
function newRound() { socket.emit('iniciarRonda'); }
function finalizarMiTurno() { socket.emit('finalizarMiTurno'); }

socket.on('actualizarLista', (num) => {
    const count = document.getElementById("count");
    if(count) count.innerText = num;
});
