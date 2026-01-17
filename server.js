const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.get("/", (req, res) => {
  res.send("Servidor VideoImpostor funcionando ✅");
});

io.on("connection", (socket) => {
  console.log("Jugador conectado:", socket.id);

  socket.on("disconnect", () => {
    console.log("Jugador desconectado:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Servidor escuchando en puerto", PORT);
});
