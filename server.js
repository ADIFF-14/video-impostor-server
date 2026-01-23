const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let jugadores = [];
let adminSocket = null;
let proyectorSocket = null;

let palabraActual = "";
let impostorId = null;
let votos = {};
let turnoIndex = 0;
let ordenTurnos = [];

const palabras = [
  "Biblia","Oración","Iglesia","Fe","Jesús","Amor","Servicio","Misión",
  "Esperanza","Gracia","Salvación","Alabanza","Ayuno","Disciplina"
];

function mezclar(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

io.on('connection', (socket) => {

  socket.on('unirse', ({ nombre }) => {
    const n = nombre.toLowerCase().trim();

    // PROYECTOR
    if (n === 'proyector') {
      proyectorSocket = socket.id;
      socket.join('proyector');
      socket.emit('vista', 'PROYECTOR');
      socket.emit('actualizarJugadores', jugadores);
      return;
    }

    // ADMIN
    if (n === 'anderson') {
      adminSocket = socket.id;
      socket.join('admin');
      socket.emit('vista', 'ADMIN');
      return;
    }

    // JUGADOR
    jugadores.push({
      id: socket.id,
      nombre,
      eliminado: false
    });

    io.emit('contador', jugadores.length);
    io.to('proyector').emit('actualizarJugadores', jugadores);
    socket.emit('vista', 'JUGADOR');
  });

  // ADMIN inicia partida
  socket.on('iniciarPartida', () => {
    if (socket.id !== adminSocket) return;
    if (jugadores.length < 3) return;

    votos = {};
    jugadores.forEach(j => j.eliminado = false);

    palabraActual = palabras[Math.floor(Math.random() * palabras.length)];
    const imp = jugadores[Math.floor(Math.random() * jugadores.length)];
    impostorId = imp.id;

    jugadores.forEach(j => {
      if (j.id === impostorId) {
        io.to(j.id).emit('rol', { tipo: 'IMPOSTOR' });
      } else {
        io.to(j.id).emit('rol', { tipo: 'CIUDADANO', palabra: palabraActual });
      }
    });

    io.to('admin').emit('secreto', {
      impostor: imp.nombre,
      palabra: palabraActual
    });

    io.to('proyector').emit('estadoPantalla', { estado: 'INICIO' });
  });

  // ADMIN inicia debate
  socket.on('iniciarDebate', () => {
    if (socket.id !== adminSocket) return;

    ordenTurnos = mezclar(jugadores.filter(j => !j.eliminado));
    turnoIndex = 0;

    siguienteTurno();
  });

  socket.on('terminarTurno', () => {
    turnoIndex++;
    siguienteTurno();
  });

  function siguienteTurno() {
    if (turnoIndex < ordenTurnos.length) {
      const j = ordenTurnos[turnoIndex];
      io.emit('turno', { nombre: j.nombre, id: j.id });
      io.to('proyector').emit('turnoPantalla', j.nombre);
    } else {
      io.emit('faseVotacion', jugadores.filter(j => !j.eliminado));
      io.to('proyector').emit('estadoPantalla', { estado: 'VOTACION' });
    }
  }

  socket.on('votar', (idVotado) => {
    if (votos[socket.id]) return; // evita doble voto
    votos[socket.id] = idVotado;

    const conteo = {};
    Object.values(votos).forEach(id => {
      conteo[id] = (conteo[id] || 0) + 1;
    });

    io.to('proyector').emit('votosPantalla', conteo);

    if (Object.keys(votos).length === jugadores.filter(j => !j.eliminado).length) {
      finalizarVotacion(conteo);
    }
  });

  function finalizarVotacion(conteo) {
    let max = 0, expulsadoId = null;
    for (let id in conteo) {
      if (conteo[id] > max) {
        max = conteo[id];
        expulsadoId = id;
      }
    }

    const expulsado = jugadores.find(j => j.id === expulsadoId);
    if (expulsado) expulsado.eliminado = true;

    const esImpostor = expulsadoId === impostorId;

    io.to('proyector').emit('resultadoFinal', {
      nombre: expulsado.nombre,
      esImpostor,
      palabra: palabraActual
    });

    io.emit('fin');
  }

  socket.on('disconnect', () => {
    jugadores = jugadores.filter(j => j.id !== socket.id);
    io.emit('contador', jugadores.length);
    io.to('proyector').emit('actualizarJugadores', jugadores);
  });
});

server.listen(3000, () => console.log("Servidor listo"));

