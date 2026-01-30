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

const frasesBiblicas = ["El Arca de Noé", "Los Diez Mandamientos", "El Mar Rojo", "La Zarza Ardiendo", "David y Goliat", "El Jardín del Edén", "El Maná", "La Torre de Babel", "La Túnica de José", "El Pez de Jonás", "Las Murallas de Jericó", "La Estrella de Belén", "La Última Cena", "La Cruz", "La Resurrección"];

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
        const nuevo = { id: socket.id, nombre: datos.nombre, eliminado: false, rol: "" };
        jugadores.push(nuevo);
        socket.emit('vistas', 'JUGADOR');
        io.emit('actualizarLista', jugadores.length);
        io.to('sala_proyeccion').emit('listaInicialProyeccion', jugadores);
    });

    socket.on('iniciarRonda', () => {
        rondaActual = 1; votosRecibidos = {};
        jugadores.forEach(j => { j.eliminado = false; j.rol = "CIUDADANO"; });
        const impIndex = Math.floor(Math.random() * jugadores.length);
        jugadores[impIndex].rol = "IMPOSTOR";
        palabraActual = frasesBiblicas[Math.floor(Math.random() * frasesBiblicas.length)];
        
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
            const turno = { nombre: ordenHablar[indiceTurno].nombre, idSocket: ordenHablar[indiceTurno].id, lista: jugadores };
            io.emit('cambioDeTurno', turno);
            io.to('sala_proyeccion').emit('turnoEnPantalla', ordenHablar[indiceTurno].nombre);
        } else {
            io.emit('faseVotacion', jugadores.filter(j => !j.eliminado));
            io.to('sala_proyeccion').emit('pantallaEstado', 'VOTACION_ABIERTA');
        }
    }

    socket.on('votarJugador', (idVotado) => {
        votosRecibidos[idVotado] = (votosRecibidos[idVotado] || 0) + 1;
        io.to('sala_proyeccion').emit('actualizarVotosProyeccion', votosRecibidos);
        if (Object.values(votosRecibidos).reduce((a,b)=>a+b,0) >= jugadores.filter(j=>!j.eliminado).length) {
            procesarVotacion();
        }
    });

    function procesarVotacion() {
        let max = -1, expId = null;
        Object.keys(votosRecibidos).forEach(id => { if (votosRecibidos[id] > max) { max = votosRecibidos[id]; expId = id; } });
        const exp = jugadores.find(j => j.id === expId);
        if (exp) exp.eliminado = true;
        const esImp = exp && exp.rol === "IMPOSTOR";

        if (esImp) {
            io.emit('resultadoVotacion', { mensaje: "¡CIUDADANOS GANAN!", terminar: true, palabraReal: palabraActual });
            io.to('sala_proyeccion').emit('resultadoFinalProyeccion', { titulo: "¡TE ATRAPAMOS!", sub: `${exp.nombre} ERA EL IMPOSTOR`, palabra: palabraActual, color: "#00e676" });
        } else if (rondaActual >= 2) {
            const impActual = jugadores.find(j => j.rol === "IMPOSTOR");
            io.emit('resultadoVotacion', { mensaje: "¡EL IMPOSTOR GANA!", terminar: true, palabraReal: palabraActual });
            io.to('sala_proyeccion').emit('resultadoFinalProyeccion', { titulo: "¡EL IMPOSTOR GANÓ!", sub: `No lo descubrieron. Era: ${impActual.nombre}`, palabra: palabraActual, color: "#ff4444" });
        } else {
            rondaActual++; votosRecibidos = {};
            io.emit('resultadoVotacion', { mensaje: "Inocente expulsado...", terminar: false });
            io.to('sala_proyeccion').emit('resultadoFinalProyeccion', { titulo: "INOCENTE", sub: `${exp.nombre} no era el impostor`, temporal: true, color: "#ff4444" });
            setTimeout(() => { iniciarDebate(); }, 8000);
        }
    }

    socket.on('disconnect', () => {
        jugadores = jugadores.filter(j => j.id !== socket.id);
        io.emit('actualizarLista', jugadores.length);
    });
});
server.listen(process.env.PORT || 3000);
