console.log("Script cargado correctamente");
const socket = io(); 

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const next = document.getElementById(id);
  if(next) next.classList.add("active");
}

function entrarJuego() {
  console.log("Botón Entrar presionado");
  const nombre = prompt("Tu nombre:") || "Jugador";
  socket.emit('unirse', nombre);
  showScreen("waiting");
  
  if(nombre.toLowerCase() === "anderson") {
    document.getElementById("adminBtn").style.display = "block";
    document.getElementById("adminNextBtn").style.display = "block";
  }
}

socket.on('actualizarLista', (num) => {
  document.getElementById("count").innerText = num;
});

socket.on('recibirRol', (data) => {
  if (data.rol === "IMPOSTOR") {
    document.getElementById("roleTitle").innerText = "🔴 IMPOSTOR";
    document.getElementById("roleText").innerText = "¡Miente! No sabes la palabra.";
  } else {
    document.getElementById("roleTitle").innerText = "🟢 Ciudadano";
    document.getElementById("roleText").innerText = "Palabra: " + data.palabra;
  }
  showScreen("role");
});

function finishRound() { showScreen("end"); }
function reveal() { document.getElementById("revealText").innerText = "La palabra era secreta."; }
function newRound() { socket.emit('iniciarRonda'); }
