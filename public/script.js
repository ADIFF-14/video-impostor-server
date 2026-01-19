// 1. Conexión con Google Meet
async function initMeet() {
    try {
        // Crea la sesión para que el juego viva dentro del panel lateral de Meet
        const session = await window.meet.addon.createAddonSession();
        console.log("Sesión de Google Meet iniciada con éxito");
    } catch (e) {
        console.log("Jugando desde el navegador (Fuera de Meet)");
    }
}
initMeet();

// 2. Conexión con el Servidor
const socket = io(); 
let palabraActual = "";
let esAdmin = false;

// 3. Funciones de Interfaz
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const target = document.getElementById(id);
  if(target) target.classList.add("active");
}

function entrarJuego() {
  const nombre = prompt("Tu nombre:") || "Jugador";
  
  // Si tu nombre es Anderson, activas los botones de control
  if(nombre.toLowerCase() === "anderson") {
    esAdmin = true;
  }
  
  socket.emit('unirse', nombre);
  showScreen("waiting");
  
  if(esAdmin) {
    document.getElementById("adminBtn").style.display = "block";
    document.getElementById("adminNextBtn").style.display = "block";
  }
}

// 4. Lógica de Comunicación (Socket.io)
socket.on('actualizarLista', (num) => {
  const countEl = document.getElementById("count");
  if(countEl) countEl.innerText = num;
});

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

// 5. Controles de Partida
function finishRound() { 
    showScreen("end"); 
}

function reveal() {
    document.getElementById("revealText").innerText = "La palabra era: " + palabraActual;
}

function newRound() {
    socket.emit('iniciarRonda');
}
