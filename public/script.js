const socket = io();

/* FUNCIÓN ULTRA SIMPLE */
function entrar() {
  const input = document.getElementById("userName");

  if (!input) {
    alert("NO EXISTE EL INPUT");
    return;
  }

  const nombre = input.value.trim();

  if (nombre === "") {
    alert("ESCRIBE TU NOMBRE");
    return;
  }

  console.log("ENTRANDO COMO:", nombre);
  socket.emit("unirse", { nombre });
}

/* RESPUESTA DEL SERVIDOR */
socket.on("vista", () => {
  document.getElementById("welcome").classList.remove("active");
  document.getElementById("waiting").classList.add("active");
});

/* CONTADOR */
socket.on("contador", n => {
  document.getElementById("count").innerText = n;
});











