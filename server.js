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

const palabrasBiblicas = ["El Arca de Noé", "Los Diez Mandamientos", "El Mar Rojo", "La Zarza Ardiendo", "David y Goliat", "El Jardín del Edén", "El Maná", "La Torre de Babel", "La Túnica de José", "El Pez de Jonás", "Las Murallas de Jericó", "La Estrella de Belén", "El Pesebre", "El Bautismo", "La Última Cena", "La Cruz", "La Resurrección"];

io.on('connection', (socket) => {
    socket.on('unirse', (datos) => {
        const nombre = datos.nombre.toLowerCase().trim();
        
        if (nombre === 'proyector') {
            socket.join('sala_proyeccion');
            socket.emit('vistas', 'PROYECTOR');
            // Enviamos la lista actual pero el proyector NO se suma a "jugadores"
            return socket.emit('listaInicialProyeccion', jugadores);
        }
        
        if (nombre === 'anderson') {
            socket.join('sala_admin');
            socket.emit('vistas', 'ADMIN');
        } else {
            socket.emit('vistas', 'JUGADOR');
        }

        // Solo humanos que juegan entran aquí
        jugadores.push({ id: socket.id, nombre: datos.nombre, eliminado: false, rol: "" });
        io.emit('actualizarLista', jugadores.length);
        io.to('sala_proyeccion').emit('listaInicialProyeccion', jugadores);
    });

    socket.on('iniciarRonda', () => {
        rondaActual = 1; votosRecibidos = {};
        jugadores.forEach(j => { j.eliminado = false; j.rol = "CIUDADANO"; });
        const impIndex = Math.floor(Math.random() * jugadores.length);
        jugadores[impIndex].rol = "IMPOSTOR";
        palabraActual = palabrasBiblicas[Math.floor(Math.random() * palabrasBiblicas.length)];
        
        jugadores.forEach(j => {
            io.to(j.id).emit('recibirRol', j.rol === "IMPOSTOR" ? { rol: "IMPOSTOR" } : { rol: "CIUDADANO", palabra: palabraActual });
        });
        io.to('sala_admin').emit('infoSecretaAdmin', { jugadores, palabra: palabraActual });
        io.to('sala_proyeccion').emit('pantallaEstado', 'JUEGO_INICIADO');
    });

    socket.on('empezarDebateOficial', () => iniciarDebate());
    socket.on('finalizarMiTurno', () => { indiceTurno++; notificarTurno(); });
    socket.on('adminForzarTurno', () => { indiceTurno++; notificarTurno(); });

    function iniciarDebate() {
        indiceTurno = 0;
        let vivos = jugadores.filter(j => !j.eliminado);
        ordenHablar = vivos.sort(() => Math.random() - 0.5);
        if (ordenHablar[0] && ordenHablar[0].rol === "IMPOSTOR") ordenHablar.push(ordenHablar.shift());
        notificarTurno();
    }

    function notificarTurno() {
        if (indiceTurno < ordenHablar.length) {
            io.emit('cambioDeTurno', { nombre: ordenHablar[indiceTurno].nombre, idSocket: ordenHablar[indiceTurno].id, lista: jugadores });
            io.to('sala_proyeccion').emit('turnoEnPantalla', { nombre: ordenHablar[indiceTurno].nombre, id: ordenHablar[indiceTurno].id });
        } else {
            io.emit('faseVotacion', jugadores.filter(j => !j.eliminado));
            io.to('sala_proyeccion').emit('pantallaEstado', 'VOTACION_ABIERTA');
        }
    }

    socket.on('votarJugador', (idVotado) => {
        if (!votosRecibidos[idVotado]) votosRecibidos[idVotado] = 0;
        votosRecibidos[idVotado]++;
        io.to('sala_proyeccion').emit('actualizarVotosProyeccion', votosRecibidos);
        
        const totalVotos = Object.values(votosRecibidos).reduce((a, b) => a + b, 0);
        if (totalVotos >= jugadores.filter(j => !j.eliminado).length) procesarVotacion();
    });

    function procesarVotacion() {
        let max = -1, expId = null;
        Object.keys(votosRecibidos).forEach(id => {
            if (votosRecibidos[id] > max) { max = votosRecibidos[id]; expId = id; }
        });
        const expulsado = jugadores.find(j => j.id === expId);
        if (expulsado) expulsado.eliminado = true;
        const fueImpostor = expulsado && expulsado.rol === "IMPOSTOR";
        
        if (fueImpostor) {
            io.emit('resultadoVotacion', { mensaje: "¡CIUDADANOS GANAN!", terminar: true, palabraReal: palabraActual });
            io.to('sala_proyeccion').emit('resultadoFinalProyeccion', { titulo: "¡ATRAPADO!", sub: `${expulsado.nombre} era el Impostor`, palabra: palabraActual, color: "#00e676" });
        } else if (rondaActual >= 2) {
            io.emit('resultadoVotacion', { mensaje: "¡EL IMPOSTOR GANA!", terminar: true, palabraReal: palabraActual });
            io.to('sala_proyeccion').emit('resultadoFinalProyeccion', { titulo: "¡EL IMPOSTOR GANA!", sub: "No lograron descubrirlo", palabra: palabraActual, color: "#ff4444" });
        } else {
            rondaActual++; votosRecibidos = {};
            io.emit('resultadoVotacion', { mensaje: "Era Inocente...", terminar: false });
            io.to('sala_proyeccion').emit('resultadoFinalProyeccion', { titulo: "ERA INOCENTE", sub: `${expulsado?.nombre} expulsado`, temporal: true, color: "#ff4444" });
            setTimeout(() => { iniciarDebate(); }, 8000);
        }
    }

    socket.on('disconnect', () => { 
        jugadores = jugadores.filter(j => j.id !== socket.id); 
        io.emit('actualizarLista', jugadores.length);
        io.to('sala_proyeccion').emit('listaInicialProyeccion', jugadores);
    });
});
server.listen(process.env.PORT || 3000);
