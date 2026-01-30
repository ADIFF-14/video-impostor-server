const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// SERVIR FRONTEND (CRÍTICO)
app.use(express.static("public"));

/* =========================
   ESTADO DEL JUEGO
========================= */
let jugadores = [];
let palabraActual = null;
let impostorId = null;

/* =========================
   FRASES BÍBLICAS (TUS FRASES)
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

    // PROYECTOR
    if (limpio === "proyector") {
      socket.join("sala_proyeccion");
      socket.emit("vistas", "PROYECTOR");
      socket.emit("listaInicialProyeccion", jugadores);
      return;
    }

    // ADMIN
    if (limpio === "anderson") {
      socket.join("sala_admin");
      socket.emit("vistas", "ADMIN");
      return;
    }

    // JUGADOR NORMAL
    const jugador = {
      id: socket.id,
      nombre,
      eliminado: false,
      rol: ""
    };

    jugadores.push(jugador);

    socket.emit("vistas", "JUGADOR");
    io.emit("actualizarLista", jugadores.length);
    io.to("sala_proyeccion").emit("listaInicialProyeccion", jugadores);

    console.log("👤 Entró:", nombre);
  });

  /* ----------- INICIAR PARTIDA ----------- */
  socket.on("iniciarRonda", () => {
    if (jugadores.length < 3) return;

    // Reset
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

    console.log("🎮 Partida iniciada | Frase:", palabraActual);
  });

  /* ----------- SALIR ----------- */
  socket.on("disconnect", () => {
    jugadores = jugadores.filter(j => j.id !== socket.id);
    io.emit("actualizarLista", jugadores.length);
    io.to("sala_proyeccion").emit("listaInicialProyeccion", jugadores);
    console.log("🔴 Desconectado:", socket.id);
  });
});

/* =========================
   PUERTO
========================= */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("✅ Servidor completo en puerto", PORT);
});

