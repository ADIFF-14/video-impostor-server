const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const palabras = ["Pan","Ciudad","Avión","Playa","Hospital"];

let palabraGlobal = null;

io.on("connection", (socket) => {

  socket.on("join", () => {
    if (!palabraGlobal) {
      palabraGlobal = palabras[Math.floor(Math.random() * palabras.length)];
    }

    socket.emit("palabra", palabraGlobal);
  });

  socket.on("reset", () => {
    palabraGlobal = null;
  });
});

app.get("/", (req, res) => {
  res.send("Servidor OK");
});

server.listen(process.env.PORT || 3000);
