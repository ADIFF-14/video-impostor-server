const socket = io();
let miNombre, esAdmin = false;

// Al cargar, avisamos que este es un dispositivo de control/jugador
socket.emit('registrarTipo', 'CLIENTE');

function entrarJuego() {
    const input = document.getElementById("userName");
    miNombre = input.value || "Jugador_" + Math.floor(Math.random()*100);
    
    if (miNombre.toLowerCase() === "anderson") {
        esAdmin = true;
    }
    
    enviarUnion();
}

function enviarUnion() {
    socket.emit('unirse', { nombre: miNombre });
    showScreen("waiting");
    
    // Si eres admin, mostramos tus controles maestros
    if (esAdmin) {
        document.getElementById("adminBtn").style.display = "block";
        document.body.classList.add("admin-mode"); // Opcional: para estilos CSS
    }
}

// OJO DE DIOS: Solo Anderson recibe esto
socket.on('infoSecretaAdmin', (data) => {
    if (!esAdmin) return;
    
    const impostor = data.jugadores.find(j => j.rol === "IMPOSTOR");
    // Puedes crear un div en tu HTML para mostrar esto permanentemente
    console.log("INFO SECRETA: El impostor es " + impostor.nombre);
    alert("MODO ADMIN: El impostor es " + impostor.nombre + "\nPalabra: " + data.palabra);
});

socket.on('recibirRol', (data) => {
    // Si eres admin, esta pantalla es informativa, no tienes que "mentir"
    if (esAdmin) {
        document.getElementById("roleTitle").innerText = "MODO ADMINISTRADOR";
        document.getElementById("roleText").innerText = "Vigilando la partida...";
    } else {
        document.getElementById("roleTitle").innerText = (data.rol === "IMPOSTOR") ? "ERES EL IMPOSTOR" : "TU FRASE ES:";
        document.getElementById("roleText").innerText = (data.rol === "IMPOSTOR") ? "Miente para sobrevivir" : data.palabra;
    }
    
    showScreen("role");
    if (esAdmin) document.getElementById("startDebateBtn").style.display = "block";
});

function iniciarPartida() {
    if (esAdmin) socket.emit('iniciarRonda');
}

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
    
    // El botón de finalizar turno solo le sale al que habla
    // Si eres admin, nunca te saldrá porque no estás en la lista de turnos
    document.getElementById("btnFinalizarTurno").style.display = (socket.id === data.idSocket) ? "block" : "none";
});

socket.on('faseVotacion', (vivos) => {
    showScreen("end");
    const lista = document.getElementById("lista-votacion");
    lista.innerHTML = "";

    if (esAdmin) {
        lista.innerHTML = "<h3>Votación en curso... Mira la pantalla gigante</h3>";
        return;
    }

    vivos.forEach(j => {
        if(j.id !== socket.id) {
            const b = document.createElement("button");
            b.className = "btn-voto";
            b.innerText = j.nombre;
            b.onclick = () => { 
                socket.emit('votarJugador', j.id); 
                lista.innerHTML = "<p>Voto enviado. Mira la pantalla gigante...</p>"; 
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
        // Solo tú puedes reiniciar el juego
        if (esAdmin) document.getElementById("btnNext").style.display = "block";
    } else {
        document.getElementById("texto-palabra").innerText = "Siguiente ronda...";
        // El auto-inicio solo lo dispara el servidor o el admin
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




