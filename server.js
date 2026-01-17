const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

const palabras = [
  "Avión","Playa","Hospital","Escuela","Restaurante",
  "Banco","Iglesia","Hotel","Cine","Parque",
  "Carro","Autobús","Bicicleta","Barco","Tren",
  "Celular","Computadora","Televisión","Cámara",
  "Pizza","Hamburguesa","Arroz","Pollo",
  "Fútbol","Baloncesto","Béisbol",
  "Fiesta","Viaje","Vacaciones"
];

// ESTADO GLOBAL (CLAVE)
let estado = {
  palabra: null,
  impostorId: null,
  rondaActiva: false
};

io.on("connection", (socket) => {
  console.log("Jugador conectado:", socket.id);

  socket.on("join-game", () => {
    // Si no hay ronda, se crea UNA SOLA VEZ
    if (!estado.rondaActiva) {
      estado.palabra =
        palabras[Math.floor(Math.random() * palabras.length)];
      estado.impostorId = socket.id;
      estado.rondaActiva = true;

      console.log("NUEVA RONDA");
      console.log("Palabra:", estado.palabra);
      console.log("Impostor:", estado.impostorId);
    }

    const rol =
      socket.id === estado.impostorId ? "IMPOSTOR" : "CIUDADANO";

    socket.emit("role", {
      rol,
      palabra: rol === "CIUDADANO" ? estado.palabra : null
    });
  });

  socket.on("reset-round", () => {
    estado = {
      palabra: null,
      impostorId: null,
      rondaActiva: false
    };
    console.log("Ronda reiniciada");
  });

  socket.on("disconnect", () => {
    console.log("Jugador desconectado:", socket.id);
  });
});

app.get("/", (req, res) => {
  res.send("Servidor VideoImpostor funcionando ✅");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Servidor escuchando en puerto", PORT);
});
