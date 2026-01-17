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

let estadoJuego = {
  palabra: null,
  impostorId: null
};

io.on("connection", (socket) => {
  console.log("Jugador conectado:", socket.id);

  socket.on("join-game", () => {
    if (!estadoJuego.palabra) {
      estadoJuego.palabra =
        palabras[Math.floor(Math.random() * palabras.length)];

      estadoJuego.impostorId = socket.id;

      console.log("Palabra:", estadoJuego.palabra);
      console.log("Impostor:", estadoJuego.impostorId);
    }

    const rol =
      socket.id === estadoJuego.impostorId
        ? "IMPOSTOR"
        : "CIUDADANO";

    socket.emit("role", {
      rol,
      palabra: rol === "CIUDADANO" ? estadoJuego.palabra : null
    });
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
