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

socket.on('recibirRol', (data) => {
    document.getElementById("roleTitle").innerText = (data.rol === "IMPOSTOR") ? "🕵️ ROL: IMPOSTOR" : "📄 TU FRASE:";
    document.getElementById("roleText").innerText = (data.rol === "IMPOSTOR") ? "¡MIENTE!" : data.palabra;
    document.getElementById("roleText").style.color = (data.rol === "IMPOSTOR") ? "#ff5252" : "#00e676";
    showScreen("role");
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
        div.className = `cuadrito ${j.id === data.idSocket ? 'activo' : ''} ${j.eliminado ? 'eliminado' : ''}`;
        div.innerText = j.nombre;
        grid.appendChild(div);
    });

    document.getElementById("currentSpeakerName").innerText = data.nombre;
    // Solo mostramos el botón al jugador que tiene el turno
    document.getElementById("btnFinalizarTurno").style.display = (socket.id === data.idSocket) ? "block" : "none";
});

socket.on('faseVotacion', (vivos) => {
    showScreen("end");
    document.getElementById("voteStatus").innerText = "¿QUIÉN ES EL IMPOSTOR?";
    document.getElementById("resultado-final").style.display = "none";
    const lista = document.getElementById("lista-votacion");
    lista.innerHTML = "";

    vivos.forEach(j => {
        if(j.id !== socket.id) {
            const b = document.createElement("button");
            b.innerText = j.nombre; b.className = "btn-voto";
            b.onclick = () => { 
                socket.emit('votarJugador', j.id); 
                lista.innerHTML = "<h3>Voto registrado...</h3>"; 
            };
            lista.appendChild(b);
        }
    });
});

socket.on('resultadoVotacion', (res) => {
    showScreen("end");
    document.getElementById("voteStatus").innerText = "RESULTADO DEL JUICIO";
    document.getElementById("lista-votacion").innerHTML = "";
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


