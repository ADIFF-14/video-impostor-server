/* =====================
   SOCKET
===================== */
const socket = io();
let esAdmin = false;

/* =====================
   ENTRAR
===================== */
function entrarJuego() {
  const input = document.getElementById("userName");

  if (!input) {
    alert("Input no encontrado");
    return;
  }

  const nombre = input.value.trim();
  if (nombre === "") {
    alert("Escribe tu nombre");
    return;
  }

  socket.emit("unirse", { nombre });
}

/* =====================
   ADMIN BOTONES
===================== */
function iniciarPartida() {
  socket.emit("iniciarPartida");
}

function iniciarDebate() {
  socket.emit("iniciarDebate");
}

function terminarTurno() {
  socket.emit("terminarTurno");
}

/* =====================
   VISTA
===================== */
socket.on("vista", (tipo) => {
  if (tipo === "ADMIN") {
    esAdmin = true;
    document.getElementById("admin-panel").style.display = "block";
  }
  mostrarPantalla("waiting");
});

/* =====================
   CONTADOR
===================== */
socket.on("contador", (n) => {
  document.getElementById("count").innerText = n;
});

/* =====================
   ROL
===================== */
socket.on("rol", (data) => {
  mostrarPantalla("role");

  if (data.tipo === "IMPOSTOR") {
    roleTitle.innerText = "ERES EL IMPOSTOR";
    roleText.innerText = "Descubre la palabra";
  } else {
    roleTitle.innerText = "TU PALABRA ES:";
    roleText.innerText = data.palabra;
  }
});

/* =====================
   TURNOS
===================== */
socket.on("turno", (d) => {
  mostrarPantalla("turnScreen");
  currentSpeakerName.innerText = d.nombre;
  btnFinalizarTurno.style.display =
    socket.id === d.id ? "block" : "none";
});

/* =====================
   VOTACIÓN
===================== */
socket.on("faseVotacion", (jugadores) => {
  mostrarPantalla("end");
  const lista = document.getElementById("lista-votacion");
  lista.innerHTML = "";

  jugadores.forEach(j => {
    if (j.id !== socket.id) {
      const b = document.createElement("button");
      b.className = "btn-big";
      b.style.background = "#333";
      b.style.color = "white";
      b.innerText = j.nombre;

      b.onclick = () => {
        socket.emit("votar", j.id);
        lista.innerHTML = "Voto enviado";
      };

      lista.appendChild(b);
    }
  });
});

/* =====================
   PANTALLAS
===================== */
function mostrarPantalla(id) {
  document.querySelectorAll(".screen")
    .forEach(s => s.classList.remove("active"));

  const t = document.getElementById(id);
  if (t) t.classList.add("active");
}












