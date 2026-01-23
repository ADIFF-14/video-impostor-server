const socket = io();
let esAdmin = false;

socket.on('vistas', (tipo) => {
    console.log("Vista asignada:", tipo);
    if (tipo === 'PROYECTOR') {
        window.location.href = "proyector.html";
    } else if (tipo === 'ADMIN') {
        esAdmin = true;
        document.getElementById("admin-panel").style.display = "block";
        document.getElementById("btn-iniciar-ronda").style.display = "block";
        showScreen("waiting");
    } else {
        showScreen("waiting");
    }
});

function entrarJuego() {
    const n = document.getElementById("userName").value.trim();
    if (n) {
        socket.emit('unirse', { nombre: n });
    } else {
        alert("Por favor, ingresa un nombre");
    }
}

socket.on('infoSecretaAdmin', (data) => {
    if (esAdmin) {
        const imp = data.jugadores.find(j => j.rol === "IMPOSTOR");
        document.getElementById("admin-info").innerText = `IMPOSTOR: ${imp.nombre} | PALABRA: ${data.palabra}`;
    }
});

socket.on('recibirRol', (data) => {
    if (data.rol === "IMPOSTOR") {
        document.getElementById("roleTitle").innerText = "ERES EL IMPOSTOR";
        document.getElementById("roleText").innerText = "Tu misión: descubre la palabra secreta";
    } else {
        document.getElementById("roleTitle").innerText = "TU FRASE ES:";
        document.getElementById("roleText").innerText = data.palabra;
    }
    showScreen("role");
    
    // Si eres admin, te aparece el botón para iniciar turnos
    if (esAdmin) {
        document.getElementById("btn-iniciar-debate").style.display = "block";
    }
});

socket.on('cambioDeTurno', (data) => {
    showScreen("turnScreen");
    document.getElementById("currentSpeakerName").innerText = data.nombre;
    document.getElementById("btnFinalizarTurno").style.display = (socket.id === data.idSocket) ? "block" : "none";
    
    const grid = document.getElementById("grid-jugadores");
    grid.innerHTML = "";
    data.lista.forEach(j => {
        const div = document.createElement("div");
        div.className = `cuadrito ${j.id === data.idSocket ? 'activo' : ''} ${j.eliminado ? 'eliminado' : ''}`;
        div.innerText = j.nombre;
        grid.appendChild(div);
    });
});

socket.on('faseVotacion', (vivos) => {
    showScreen("end");
    const lista = document.getElementById("lista-votacion");
    lista.innerHTML = esAdmin ? "<p>Votación en curso...</p>" : "";
    if (!esAdmin) {
        vivos.forEach(j => {
            if (j.id !== socket.id) {
                const b = document.createElement("button");
                b.className = "btn-voto";
                b.innerText = j.nombre;
                b.onclick = () => { 
                    socket.emit('votarJugador', j.id); 
                    lista.innerHTML = "Voto enviado"; 
                };
                lista.appendChild(b);
            }
        });
    }
});

socket.on('resultadoVotacion', (res) => {
    showScreen("result");
    document.getElementById("texto-res").innerText = res.mensaje;
    if (res.terminar) {
        document.getElementById("texto-palabra").innerText = "La frase era: " + res.palabraReal;
        if (esAdmin) document.getElementById("btn-reiniciar").style.display = "block";
    }
});

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    const target = document.getElementById(id);
    if(target) target.classList.add("active");
}

socket.on('actualizarLista', (n) => { 
    const el = document.getElementById("count");
    if(el) el.innerText = n; 
});






