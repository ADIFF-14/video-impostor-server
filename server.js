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

let palabraActual = null;
let votosRecibidos = {};
let rondaActual = 1;
let impostorId = null;

/* =========================
   FRASES (ÚNICAS, SIN REPETIR)
========================= */
let frasesDisponibles = [
  "Biblia",
  "Cielo",
  "Mar Rojo",
  "Goliat",
  "Pesebre",
  "Judas",
  "Zaqueo",
  "Jonás",
  "Ángeles",
  "Jesús",
  "Daniel",
  "Los 3 Jóvenes Hebreos",
  "El Arca de Noé",
  "El Jardín del Edén",
  "La Torre de Babel",
  "Multiplicación de Panes",
  "El Maná",
  "Los Diez Mandamientos",
  "El Día de Pentecostés",
  "El Río Jordán",
  "El Árbol de la Vida",
  "El Mar de Cristal",
  "La Nueva Jerusalén",
  "El Joven Rico"
];

function obtenerFrase() {
  if (frasesDisponibles.length === 0) return "Biblia";
  const index = Math.floor(Math.random() * frasesDisponibles.length);
  return frasesDisponibles.splice(index, 1)[0];
}

function mezclar(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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
     INICIAR PARTIDA
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

    palabraActual = obtenerFrase();

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
     DEBATE
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
      io.emit("cambioDeTurno", { nombre: j.nombre, idSocket: j.id });
      io.to("sala_proyeccion").emit("turnoEnPantalla", j.nombre);
    } else {
      io.emit("faseVotacion", jugadores.filter(j => !j.eliminado));
      io.to("sala_proyeccion").emit("pantallaEstado", "VOTACION_ABIERTA");
    }
  }

  /* =========================
     VOTACIÓN
  ========================= */
  socket.on("votarJugador", (idVotado) => {
    const votante = jugadores.find(j => j.id === socket.id);
    if (!votante || votante.eliminado) return;

    if (!votosRecibidos[idVotado]) votosRecibidos[idVotado] = [];
    if (votosRecibidos[idVotado].includes(socket.id)) return;

    votosRecibidos[idVotado].push(socket.id);

    const conteo = {};
    Object.keys(votosRecibidos).forEach(
      id => conteo[id] = votosRecibidos[id].length
    );

    io.to("sala_proyeccion").emit("actualizarVotosProyeccion", conteo);

    const totalVotos = Object.values(votosRecibidos).flat().length;
    const votantesActivos = jugadores.filter(j => !j.eliminado).length;

    if (totalVotos >= votantesActivos) {
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
    if (expulsado) expulsado.eliminado = true;

    // 🔥 ATRAPARON AL IMPOSTOR
    if (expulsado && expulsado.id === impostorId) {
      io.to("sala_proyeccion").emit("resultadoFinalProyeccion", {
        expulsado: expulsado.nombre,
        esImpostor: true
      });

      setTimeout(() => {
        io.emit("resetJuego");
      }, 9000);
      return;
    }

    // ❌ ERA INOCENTE → PASA A RONDA 2
    if (rondaActual === 1) {
      rondaActual = 2;
      votosRecibidos = {};

      io.to("sala_proyeccion").emit("resultadoFinalProyeccion", {
        expulsado: expulsado.nombre,
        esImpostor: false
      });

      setTimeout(() => {
        io.to("sala_proyeccion").emit("pantallaEstado", "JUEGO_INICIADO");
      }, 10000);
      return;
    }

    // 🕵️ IMPOSTOR GANA
    const imp = jugadores.find(j => j.id === impostorId);
    io.to("sala_proyeccion").emit("resultadoFinalProyeccion", {
      expulsado: imp ? imp.nombre : "Impostor",
      esImpostor: false,
      frase: palabraActual
    });

    setTimeout(() => {
      io.emit("resetJuego");
    }, 9000);
  }

  socket.on("resetJuego", () => {
    jugadores.forEach(j => {
      j.eliminado = false;
      j.rol = "";
    });
    votosRecibidos = {};
    rondaActual = 1;
  });

  socket.on("disconnect", () => {
    jugadores = jugadores.filter(j => j.id !== socket.id);
    io.emit("actualizarLista", jugadores.length);
    io.to("sala_proyeccion").emit("listaInicialProyeccion", jugadores);
  });
});

/* =========================
   PUERTO
========================= */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Servidor listo en puerto", PORT);
});
