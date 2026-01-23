const socket = io();
let esAdmin = false;

/* =========================
   ENTRAR AL JUEGO
========================= */
function entrarJuego() {
  const input = document.getElementById("userName");
  if (!input) {
    alert("No se encontró el campo de nombre");
    return;
  }

  const nombre = input.value.trim();
  if (nombre === "") {
    alert("Escribe tu nombre");
    return;
  }

  socket.emit("unirse", { nombre });
}

/* =========================
   VISTA SEGÚN ROL
========================= */
socket.on("vista", (tipo) => {
  if (tipo === "ADMIN") {
    esAdmin = true;
    document.getElementById("admin-panel").style.display = "block";
    document.getElementById("adminBtn").style.display = "block";
  }

  mostrarPantalla("waiting");
});

/* =========================
   CONTADOR DE JUGADORES
========================= */
socket.on("contador", (n) => {
  const c = document.getElementById("count");
  if (c) c.innerText = n;
});

/* =========================
   ROL DEL JUGADOR
========================= */
socket.on("rol", (data) => {
  mostrarPantalla("role");

  const title = document.getElementById("roleTitle");
  const text = document.getElementById("roleText");

  if (data.tipo === "IMPOSTOR") {
    title.innerText = "ERES EL IMPOSTOR";
    text.innerText = "Descubre la palabra secreta";
  } else {
    title.innerText = "TU PALABRA ES:";
    text.innerText = data.palabra;
  }
});

/* =========================
   TURNOS DE HABLA
========================= */
socket.on("turno", (data) => {
  mostrarPantalla("turnScreen");

  document.getElementById("currentSpeakerName").innerText = data.nombre;

  const btn = document.getElementById("btnFinalizarTurno");
  if (btn) {
    btn.style.display = socket.id === data.id ? "block" : "none";
  }
});

/* =========================
   FASE DE VOTACIÓN
========================= */
socket.on("faseVotacion", (jugadores) => {
  mostrarPantalla("end");

  const lista = document.getElementById("lista-votacion");
  lista.innerHTML = "";

  if (esAdmin) {
    lista.innerText = "Votación en curso...";
    return;
  }

  jugadores.forEach((j) => {
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

/* =========================
   CAMBIO DE PANTALLAS
========================= */
function mostrarPantalla(id) {
  document.querySelectorAll(".screen").forEach((s) => {
    s.classList.remove("active");
  });

  const t = document.getElementById(id);
  if (t) t.classList.add("active");
}












