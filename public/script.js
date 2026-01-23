const socket = io();
let esAdmin = false;

/* ENTRAR */
function entrarJuego() {
  const nombre = document.getElementById("userName").value.trim();
  if (!nombre) return alert("Escribe tu nombre");
  socket.emit("unirse", { nombre });
}

/* VISTA */
socket.on("vista", (tipo) => {
  if (tipo === "ADMIN") {
    esAdmin = true;
    document.getElementById("admin-panel").style.display = "block";
  }
  mostrar("waiting");
});

/* CONTADOR */
socket.on("contador", (n) => {
  document.getElementById("count").innerText = n;
});

/* ROL */
socket.on("rol", (data) => {
  mostrar("role");
  if (data.tipo === "IMPOSTOR") {
    roleTitle.innerText = "ERES EL IMPOSTOR";
    roleText.innerText = "Descubre la palabra";
  } else {
    roleTitle.innerText = "TU PALABRA ES:";
    roleText.innerText = data.palabra;
  }
});

/* TURNOS */
socket.on("turno", (d) => {
  mostrar("turnScreen");
  currentSpeakerName.innerText = d.nombre;
  btnFinalizarTurno.style.display =
    socket.id === d.id ? "block" : "none";
});

/* VOTACIÓN */
socket.on("faseVotacion", (jugadores) => {
  mostrar("end");
  lista-votacion.innerHTML = "";

  jugadores.forEach(j => {
    if (j.id !== socket.id) {
      const b = document.createElement("button");
      b.className = "btn-big";
      b.style.background = "#333";
      b.style.color = "white";
      b.innerText = j.nombre;
      b.onclick = () => {
        socket.emit("votar", j.id);
        lista-votacion.innerHTML = "Voto enviado";
      };
      lista-votacion.appendChild(b);
    }
  });
});

/* CAMBIO DE PANTALLA */
function mostrar(id) {
  document.querySelectorAll(".screen")
    .forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}














