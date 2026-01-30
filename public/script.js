const socket = io();
let esAdmin = false;

/* =========================
   ENTRAR
========================= */
function entrarJuego() {
  const nombre = document.getElementById("userName").value.trim();
  if (nombre) socket.emit("unirse", { nombre });
}

/* =========================
   VISTA SEGÚN ROL
========================= */
socket.on("vistas", (tipo) => {
  if (tipo === "PROYECTOR") {
    window.location.href = "proyector.html";
    return;
  }

  if (tipo === "ADMIN") {
    esAdmin = true;
    document.getElementById("admin-panel").style.display = "block";
  }

  showScreen("waiting");
});

/* =========================
   CONTADOR
========================= */
socket.on("actualizarLista", (n) => {
  document.getElementById("count").innerText = n;
});

/* =========================
   BOTONES ADMIN
========================= */
document.getElementById("btn-iniciar").onclick = () => {
  socket.emit("iniciarRonda");
  document.getElementById("btn-debate").style.display = "block";
};

document.getElementById("btn-debate").onclick = () => {
  socket.emit("empezarDebateOficial");
};

/* =========================
   ROLES
========================= */
socket.on("recibirRol", (data) => {
  showScreen("turnScreen");
  if (data.rol === "IMPOSTOR") {
    document.getElementById("currentSpeakerName").innerText =
      "ERES EL IMPOSTOR";
  } else {
    document.getElementById("currentSpeakerName").innerText =
      "TU FRASE ES: " + data.palabra;
  }
});

/* =========================
   TURNOS
========================= */
socket.on("cambioDeTurno", (data) => {
  showScreen("turnScreen");
  document.getElementById("currentSpeakerName").innerText = data.nombre;

  document.getElementById("btnFinalizarTurno").style.display =
    socket.id === data.idSocket ? "block" : "none";
});

document.getElementById("btnFinalizarTurno").onclick = () => {
  socket.emit("finalizarMiTurno");
};

/* =========================
   VOTACIÓN
========================= */
socket.on("faseVotacion", (jugadores) => {
  showScreen("end");
  const lista = document.getElementById("lista-votacion");
  lista.innerHTML = "";

  if (esAdmin) {
    lista.innerText = "Votación en curso...";
    return;
  }

  jugadores.forEach(j => {
    if (j.id !== socket.id) {
      const b = document.createElement("button");
      b.className = "btn-big";
      b.innerText = j.nombre;
      b.onclick = () => {
        socket.emit("votarJugador", j.id);
        lista.innerHTML = "Voto enviado";
      };
      lista.appendChild(b);
    }
  });
});

/* =========================
   RESULTADO
========================= */
socket.on("resultadoVotacion", (res) => {
  showScreen("result");
  document.getElementById("texto-res").innerText = res.mensaje || "Resultado";

  if (res.palabraReal) {
    document.getElementById("texto-palabra").innerText =
      "La frase era: " + res.palabraReal;
  }

  if (esAdmin) {
    document.getElementById("btn-reiniciar").style.display = "block";
  }
});

document.getElementById("btn-reiniciar").onclick = () => {
  socket.emit("iniciarRonda");
};

/* =========================
   UTILIDAD
========================= */
function showScreen(id) {
  document.querySelectorAll(".screen")
    .forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}












