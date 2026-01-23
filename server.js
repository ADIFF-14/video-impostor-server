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

const palabras = ["Pizza", "Avión", "WhatsApp", "Netflix", "Fútbol", "Cine", "Playa", "Gato", "Reloj", "Bicicleta", "Instagram", "Parque", "Café", "Escuela", "Navidad", "Música", "Helado", "Libro", "Carro", "Perro", "Viaje", "Tacos", "Guitarra", "Hospital", "Cámara", "Luna", "Dinero", "Piscina", "Televisión", "Videojuego"];

function mezclar(array) {
    return array.sort(() => Math.random() - 0.5);
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
        jugadores.push({ id: socket.id, nombre: datos.nombre, eliminado: false, rol: "" });
        socket.emit('vistas', 'JUGADOR');
        io.emit('actualizarLista', jugadores.length);
        io.to('sala_proyeccion').emit('listaInicialProyeccion', jugadores);
    });

    socket.on('iniciarRonda', () => {
        rondaActual = 1; votosRecibidos = {};
        jugadores.forEach(j => { j.eliminado = false; j.rol = "CIUDADANO"; });
        const impIndex = Math.floor(Math.random() * jugadores.length);
        jugadores[impIndex].rol = "IMPOSTOR";
        palabraActual = palabras[Math.floor(Math.random() * palabras.length)];
        
        jugadores.forEach(j => {
            io.to(j.id).emit('recibirRol', j.rol === "IMPOSTOR" ? { rol: "IMPOSTOR" } : { rol: "CIUDADANO", palabra: palabraActual });
        });
        io.to('sala_admin').emit('infoSecretaAdmin', { jugadores, palabra: palabraActual });
        io.to('sala_proyeccion').emit('pantallaEstado', 'JUEGO_INICIADO');
        io.to('sala_proyeccion').emit('listaInicialProyeccion', jugadores);
    });

    socket.on('empezarDebateOficial', () => iniciarDebate());
    socket.on('finalizarMiTurno', () => { indiceTurno++; notificarTurno(); });
    socket.on('adminForzarTurno', () => { indiceTurno++; notificarTurno(); });

    function iniciarDebate() {
        indiceTurno = 0;
        let vivos = jugadores.filter(j => !j.eliminado);
        ordenHablar = mezclar([...vivos]);
        if (ordenHablar[0].rol === "IMPOSTOR") ordenHablar.push(ordenHablar.shift());
        notificarTurno();
    }

    function notificarTurno() {
        if (indiceTurno < ordenHablar.length) {
            io.emit('cambioDeTurno', { nombre: ordenHablar[indiceTurno].nombre, idSocket: ordenHablar[indiceTurno].id, lista: jugadores });
        } else {
            io.emit('faseVotacion', jugadores.filter(j => !j.eliminado));
            io.to('sala_proyeccion').emit('pantallaEstado', 'VOTACION_ABIERTA');
            io.to('sala_proyeccion').emit('listaInicialProyeccion', jugadores);
        }
    }

    socket.on('votarJugador', (idVotado) => {
        if (!votosRecibidos[idVotado]) votosRecibidos[idVotado] = [];
        votosRecibidos[idVotado].push(socket.id);
        if (Object.values(votosRecibidos).flat().length >= jugadores.filter(j => !j.eliminado).length) procesarVotacion();
    });

    function procesarVotacion() {
        let max = 0, expId = null;
        Object.keys(votosRecibidos).forEach(id => {
            if (votosRecibidos[id].length > max) { max = votosRecibidos[id].length; expId = id; }
        });
        const expulsado = jugadores.find(j => j.id === expId);
        if (expulsado) expulsado.eliminado = true;
        const fueImpostor = expulsado && expulsado.rol === "IMPOSTOR";
        
        if (fueImpostor) {
            io.emit('resultadoVotacion', { mensaje: "¡CIUDADANOS GANAN!", terminar: true, palabraReal: palabraActual });
            io.to('sala_proyeccion').emit('resultadoFinalProyeccion', { titulo: "¡ATRAPADO!", sub: `${expulsado.nombre} era el Impostor`, palabra: palabraActual });
        } else if (rondaActual >= 2) {
            io.emit('resultadoVotacion', { mensaje: "¡EL IMPOSTOR GANA!", terminar: true, palabraReal: palabraActual });
            io.to('sala_proyeccion').emit('resultadoFinalProyeccion', { titulo: "¡EL IMPOSTOR GANA!", sub: "No lograron descubrirlo", palabra: palabraActual });
        } else {
            rondaActual++; votosRecibidos = {};
            io.emit('resultadoVotacion', { mensaje: "Era Inocente...", terminar: false });
            io.to('sala_proyeccion').emit('resultadoFinalProyeccion', { titulo: "ERA INOCENTE", sub: `${expulsado?.nombre} expulsado`, temporal: true });
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
