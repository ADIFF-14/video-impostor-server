const socket = io();
let miNombre, esAdmin = false;

function entrarJuego() {
    const input = document.getElementById("userName");
    miNombre = input.value || "Jugador_" + Math.floor(Math.random()*100);
    
    // Si el nombre es anderson, se activa el modo admin
    if (miNombre.toLowerCase() === "anderson") esAdmin = true;
    
    enviarUnion();
}

function enviarUnion() {
    socket.emit('unirse', { nombre: miNombre });
    showScreen("waiting");
    if (esAdmin) document.getElementById("adminBtn").style.display = "block";
}

socket.on('recibirRol', (data) => {
    document.getElementById("roleTitle").innerText = (data.rol === "IMPOSTOR") ? "ERES EL IMPOSTOR" : "TU FRASE ES:";
    document.getElementById("roleText").innerText = (data.rol === "IMPOSTOR") ? "Miente para sobrevivir" : data.palabra;
    showScreen("role");
    
    // Solo Anderson puede ver el botón para iniciar el debate tras ver la frase
    if (esAdmin) document.getElementById("startDebateBtn").style.display = "block";
});

function irALosTurnos() {
    if(esAdmin) socket.emit('empezarDebateOficial');
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
    
    // El botón para terminar turno solo aparece en el dispositivo del que está hablando
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
            b.innerText = j.nombre;
            b.onclick = () => { 
                socket.emit('votarJugador', j.id); 
                lista.innerHTML = "<p style='margin-top:20px; opacity:0.5;'>Voto enviado. Esperando a los demás...</p>"; 
            };
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
        document.getElementById("texto-palabra").innerText = "Siguiente ronda en camino...";
        setTimeout(() => { if(esAdmin) socket.emit('empezarDebateOficial'); }, 8000);
    }
});

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

socket.on('actualizarLista', (n) => { 
    const el = document.getElementById("count");
    if(el) el.innerText = n; 
});




