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
  const title = document.getElementById("roleTitle");
  const text = document.getElementById("roleText");
  document.getElementById("revealText").innerText = "";

  if (data.rol === "IMPOSTOR") {
    title.innerText = "🔴 ERES EL IMPOSTOR";
    text.innerHTML = `<span style="font-size:40px;color:#ff5252;">¡MIENTE!</span><br>No sabes la palabra.`;
  } else {
    palabraActual = data.palabra;
    title.innerText = "🟢 Eres Ciudadano";
    text.innerHTML = `La palabra es:<br><span style="font-size:40px;color:#00e676;">${data.palabra}</span>`;
  }
  showScreen("role");
});

function finishRound() { showScreen("end"); }

function reveal() {
  document.getElementById("revealText").innerText = "La palabra era: " + (palabraActual || "???");
}

function newRound() {
  socket.emit('iniciarRonda');
}