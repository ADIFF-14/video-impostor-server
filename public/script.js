const socket = io();

const btnEntrar = document.getElementById("btnEntrar");
const btnIniciar = document.getElementById("btnIniciar");
const btnDebate = document.getElementById("btnDebate");

btnEntrar.onclick = () => {
  const nombre = document.getElementById("name").value.trim();
  if (!nombre) return alert("Escribe tu nombre");
  socket.emit("unirse", { nombre });
};

socket.on("vistas", (tipo) => {
  document.getElementById("welcome").style.display = "none";
  document.getElementById("waiting").style.display = "block";

  // SOLO ADMIN
  if (tipo === "ADMIN") {
    btnIniciar.style.display = "block";
    btnDebate.style.display = "block";
  }
});

socket.on("actualizarLista", (n) => {
  document.getElementById("count").innerText = n;
});

/* ======================
   BOTONES ADMIN
====================== */
btnIniciar.onclick = () => {
  socket.emit("iniciarRonda");
};

btnDebate.onclick = () => {
  socket.emit("empezarDebate");
};

















