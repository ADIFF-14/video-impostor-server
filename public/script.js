const socket = io();
let esAdmin = false;

function entrar() {
  const n = userName.value.trim();
  if (n) socket.emit("unirse", { nombre: n });
}

socket.on("vistas", tipo => {
  if (tipo === "ADMIN") {
    esAdmin = true;
    document.getElementById("admin-panel").style.display = "block";
  }
  show("waiting");
});

socket.on("actualizarLista", n => {
  count.innerText = n;
});

socket.on("cambioDeTurno", d => {
  show("turnScreen");
  hablando.innerText = d.nombre;
  finTurno.style.display = socket.id === d.idSocket ? "block" : "none";
});

socket.on("faseVotacion", jugadores => {
  show("end");
  end.innerHTML = esAdmin ? "VOTACIÓN…" : jugadores
    .filter(j => j.id !== socket.id)
    .map(j => `<button onclick="socket.emit('votarJugador','${j.id}')">${j.nombre}</button>`)
    .join("");
});

socket.on("finPartida", () => show("result"));

function show(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}










