const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let jugadores = [];
let votosRecibidos = {}; 
let palabraActual = "";
let rondaActual = 1;

// Lista de frases bíblicas cortas
const palabrasBiblicas = ["El Arca de Noé", "Los Diez Mandamientos", "El Mar Rojo", "La Zarza Ardiendo", "David y Goliat", "El Jardín del Edén", "El Maná", "La Torre de Babel", "La Túnica de José", "El Pez de Jonás"];

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
        
        const nuevoJugador = { id: socket.id, nombre: datos.nombre, eliminado: false, rol: "" };
        jugadores.push(nuevoJugador);
        socket.emit('vistas', 'JUGADOR');
        io.emit('actualizarLista', jugadores.length);
        // Notificar al proyector para que dibuje los cuadros iniciales
        io.to('sala_proyeccion').emit('listaInicialProyeccion', jugadores);
    });

    socket.on('iniciarRonda', () => {
        rondaActual = 1;
        votosRecibidos = {};
        jugadores.forEach(j => { j.eliminado = false; j.rol = "CIUDADANO"; });
        
        const impIndex = Math.floor(Math.random() * jugadores.length);
        jugadores[impIndex].rol = "IMPOSTOR";
        palabraActual = palabrasBiblicas[Math.floor(Math.random() * palabrasBiblicas.length)];
        
        jugadores.forEach(j => {
            const info = (j.rol === "IMPOSTOR") ? { rol: "IMPOSTOR" } : { rol: "CIUDADANO", palabra: palabraActual };
            io.to(j.id).emit('recibirRol', info);
        });

        io.to('sala_admin').emit('infoSecretaAdmin', { jugadores, palabra: palabraActual });
        io.to('sala_proyeccion').emit('pantallaEstado', 'JUEGO_INICIADO');
    });

    socket.on('votarJugador', (idVotado) => {
        if (!votosRecibidos[idVotado]) votosRecibidos[idVotado] = 0;
        votosRecibidos[idVotado]++;
        
        // Enviar actualización de votos solo al proyector en tiempo real
        io.to('sala_proyeccion').emit('actualizarVotosProyeccion', votosRecibidos);

        const totalVotos = Object.values(votosRecibidos).reduce((a, b) => a + b, 0);
        if (totalVotos >= jugadores.filter(j => !j.eliminado).length) {
            // Lógica de fin de votación...
        }
    });

    socket.on('disconnect', () => {
        jugadores = jugadores.filter(j => j.id !== socket.id);
        io.emit('actualizarLista', jugadores.length);
    });
});

server.listen(process.env.PORT || 3000);
