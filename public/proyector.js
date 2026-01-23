const socket = io();
socket.emit("unirse", { nombre: "proyector" });

const grid = document.getElementById("grid");
const main = document.getElementById("main");
const overlay = document.getElementById("overlay");
const texto = document.getElementById("resultado");

socket.on("listaJugadores", jugadores => {
  grid.innerHTML = "";
  jugadores.forEach(j => {
    const d = document.createElement("div");
    d.id = j.id;
    d.className = "card";
    d.innerHTML = `<h2>${j.nombre}</h2><h1 id="v-${j.id}">0</h1>`;
    grid.appendChild(d);
  });
});

socket.on("turnoPantalla", nombre => {
  main.innerText = nombre;
});

socket.on("conteoVotos", votos => {
  for (let id in votos) {
    const el = document.getElementById("v-" + id);
    if (el) el.innerText = votos[id];
  }
});

socket.on("resultado", data => {
  overlay.style.display = "flex";

  if (data.esImpostor) {
    texto.innerText = `🔥 TE ATRAPAMOS 🔥\n${data.nombre}\nERAS EL IMPOSTOR`;
  } else {
    texto.innerText = `✅ INOCENTE\n${data.nombre}\nNO ERAS EL IMPOSTOR`;
  }
});


