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

const palabras = ["Pizza", "Avión", "WhatsApp", "Netflix", "Fútbol", "Cine", "Playa", "Gato", "Reloj", "Bicicleta", "Hamburguesa", "Internet", "Instagram", "Parque", "Café", "Escuela", "Navidad", "Música", "Helado", "Libro", "Carro", "Perro", "Sol", "Trabajo", "Viaje", "Tacos", "Guitarra", "Hospital", "Cámara", "Luna", "Dinero", "Piscina", "Televisión", "Dormir", "Bailar", "Fruta", "Chocolate", "YouTube", "Teléfono", "Estudiar", "Policía", "Bombero", "Estadio", "Cerveza", "Sushi", "Zapato", "Verano", "Maleta", "Videojuego"];

function mezclar(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

io.on('connection', (socket) => {
    socket.on('unirse', (datos) => {
        const nombreBuscado = datos.nombre.toLowerCase().trim();

        if (nombreBuscado === 'proyector') {
            socket.join('sala_proyeccion');
            socket.emit('vistas', 'PROYECTOR');
            socket.emit('listaInicialProyeccion', jugadores.filter(j => !j.eliminado));
            return;
        }

        if (nombreBuscado === 'anderson') {
            socket.join('sala_admin');
            socket.emit('vistas', 'ADMIN');
            return;
        }

        // Jugadores normales
        jugadores.push({ id: socket.id, nombre: datos.nombre, eliminado: false, rol: "" });
        socket.emit('vistas', 'JUGADOR');
        io.emit('actualizarLista', jugadores.length);
        io.to('sala_proyeccion').emit('listaInicialProyeccion', jugadores);
    });

    socket.on('iniciarRonda', () => {
        if (jugadores.length < 3) return;
        rondaActual = 1;
        votosRecibidos = {};
        jugadores.forEach(j => { j.eliminado = false; j.rol = "CIUDADANO"; });
        const impIndex = Math.floor(Math.random() * jugadores.length);
        jugadores[impIndex].rol = "IMPOSTOR";
        palabraActual = palabras[Math.floor(Math.random() * palabras.length)];
        
        jugadores.forEach((j) => {
            const info = (j.rol === "IMPOSTOR") ? { rol: "IMPOSTOR" } : { rol: "CIUDADANO", palabra: palabraActual };
            io.to(j.id).emit('recibirRol', info);
        });

        io.to('sala_admin').emit('infoSecretaAdmin', { jugadores, palabra: palabraActual });
        io.to('sala_proyeccion').emit('pantallaEstado', 'JUEGO_INICIADO');
        io.to('sala_proyeccion').emit('listaInicialProyeccion', jugadores);
    });

    socket.on('empezarDebateOficial', () => {
        indiceTurno = 0;
        votosRecibidos = {};
        let vivos = jugadores.filter(j => !j.eliminado);
        ordenHablar = mezclar([...vivos]);
        notificarTurno();
    });

    socket.on('finalizarMiTurno', () => {
        indiceTurno++;
        notificarTurno();
    });

    function notificarTurno() {
        if (indiceTurno < ordenHablar.length) {
            const datosTurno = { nombre: ordenHablar[indiceTurno].nombre, idSocket: ordenHablar[indiceTurno].id, lista: jugadores };
            io.emit('cambioDeTurno', datosTurno);
            io.to('sala_proyeccion').emit('turnoEnPantalla', datosTurno.nombre);
        } else {
            io.emit('faseVotacion', jugadores.filter(j => !j.eliminado));
            io.to('sala_proyeccion').emit('pantallaEstado', 'VOTACION_ABIERTA');
        }
    }

    socket.on('votarJugador', (idVotado) => {
        const votante = jugadores.find(j => j.id === socket.id);
        if (!votante) return;
        if (!votosRecibidos[idVotado]) votosRecibidos[idVotado] = [];
        votosRecibidos[idVotado].push(votante.nombre);

        const conteoVotos = {};
        Object.keys(votosRecibidos).forEach(id => { conteoVotos[id] = votosRecibidos[id].length; });
        io.to('sala_proyeccion').emit('actualizarVotosProyeccion', conteoVotos);

        if (Object.values(votosRecibidos).flat().length >= jugadores.filter(j => !j.eliminado).length) {
            procesarVotacion();
        }
    });

    function procesarVotacion() {
        let resumen = "";
        Object.keys(votosRecibidos).forEach(id => {
            const obj = jugadores.find(j => j.id === id);
            resumen += `${obj.nombre} (${votosRecibidos[id].length}): ${votosRecibidos[id].join(", ")}\n`;
        });

        let max = 0, expId = null;
        Object.keys(votosRecibidos).forEach(id => {
            if (votosRecibidos[id].length > max) { max = votosRecibidos[id].length; expId = id; }
        });

        const expulsado = jugadores.find(j => j.id === expId);
        if(!expulsado) return;
        expulsado.eliminado = true;

        const esImp = expulsado.rol === "IMPOSTOR";
        const data = { expulsado: expulsado.nombre, esImpostor: esImp, detalle: resumen, palabraReal: palabraActual };

        if (esImp || rondaActual >= 3) {
            io.emit('resultadoVotacion', { mensaje: resumen, terminar: true, palabraReal: palabraActual });
            io.to('sala_proyeccion').emit('resultadoFinalProyeccion', data);
        } else {
            rondaActual++;
            io.emit('resultadoVotacion', { mensaje: resumen, terminar: false });
            io.to('sala_proyeccion').emit('resultadoFinalProyeccion', data);
        }
        votosRecibidos = {};
    }

    socket.on('disconnect', () => {
        jugadores = jugadores.filter(j => j.id !== socket.id);
        io.emit('actualizarLista', jugadores.length);
    });
});

server.listen(process.env.PORT || 3000);
