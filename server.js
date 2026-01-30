const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let jugadores = [];
let ordenHablar = [];
let indiceTurno = 0;
let palabraActual = "";
let votosRecibidos = {};
let rondaActual = 1;

/* =========================
   BANCO DE FRASES BÍBLICAS
   (ÚNICO CAMBIO)
========================= */
const palabras = [
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

function mezclar(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

io.on('connection', (socket) => {

  socket.on('unirse', (datos) => {
    const nombre = datos.nombre.toLowerCase().trim();

    if (nombre === 'proyector') {
      socket.join('sala_proyeccion');
      return socket.emit('vistas', 'PROYECTOR');
    }

    if (nombre === 'anderson') {
      socket.join('sala_admin');
      return socket.emit('vistas', 'ADMIN');
    }

    jugadores.push({
      id: socket.id,
      nombre: datos.nombre,
      eliminado: false,
      rol: ""
    });

    socket.emit('vistas', 'JUGADOR');
    io.emit('actualizarLista', jugadores.length);
    io.to('sala_proyeccion').emit('listaInicialProyeccion', jugadores);
  });

  socket.on('iniciarRonda', () => {
    if (jugadores.length < 3) return;

    rondaActual = 1;
    votosRecibidos = {};
    indiceTurno = 0;

    jugadores.forEach(j => {
      j.eliminado = false;
      j.rol = "CIUDADANO";
    });

    const impIndex = Math.floor(Math.random() * jugadores.length);
    jugadores[impIndex].rol = "IMPOSTOR";

    palabraActual = palabras[Math.floor(Math.random() * palabras.length)];

    jugadores.forEach(j => {
      if (j.rol === "IMPOSTOR") {
        io.to(j.id).emit('recibirRol', { rol: "IMPOSTOR" });
      } else {
        io.to(j.id).emit('recibirRol', {
          rol: "CIUDADANO",
          palabra: palabraActual
        });
      }
    });

    io.to('sala_admin').emit('infoSecretaAdmin', {
      jugadores,
      palabra: palabraActual
    });

    io.to('sala_proyeccion').emit('pantallaEstado', 'JUEGO_INICIADO');
  });

  socket.on('empezarDebateOficial', () => {
    indiceTurno = 0;
    const vivos = jugadores.filter(j => !j.eliminado);
    ordenHablar = mezclar([...vivos]);
    notificarTurno();
  });

  socket.on('finalizarMiTurno', () => {
    indiceTurno++;
    notificarTurno();
  });

  function notificarTurno() {
    if (indiceTurno < ordenHablar.length) {
      const actual = ordenHablar[indiceTurno];
      io.emit('cambioDeTurno', {
        nombre: actual.nombre,
        idSocket: actual.id
      });
      io.to('sala_proyeccion').emit('turnoEnPantalla', actual.nombre);
    } else {
      io.emit('faseVotacion', jugadores.filter(j => !j.eliminado));
      io.to('sala_proyeccion').emit('pantallaEstado', 'VOTACION_ABIERTA');
    }
  }

  socket.on('votarJugador', (idVotado) => {
    if (!votosRecibidos[idVotado]) votosRecibidos[idVotado] = [];
    votosRecibidos[idVotado].push(socket.id);

    const totalVotos = Object.values(votosRecibidos).flat().length;
    const vivos = jugadores.filter(j => !j.eliminado).length;

    io.to('sala_proyeccion').emit(
      'actualizarVotosProyeccion',
      Object.fromEntries(
        Object.entries(votosRecibidos).map(([k,v]) => [k, v.length])
      )
    );

    if (totalVotos >= vivos) {
      procesarVotacion();
    }
  });

  function procesarVotacion() {
    let expId = null;
    let max = 0;

    for (const id in votosRecibidos) {
      if (votosRecibidos[id].length > max) {
        max = votosRecibidos[id].length;
        expId = id;
      }
    }

    const expulsado = jugadores.find(j => j.id === expId);
    if (expulsado) expulsado.eliminado = true;

    const eraImpostor = expulsado && expulsado.rol === "IMPOSTOR";

    io.to('sala_proyeccion').emit('resultadoFinalProyeccion', {
      expulsado: expulsado?.nombre,
      esImpostor: eraImpostor
    });

    if (eraImpostor) {
      io.emit('resultadoVotacion', {
        mensaje: "🎉 Atraparon al impostor",
        palabraReal: palabraActual
      });
      return;
    }

    if (rondaActual === 1) {
      rondaActual = 2;
      votosRecibidos = {};

      setTimeout(() => {
        indiceTurno = 0;
        const vivos = jugadores.filter(j => !j.eliminado);
        ordenHablar = mezclar([...vivos]);
        notificarTurno();
      }, 8000);

      return;
    }

    io.emit('resultadoVotacion', {
      mensaje: "😈 El impostor ganó",
      palabraReal: palabraActual
    });
  }

  socket.on('disconnect', () => {
    jugadores = jugadores.filter(j => j.id !== socket.id);
    io.emit('actualizarLista', jugadores.length);
  });
});

server.listen(process.env.PORT || 3000);

