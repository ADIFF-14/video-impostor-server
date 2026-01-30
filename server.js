const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// SERVIR FRONTEND
app.use(express.static("public"));

/* =========================
   ESTADO DEL JUEGO
========================= */
let jugadores = [];
let palabraActual = null;
let impostorId = null;

let ronda = 1;
let votos = {};
let enVotacion = false;

/* =========================
   FRASES
========================= */
const frases = [
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
  return frases[Math.floor(Math.random() * frases.length)];
}

/* =========================
   SOCKETS
========================= */
io.on("connection", (socket) => {
  console.log("🟢 Conectado:", socket.id);

  /* ----------- ENTRAR ----------- */
  socket.on("unirse", ({ nombre }) => {
    if (!nombre) return;

    const limpio = nombre.toLowerCase().trim();

    if (limpio === "proyector") {
      socket.join("sala_proyeccion");
      socket.emit("vistas", "PROYECTOR");
      socket.emit("listaInicialProyeccion", jugadores);
      return;
    }

    if (limpio === "anderson") {
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

  /* ----------- INICIAR PARTIDA ----------- */
  socket.on("iniciarRonda", () => {
    if (jugadores.length < 3) return;

    ronda = 1;
    votos = {};
    enVotacion = false;

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

    // Después de 15s se abre votación
    setTimeout(() => abrirVotacion(), 15000);
  });

  /* ----------- VOTAR ----------- */
  socket.on("votarJugador", (idVotado) => {
    if (!enVotacion) return;

    const votante = jugadores.find(j => j.id === socket.id);
    if (!votante || votante.eliminado) return;

    if (!votos[idVotado]) votos[idVotado] = [];
    if (votos[idVotado].includes(socket.id)) return;

    votos[idVotado].push(socket.id);

    const totalVotos = Object.values(votos).flat().length;
    const activos = jugadores.filter(j => !j.eliminado).length;

    io.to("sala_proyeccion").emit(
      "actualizarVotosProyeccion",
      Object.fromEntries(
        Object.entries(votos).map(([k, v]) => [k, v.length])
      )
    );

    if (totalVotos >= activos) {
      cerrarVotacion();
    }
  });

  /* ----------- DESCONECTAR ----------- */
  socket.on("disconnect", () => {
    jugadores = jugadores.filter(j => j.id !== socket.id);
    io.emit("actualizarLista", jugadores.length);
    io.to("sala_proyeccion").emit("listaInicialProyeccion", jugadores);
  });
});

/* =========================
   FUNCIONES DE JUEGO
========================= */
function abrirVotacion() {
  enVotacion = true;
  votos = {};

  io.emit(
    "faseVotacion",
    jugadores.filter(j => !j.eliminado)
  );
  io.to("sala_proyeccion").emit("pantallaEstado", "VOTACION_ABIERTA");
}

function cerrarVotacion() {
  enVotacion = false;

  let expulsadoId = null;
  let max = 0;

  for (const id in votos) {
    if (votos[id].length > max) {
      max = votos[id].length;
      expulsadoId = id;
    }
  }

  const expulsado = jugadores.find(j => j.id === expulsadoId);
  if (expulsado) expulsado.eliminado = true;

  // ATRAPARON IMPOSTOR
  if (expulsadoId === impostorId) {
    io.to("sala_proyeccion").emit("resultadoFinalProyeccion", {
      expulsado: expulsado.nombre,
      esImpostor: true
    });
    return;
  }

  // RONDA 1 → RONDA 2
  if (ronda === 1) {
    ronda = 2;

    io.to("sala_proyeccion").emit("resultadoFinalProyeccion", {
      expulsado: expulsado.nombre,
      esImpostor: false
    });

    setTimeout(() => {
      abrirVotacion();
    }, 10000);

    return;
  }

  // RONDA 2 → GANA IMPOSTOR
  const imp = jugadores.find(j => j.id === impostorId);

  io.to("sala_proyeccion").emit("resultadoFinalProyeccion", {
    expulsado: imp.nombre,
    esImpostor: false,
    frase: palabraActual
  });
}

/* =========================
   PUERTO
========================= */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("✅ Servidor final listo en puerto", PORT);
});

