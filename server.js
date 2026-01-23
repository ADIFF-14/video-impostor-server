const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let jugadores = [];
let orden = [];
let turno = 0;

let palabra = "";
let votos = {};
let ronda = 1;
let impostorId = null;

const palabras = [
  "Adán y Eva","El jardín del Edén","El árbol del conocimiento","La serpiente",
  "El arca de Noé","El diluvio","El Mar Rojo","El maná del cielo",
  "David y Goliat","El rey Salomón","El horno de fuego","Daniel y los leones",
  "La estatua de oro","Jesús","Dios","La cruz","Sábado","María",
  "El Espíritu Santo","La paloma","La roca","El pan","La lámpara",
  "Libro","Biblia","Sal","Aceite","Monte","Mar"
];

function mezclar(a) {
  return a.sort(() => Math.random() - 0.5);
}

io.on("connection", socket => {

  socket.on("unirse", ({ nombre }) => {
    const n = nombre.toLowerCase().trim();

    if (n === "proyector") {
      socket.join("sala_proyeccion");
      socket.emit("vistas", "PROYECTOR");
      io.to("sala_proyeccion").emit("listaInicialProyeccion", jugadores);
      return;
    }

    if (n === "anderson") {
      socket.join("sala_admin");
      socket.emit("vistas", "ADMIN");
      return;
    }

    jugadores.push({ id: socket.id, nombre, eliminado: false, rol: "" });
    socket.emit("vistas", "JUGADOR");
    io.emit("actualizarLista", jugadores.length);
    io.to("sala_proyeccion").emit("listaInicialProyeccion", jugadores);
  });

  socket.on("iniciarRonda", () => {
    if (jugadores.length < 3) return;

    ronda = 1;
    votos = {};
    turno = 0;

    jugadores.forEach(j => {
      j.eliminado = false;
      j.rol = "CIUDADANO";
    });

    palabra = palabras[Math.floor(Math.random() * palabras.length)];
    const imp = jugadores[Math.floor(Math.random() * jugadores.length)];
    imp.rol = "IMPOSTOR";
    impostorId = imp.id;

    jugadores.forEach(j => {
      if (j.rol === "IMPOSTOR") {
        io.to(j.id).emit("recibirRol", { rol: "IMPOSTOR" });
      } else {
        io.to(j.id).emit("recibirRol", { rol: "CIUDADANO", palabra });
      }
    });

    io.to("sala_proyeccion").emit("pantallaEstado", "JUEGO_INICIADO");
  });

  socket.on("empezarDebateOficial", () => {
    orden = mezclar(jugadores.filter(j => !j.eliminado));
    turno = 0;
    siguiente();
  });

  socket.on("finalizarMiTurno", () => {
    turno++;
    siguiente();
  });

  function siguiente() {
    if (turno < orden.length) {
      const j = orden[turno];
      io.emit("cambioDeTurno", { nombre: j.nombre, idSocket: j.id });
      io.to("sala_proyeccion").emit("turnoEnPantalla", j.nombre);
    } else {
      io.emit("faseVotacion", jugadores.filter(j => !j.eliminado));
      io.to("sala_proyeccion").emit("pantallaEstado", "VOTACION_ABIERTA");
    }
  }

  socket.on("votarJugador", id => {
    if (!jugadores.find(j => j.id === socket.id)) return;
    if (!votos[id]) votos[id] = [];
    if (votos[id].includes(socket.id)) return;

    votos[id].push(socket.id);

    const conteo = {};
    Object.keys(votos).forEach(k => conteo[k] = votos[k].length);
    io.to("sala_proyeccion").emit("actualizarVotosProyeccion", conteo);

    if (Object.values(votos).flat().length >= jugadores.length) finalizar();
  });

  function finalizar() {
    let max = 0, expId = null;
    for (let id in votos) {
      if (votos[id].length > max) {
        max = votos[id].length;
        expId = id;
      }
    }

    const expulsado = jugadores.find(j => j.id === expId);

    if (expulsado && expulsado.id === impostorId) {
      io.to("sala_proyeccion").emit("resultadoFinalProyeccion", {
        expulsado: expulsado.nombre,
        esImpostor: true
      });
      io.emit("finPartida");
      return;
    }

    if (ronda === 1) {
      ronda = 2;
      votos = {};
      setTimeout(() => {
        io.to("sala_proyeccion").emit("pantallaEstado", "JUEGO_INICIADO");
      }, 8000);
      return;
    }

    const imp = jugadores.find(j => j.id === impostorId);
    io.to("sala_proyeccion").emit("resultadoFinalProyeccion", {
      expulsado: imp ? imp.nombre : "El impostor",
      esImpostor: false
    });
    io.emit("finPartida");
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Servidor activo en puerto", PORT);
});

