const socket = io();
socket.emit("unirse", { nombre: "proyector" });

let jugadores = [];

/* =========================
   LISTA DE JUGADORES
========================= */
socket.on("listaInicialProyeccion", (lista) => {
  jugadores = lista;
  renderGrid({});
});

/* =========================
   ESTADOS DE PANTALLA
========================= */
socket.on("pantallaEstado", (estado) => {
  if (estado === "JUEGO_INICIADO") {
    document.getElementById("header").innerText = "ATENCIÓN";
    document.getElementById("main").innerText = "LEAN SU FRASE";
    document.getElementById("grid").innerHTML = "";
  }

  if (estado === "VOTACION_ABIERTA") {
    document.getElementById("header").innerText = "VOTACIÓN";
    document.getElementById("main").innerText = "ELIJA AL IMPOSTOR";
    renderGrid({});
  }
});

/* =========================
   TURNO DE HABLA
========================= */
socket.on("turnoEnPantalla", (nombre) => {
  document.getElementById("header").innerText = "TURNO DE";
  document.getElementById("main").innerText = nombre;
});

/* =========================
   ACTUALIZAR VOTOS
========================= */
socket.on("actualizarVotosProyeccion", (votos) => {
  renderGrid(votos);
});

/* =========================
   RESULTADO FINAL
========================= */
socket.on("resultadoFinalProyeccion", (data) => {
  const overlay = document.getElementById("overlay");
  overlay.style.display = "flex";

  if (data.esImpostor) {
    document.getElementById("final-title").innerText = "🔥 TE ATRAPAMOS 🔥";
    document.getElementById("final-sub").innerText =
      `${data.expulsado} ERA EL IMPOSTOR`;
  } else {
    document.getElementById("final-title").innerText = "✅ INOCENTE";
    document.getElementById("final-sub").innerText =
      `${data.expulsado} NO ERA EL IMPOSTOR`;
  }
});

/* =========================
   RENDER GRID
========================= */
function renderGrid(votos) {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  jugadores.forEach((j) => {
    if (!j.eliminado) {
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
        <div class="name">${j.nombre}</div>
        <div class="votes">${votos[j.id] || 0}</div>
      `;
      grid.appendChild(div);
    }
  });
}



