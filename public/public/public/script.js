const socket = io();
let palabraActual = "";
let esAdmin = false;

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function entrarJuego() {
  const nombre = prompt("Tu nombre:") || "Jugador";
  if(nombre.toLowerCase() === "anderson") esAdmin = true;
  socket.emit('unirse', nombre);
  showScreen("waiting");
  if(esAdmin) {
    document.getElementById("adminBtn").style.display = "block";
    document.getElementById("adminNextBtn").style.display = "block";
  }
}

socket.on('actualizarLista', (num) => {
  document.getElementById("count").innerText = num;
});

socket.on('recibirRol', (data) => {
  document.getElementById("revealText").innerText = "";
  if (data.rol === "IMPOSTOR") {
    document.getElementById("roleTitle").innerText = "🔴 IMPOSTOR";
    document.getElementById("roleText").innerHTML = "¡MIENTE!";
  } else {
    palabraActual = data.palabra;
    document.getElementById("roleTitle").innerText = "🟢 Ciudadano";
    document.getElementById("roleText").innerHTML = `Palabra: ${data.palabra}`;
  }
  showScreen("role");
});

function finishRound() { showScreen("end"); }
function reveal() { document.getElementById("revealText").innerText = "Era: " + (palabraActual || "???"); }
function newRound() { socket.emit('iniciarRonda'); }
