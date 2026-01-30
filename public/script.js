const socket = io();

/* =========================
   ENTRAR (BLINDADO)
========================= */
const btn = document.getElementById("btnEntrar");
const input = document.getElementById("userName");

btn.addEventListener("click", () => {
  if (!input) {
    alert("Input no encontrado");
    return;
  }

  const nombre = input.value.trim();
  if (!nombre) {
    alert("Escribe tu nombre");
    return;
  }

  console.log("ENTRANDO COMO:", nombre);
  socket.emit("unirse", { nombre });
});

/* =========================
   RESPUESTA DEL SERVIDOR
========================= */
socket.on("vistas", () => {
  document.getElementById("welcome").classList.remove("active");
  document.getElementById("waiting").classList.add("active");
});

socket.on("actualizarLista", (n) => {
  document.getElementById("count").innerText = n;
});













