const socket = io();

// ELEMENTOS
const btnEntrar = document.getElementById("btnEntrar");
const btnIniciar = document.getElementById("btnIniciar");
const btnDebate = document.getElementById("btnDebate");

const inputName = document.getElementById("userName");
const screenWelcome = document.getElementById("welcome");
const screenWaiting = document.getElementById("waiting");

const countSpan = document.getElementById("count");
const estadoP = document.getElementById("estado");

// ENTRAR
btnEntrar.addEventListener("click", () => {
  const nombre = inputName.value.trim();
  if (!nombre) return alert("Escribe tu nombre");
  console.log("➡️ ENTRANDO:", nombre);
  socket.emit("unirse", { nombre });
});

// RESPUESTA DEL SERVER
socket.on("vistas", (tipo) => {
  screenWelcome.classList.remove("active");
  screenWaiting.classList.add("active");

  if (tipo === "ADMIN") {
    btnIniciar.style.display = "block";
    btnDebate.style.display = "block";
  }
});

// CONTADOR
socket.on("actualizarLista", (n) => {
  countSpan.innerText = n;
});

// BOTONES ADMIN
btnIniciar.addEventListener("click", () => {
  socket.emit("iniciarRonda");
});

btnDebate.addEventListener("click", () => {
  socket.emit("empezarDebate");
});

// ESTADO GENERAL
socket.on("estado", (msg) => {
  estadoP.innerText = msg;
});
















