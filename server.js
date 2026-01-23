const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let jugadores = [];
let ordenHablar = [];
let indiceTurno = 0;

let palabraActual = "";
let votosRecibidos = {};
let rondaActual = 1;
let impostorId = null;

/* =========================
   FRASES BÍBLICAS
========================= */
const palabras = [
  "Adán y Eva",
  "El jardín del Edén",
  "El árbol del conocimiento",
  "La serpiente",
  "El arca de Noé",
  "El diluvio",
  "El Mar Rojo",
  "El maná del cielo",
  "David y Goliat",
  "El rey Salomón",
  "El horno de fuego",
  "Daniel y los leones",
  "La estatua de oro",
  "Jesús",
  "Dios",
  "La cruz",
  "Sábado",
  "María",
  "El Espíritu Santo",
  "La paloma",
  "La roca",
  "El pan",
  "La lámpara",
  "Libro",
  "Biblia",
  "Sal",
  "Aceite",
  "Monte",
  "Mar"
];

function mezclar(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

io.on("connection", (socket) => {

  /* =========================
     UNIRSE
  ========================= */
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

    jugadores.push({
      id: socket.id,
      nombre,
      eliminado: false,
      rol: ""
    });

    socket.emit("vistas", "JUGADOR");
    io.emit("actualizarLista", jugadores.length);
    io.to("sala_proyeccion").emit("listaInicialProyeccion", jugadores);
  });

  /* =========================
     INICIAR PARTIDA (RONDA 1)
  ========================= */
  socket.on("iniciarRonda", () => {
    if (jugadores.length < 3) return;

    rondaActual = 1;
    votosRecibidos = {};
    indiceTurno = 0;

    jugadores.forEach(j => {
      j.eliminado = false;
      j.rol = "CIUDADANO";
    });

    palabraActual = palabras[Math.floor(Math.random() * palabras.length)];
    const impIndex = Math.floor(Math.random() * jugadores.length);
    jugadores[impIndex].rol = "IMPOSTOR";
    impostorId = jugadores[impIndex].id;

    jugadores.forEach(j => {
      if (j.rol === "IMPOSTOR") {
        io.to(j.id).emit("recibirRol", { rol: "IMPOSTOR" });
      } else {
        io.to(j.id).emit("recibirRol", {
          rol: "CIUDADANO",
          palabra: palabraActual
        });
      }
    });

    io.to("sala_proyeccion").emit("pantallaEstado", "JUEGO_INICIADO");
  });

  /* =========================
     INICIAR DEBATE
  ========================= */
  socket.on("empezarDebateOficial", () => {
    indiceTurno = 0;
    ordenHablar = mezclar(jugadores.filter(j => !j.eliminado));
    notificarTurno();
  });

  socket.on("finalizarMiTurno", () => {
    indiceTurno++;
    notificarTurno();
  });

  function notificarTurno() {
    if (indiceTurno < ordenHablar.length) {
      const j = ordenHablar[indiceTurno];
      io.emit("cambioDeTurno", {
        nombre: j.nombre,
        idSocket: j.id
      });
      io.to("sala_proyeccion").emit("turnoEnPantalla", j.nombre);
    } else {
      io.emit("faseVotacion", jugadores.filter(j => !j.eliminado));
      io.to("sala_proyeccion").emit("pantallaEstado", "VOTACION_ABIERTA");
    }
  }

  /* =========================
     VOTAR
  ========================= */
  socket.on("votarJugador", (idVotado) => {
    if (!jugadores.find(j => j.id === socket.id)) return;

    if (!votosRecibidos[idVotado]) votosRecibidos[idVotado] = [];
    if (votosRecibidos[idVotado].includes(socket.id)) return;

    votosRecibidos[idVotado].push(socket.id);

    const conteo = {};
    Object.keys(votosRecibidos).forEach(
      id => conteo[id] = votosRecibidos[id].length
    );

    io.to("sala_proyeccion").emit("actualizarVotosProyeccion", conteo);

    const totalVotos = Object.values(votosRecibidos).flat().length;
    if (totalVotos >= jugadores.length) {
      procesarVotacion();
    }
  });

  function procesarVotacion() {
    let max = 0;
    let expulsadoId = null;

    for (let id in votosRecibidos) {
      if (votosRecibidos[id].length > max) {
        max = votosRecibidos[id].length;
        expulsadoId = id;
      }
    }

    const expulsado = jugadores.find(j => j.id === expulsadoId);

    /* 🔥 ATRAPARON AL IMPOSTOR */
    if (expulsado && expulsado.id === impostorId) {
      io.to("sala_proyeccion").emit("resultadoFinalProyeccion", {
        expulsado: expulsado.nombre,
        esImpostor: true
      });
      return;
    }

    /* ❌ NO LO ATRAPARON */
    if (rondaActual === 1) {
      rondaActual = 2;
      votosRecibidos = {};

      setTimeout(() => {
        io.to("sala_proyeccion").emit("pantallaEstado", "JUEGO_INICIADO");
      }, 8000);
      return;
    }

    /* 🏆 IMPOSTOR GANA */
    const imp = jugadores.find(j => j.id === impostorId);
    io.to("sala_proyeccion").emit("resultadoFinalProyeccion", {
      expulsado: imp ? imp.nombre : "El impostor",
      esImpostor: false,
      ganador: "IMPOSTOR"
    });
  }

  socket.on("disconnect", () => {
    jugadores = jugadores.filter(j => j.id !== socket.id);
    io.emit("actualizarLista", jugadores.length);
    io.to("sala_proyeccion").emit("listaInicialProyeccion", jugadores);
  });
});

/* =========================
   PUERTO (PRODUCCIÓN OK)
========================= */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Servidor corriendo en puerto", PORT);
});


