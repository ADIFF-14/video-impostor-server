const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// CRÍTICO: servir frontend
app.use(express.static("public"));

let jugadores = [];

io.on("connection", (socket) => {
  console.log("🟢 Conectado:", socket.id);

  // ENTRAR
  socket.on("unirse", ({ nombre }) => {
    if (!nombre) return;

    const limpio = nombre.toLowerCase().trim();

    // ADMIN
    if (limpio === "anderson") {
      socket.emit("vistas", "ADMIN");
      console.log("🛠️ Admin conectado");
      return;
    }

    // JUGADOR
    jugadores.push({ id: socket.id, nombre });
    socket.emit("vistas", "JUGADOR");
    io.emit("actualizarLista", jugadores.length);

    console.log("👤 Jugador:", nombre);
  });

  // INICIAR PARTIDA
  socket.on("iniciarRonda", () => {
    console.log("🎮 Partida iniciada");
    io.emit("estado", "PARTIDA_INICIADA");
  });

  // INICIAR DEBATE
  socket.on("empezarDebate", () => {
    console.log("🎙️ Debate iniciado");
    io.emit("estado", "DEBATE_INICIADO");
  });

  socket.on("disconnect", () => {
    jugadores = jugadores.filter(j => j.id !== socket.id);
    io.emit("actualizarLista", jugadores.length);
    console.log("🔴 Desconectado:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("🚀 Servidor corriendo en puerto", PORT);
});



