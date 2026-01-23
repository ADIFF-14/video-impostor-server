const socket = io();
let miNombre, esAdmin = false;

socket.on('vistas', (tipo) => {
    if (tipo === 'PROYECTOR') {
        window.location.href = "/proyector.html";
    } else if (tipo === 'ADMIN') {
        esAdmin = true;
        document.getElementById("adminBtn").style.display = "block";
        showScreen("waiting");
    }
});

function entrarJuego() {
    miNombre = document.getElementById("userName").value.trim();
    if (!miNombre) return alert("Pon un nombre");
    socket.emit('unirse', { nombre: miNombre });
    if (miNombre.toLowerCase() !== 'anderson' && miNombre.toLowerCase() !== 'proyector') {
        showScreen("waiting");
    }
}

socket.on('infoSecretaAdmin', (data) => {
    if (esAdmin) {
        const imp = data.jugadores.find(j => j.rol === "IMPOSTOR");
        alert(`MODO ADMIN\nImpostor: ${imp.nombre}\nPalabra: ${data.palabra}`);
    }
});

socket.on('recibirRol', (data) => {
    document.getElementById("roleTitle").innerText = (data.rol === "IMPOSTOR") ? "ERES EL IMPOSTOR" : "TU FRASE ES:";
    document.getElementById("roleText").innerText = (data.rol === "IMPOSTOR") ? "Miente para sobrevivir" : data.palabra;
    showScreen("role");
    if (esAdmin) document.getElementById("startDebateBtn").style.display = "block";
});

function irALosTurnos() {
    if(esAdmin) socket.emit('empezarDebateOficial');
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
    lista.innerHTML = esAdmin ? "<h3>Votación en curso...</h3>" : "";
    if (!esAdmin) {
        vivos.forEach(j => {
            if(j.id !== socket.id) {
                const b = document.createElement("button");
                b.className = "btn-voto";
                b.innerText = j.nombre;
                b.onclick = () => { socket.emit('votarJugador', j.id); lista.innerHTML = "<p>Voto enviado</p>"; };
                lista.appendChild(b);
            }
        });
    }
});

socket.on('resultadoVotacion', (res) => {
    showScreen("result");
    document.getElementById("texto-res").innerText = res.mensaje;
    if (res.terminar) {
        document.getElementById("texto-palabra").innerText = "Palabra: " + res.palabraReal;
        if (esAdmin) document.getElementById("btnNext").style.display = "block";
    }
});

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

socket.on('actualizarLista', (n) => { document.getElementById("count").innerText = n; });




