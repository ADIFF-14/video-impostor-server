const socket = io();
let esAdmin = false;

function entrarJuego() {
  const nombre = document.getElementById("userName").value.trim();
  if (!nombre) return alert("Escribe tu nombre");
  socket.emit("unirse", { nombre });
}

function iniciarPartida() {
  socket.emit("iniciarPartida");
}

function iniciarDebate() {
  socket.emit("iniciarDebate");
}

function terminarTurno() {
  socket.emit("terminarTurno");
}

socket.on("vista", tipo => {
  if (tipo === "ADMIN") {
    esAdmin = true;
    document.getElementById("admin-panel").style.display = "block";
  }
  mostrar("waiting");
});

socket.on("contador", n => {
  document.getElementById("count").innerText = n;
});

socket.on("rol", d => {
  mostrar("role");
  if (d.tipo === "IMPOSTOR") {
    roleTitle.innerText = "ERES EL IMPOSTOR";
    roleText.innerText = "Descubre la palabra";
  } else {
    roleTitle.innerText = "TU PALABRA ES:";
    roleText.innerText = d.palabra;
  }
});

socket.on("turno", d => {
  mostrar("turnScreen");
  currentSpeakerName.innerText = d.nombre;
  btnFinalizarTurno.style.display =
    socket.id === d.id ? "block" : "none";
});

socket.on("votarFase", jugadores => {
  mostrar("end");
  lista-votacion.innerHTML = "";

  if (esAdmin) {
    lista-votacion.innerText = "Votación en curso...";
    return;
  }

  jugadores.forEach(j => {
    if (j.id !== socket.id) {
      const b = document.createElement("button");
      b.className = "btn-big";
      b.innerText = j.nombre;
      b.onclick = () => {
        socket.emit("votar", j.id);
        lista-votacion.innerHTML = "Voto enviado";
      };
      lista-votacion.appendChild(b);
    }
  });
});

function mostrar(id) {
  document.querySelectorAll(".screen")
    .forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}












