const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let jugadores = [];
let adminId = null;
let proyectorId = null;

let palabra = "";
let impostorId = null;
let votos = {};
let orden = [];
let turno = 0;

const palabras = [
  "Biblia","Oración","Fe","Iglesia","Amor","Servicio","Jesús","Esperanza"
];

function mezclar(a) {
  return a.sort(() => Math.random() - 0.5);
}

io.on("connection", (socket) => {

  socket.on("unirse", ({ nombre }) => {
    const n = nombre.toLowerCase().trim();

    // PROYECTOR
    if (n === "proyector") {
      proyectorId = socket.id;
      socket.emit("vista", "PROYECTOR");
      socket.emit("listaJugadores", jugadores);
      return;
    }

    // ADMIN
    if (n === "anderson") {
      adminId = socket.id;
      socket.emit("vista", "ADMIN");
      return;
    }

    // JUGADOR NORMAL
    jugadores.push({
      id: socket.id,
      nombre,
      eliminado: false
    });

    io.emit("contador", jugadores.length);
    io.to(proyectorId).emit("listaJugadores", jugadores);
    socket.emit("vista", "JUGADOR");
  });

  /* =====================
     ADMIN – INICIAR PARTIDA
  ===================== */
  socket.on("iniciarPartida", () => {
    if (socket.id !== adminId) return;
    if (jugadores.length < 3) return;

    votos = {};
    jugadores.forEach(j => j.eliminado = false);

    palabra = palabras[Math.floor(Math.random() * palabras.length)];
    const imp = jugadores[Math.floor(Math.random() * jugadores.length)];
    impostorId = imp.id;

    jugadores.forEach(j => {
      if (j.id === impostorId) {
        io.to(j.id).emit("rol", { tipo: "IMPOSTOR" });
      } else {
        io.to(j.id).emit("rol", { tipo: "CIUDADANO", palabra });
      }
    });

    io.to(adminId).emit("secreto", {
      impostor: imp.nombre,
      palabra
    });

    io.to(proyectorId).emit("estado", "INICIO");
  });

  /* =====================
     ADMIN – INICIAR DEBATE
  ===================== */
  socket.on("iniciarDebate", () => {
    if (socket.id !== adminId) return;

    orden = mezclar(jugadores.filter(j => !j.eliminado));
    turno = 0;
    siguienteTurno();
  });

  socket.on("terminarTurno", () => {
    turno++;
    siguienteTurno();
  });

  function siguienteTurno() {
    if (turno < orden.length) {
      const j = orden[turno];
      io.emit("turno", { nombre: j.nombre, id: j.id });
      io.to(proyectorId).emit("turnoPantalla", j.nombre);
    } else {
      io.emit("votarFase", jugadores.filter(j => !j.eliminado));
      io.to(proyectorId).emit("estado", "VOTACION");
    }
  }

  /* =====================
     VOTACIÓN (SOLO JUGADORES)
  ===================== */
  socket.on("votar", (idVotado) => {
    const esJugador = jugadores.find(j => j.id === socket.id);
    if (!esJugador) return;              // ⛔ admin/proyector no votan
    if (votos[socket.id]) return;        // ⛔ doble voto

    votos[socket.id] = idVotado;

    const conteo = {};
    Object.values(votos).forEach(id => {
      conteo[id] = (conteo[id] || 0) + 1;
    });

    io.to(proyectorId).emit("conteoVotos", conteo);

    if (Object.keys(votos).length === jugadores.filter(j => !j.eliminado).length) {
      finalizarVotacion(conteo);
    }
  });

  function finalizarVotacion(conteo) {
    let max = 0;
    let expulsadoId = null;

    for (let id in conteo) {
      if (conteo[id] > max) {
        max = conteo[id];
        expulsadoId = id;
      }
    }

    const expulsado = jugadores.find(j => j.id === expulsadoId);
    if (expulsado) expulsado.eliminado = true;

    const esImpostor = expulsadoId === impostorId;

    io.to(proyectorId).emit("resultado", {
      nombre: expulsado.nombre,
      esImpostor,
      palabra
    });
  }

  socket.on("disconnect", () => {
    jugadores = jugadores.filter(j => j.id !== socket.id);
    io.emit("contador", jugadores.length);
    io.to(proyectorId).emit("listaJugadores", jugadores);
  });
});

server.listen(3000, () => {
  console.log("Servidor listo en puerto 3000");
});


